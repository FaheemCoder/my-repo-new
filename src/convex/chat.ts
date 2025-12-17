import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
/* removed api import to avoid circular type issues */

// Get or create a chat session
export const getOrCreateSession = mutation({
  args: {
    sessionKey: v.string(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("chatSessions")
      .withIndex("by_session_key", (q) => q.eq("sessionKey", args.sessionKey))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { lastActiveAt: Date.now() });
      return existing._id;
    }

    const newSessionId = await ctx.db.insert("chatSessions", {
      userId: user?._id ?? undefined,
      sessionKey: args.sessionKey,
      startedAt: Date.now(),
      lastActiveAt: Date.now(),
      source: args.source || "unknown",
    });

    // Seed a welcome assistant message for first-time session
    await ctx.db.insert("chatMessages", {
      sessionId: newSessionId,
      userId: user?._id ?? undefined,
      role: "assistant",
      content:
        "Welcome to LokYodha! How can I help with succession planning or your development journey today?",
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    // Log open event
    await ctx.db.insert("chatEvents", {
      sessionId: newSessionId,
      userId: user?._id ?? undefined,
      type: "opened",
      meta: undefined,
      createdAt: Date.now(),
    });

    return newSessionId;
  },
});

// NEW: exact intent matcher (runs before keyword scoring)
function routeExactIntent(t: string): string | null {
  const text = t.trim().toLowerCase();

  // name queries
  if (/(what('?| i)s|tell me) (your )?name/.test(text) || /^who are you\??$/.test(text)) {
    return "My name is LokYodha Assistant.";
  }

  // details/about capability
  if (/(details|about|what do you do|help)/.test(text)) {
    return "I help with succession planning: creating an Individual Development Plan (IDP), browsing tailored learning, and understanding your analytics. Ask me to 'create my IDP', 'browse learning', or 'explain analytics'.";
  }

  // IDP guidance
  if (/(create|make|build).*(idp|individual development plan)|^create my idp$/.test(text)) {
    return "To create your IDP: 1) Open Dashboard → AI Gap Analysis, 2) answer the 4 quick questions, 3) review the generated recommendations, 4) convert them into your plan activities. Want a quick starter template?";
  }

  // browse learning
  if (/(browse|show|find).*(learning|courses)|^learning$|^browse learning$/.test(text)) {
    return "You can start with Leadership Fundamentals and Strategic Thinking Workshop. Prefer filtering by skill (e.g., Communication, Strategic Thinking) or by difficulty (beginner/intermediate/advanced)?";
  }

  // simple greetings
  if (/^(hi|hii|hello|hey)\b/.test(text)) {
    return "Hi! I can help you create an IDP, browse learning, or review analytics. What would you like to do?";
  }

  return null;
}

// Enhance: utility to score intents by weighted keyword matches
function scoreIntent(text: string, keywords: Array<[string, number]>) {
  let score = 0;
  for (const [kw, weight] of keywords) {
    if (text.includes(kw)) score += weight;
  }
  return score;
}

// Send a message (stores user msg and a simple bot reply)
export const sendMessage = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // store user message
    await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      userId: user?._id ?? undefined,
      role: "user",
      content: args.content,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    await ctx.db.insert("chatEvents", {
      sessionId: args.sessionId,
      userId: user?._id ?? undefined,
      type: "message_sent",
      meta: undefined,
      createdAt: Date.now(),
    });

    const t = args.content.toLowerCase().trim();

    // Detect wrap-up messages to trigger a soft reset on the client
    const isWrapUp =
      /(^|\s)(thanks|thank you|done|that's all|thats all|bye|goodbye|ok$|okay$)(\s|!|\.|$)/i.test(
        args.content,
      );

    // 1) Exact intent routing first
    let baseReply = routeExactIntent(t);

    // 2) If no exact match, use scored intents with focused replies
    if (!baseReply) {
      const bank: Array<{
        name: string;
        score: number;
        reply: (q: string) => string;
      }> = [
        {
          name: "idp",
          score: scoreIntent(t, [
            ["idp", 3],
            ["plan", 2],
            ["development", 2],
            ["goal", 1],
            ["activities", 1],
          ]),
          reply: () =>
            "Let's build your plan: 1) pick a target role, 2) choose 2–3 activities (training, mentorship, project), 3) set deadlines. Want a quick template with examples?",
        },
        {
          name: "learning",
          score: scoreIntent(t, [
            ["learn", 3],
            ["course", 2],
            ["training", 2],
            ["content", 2],
            ["module", 1],
            ["skill", 1],
          ]),
          reply: () =>
            "Based on skill growth, start with Leadership Fundamentals and Strategic Thinking Workshop. Prefer content by skill area like Communication or Strategic Thinking?",
        },
        {
          name: "mentorship",
          score: scoreIntent(t, [
            ["mentor", 3],
            ["mentorship", 3],
            ["coach", 1],
            ["guidance", 1],
          ]),
          reply: () =>
            "Good mentorship = one clear goal, biweekly check-ins, and short action items. Which area do you want coaching in first?",
        },
        {
          name: "analytics",
          score: scoreIntent(t, [
            ["analytics", 3],
            ["insight", 2],
            ["dashboard", 2],
            ["progress", 2],
            ["metric", 1],
          ]),
          reply: () =>
            "Your dashboard highlights Active Plans, Completed Learning, and Progress. Want a tip to increase your progress this week?",
        },
        {
          name: "projects",
          score: scoreIntent(t, [
            ["project", 3],
            ["apply", 2],
            ["opportunity", 2],
            ["stretch", 2],
          ]),
          reply: () =>
            "Choose one impact project aligned to your target role with a measurable outcome. Need help picking a suitable project?",
        },
      ];
      const best = bank.sort((a, b) => b.score - a.score)[0];
      baseReply =
        best && best.score > 0
          ? best.reply(args.content)
          : "I can help you with: 1) creating your IDP, 2) tailored learning, or 3) reading your analytics. Which would you like to do?";
    }

    // Avoid repeating the exact same assistant text consecutively
    const lastAssistant = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(5);

    const lastAssistantText =
      lastAssistant.find((m) => m.role === "assistant")?.content ?? null;

    if (lastAssistantText && lastAssistantText.trim() === baseReply.trim()) {
      baseReply =
        /name|who are you/.test(t)
          ? "I'm LokYodha Assistant."
          : /browse|learning|course/.test(t)
          ? "Try Leadership Fundamentals and Strategic Thinking Workshop. Should I queue them for you?"
          : /idp|plan|development/.test(t)
          ? "I can generate a starter IDP with 3 activities and timelines. Want me to draft it?"
          : "Plan, Learning, or Analytics—what would you like to focus on?";
    }

    const suffixes: Array<string> = [
      "Tip: Keep goals small enough to finish within 2 weeks.",
      "Tip: Pair one course with a tiny practice task to lock learning.",
      "Tip: A single weekly progress update keeps momentum high.",
    ];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    const payload = isWrapUp
      ? `${baseReply}\n\n(${suffix})`
      : `${baseReply}\n\n${suffix}`;

    await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      userId: user?._id ?? undefined,
      role: "assistant",
      content: payload,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    if (isWrapUp) {
      await ctx.db.insert("chatEvents", {
        sessionId: args.sessionId,
        userId: user?._id ?? undefined,
        type: "wrap_up",
        meta: undefined,
        createdAt: Date.now(),
      });
    }

    return { ok: true, reset: isWrapUp };
  },
});

// Load messages for a session
export const listMessages = query({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const msgs = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
    return msgs;
  },
});

async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", identity.email ?? ""))
    .unique()
    .catch(() => null);
  return user;
}