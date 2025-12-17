import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get user's development plans
export const getUserDevelopmentPlans = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    const targetUserId = args.userId || currentUser._id;

    // Users can view their own plans, admins and committee can view all
    if (currentUser._id !== targetUserId && 
        currentUser.role !== "admin" && 
        currentUser.role !== "committee") {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("developmentPlans")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();
  },
});

// Create development plan
export const createDevelopmentPlan = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    activities: v.array(
      v.object({
        title: v.string(),
        done: v.optional(v.boolean()),
      }),
    ),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    // Users can create their own plans; admins/committee can create for all
    if (
      currentUser._id !== args.userId &&
      currentUser.role !== "admin" &&
      currentUser.role !== "committee"
    ) {
      throw new Error("Unauthorized");
    }

    const normalizedActivities = args.activities.map((a) => ({
      title: a.title,
      completed: a.done ?? false,
    }));

    return await ctx.db.insert("developmentPlans", {
      userId: args.userId,
      title: args.title,
      description: args.description,
      status: (args.status ?? "active") as "active" | "completed" | "paused" | "selected",
      activities: normalizedActivities,
      progress: 0,
    });
  },
});

// Update activity progress
export const updateActivityProgress = mutation({
  args: {
    planId: v.id("developmentPlans"),
    activityIndex: v.number(),
    done: v.boolean(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Development plan not found");
    }

    // Users can update their own plans; admins/committee can update all
    if (
      currentUser._id !== plan.userId &&
      currentUser.role !== "admin" &&
      currentUser.role !== "committee"
    ) {
      throw new Error("Unauthorized");
    }

    const activities = (plan.activities ?? []).slice();
    if (args.activityIndex < 0 || args.activityIndex >= activities.length) {
      throw new Error("Invalid activityIndex");
    }

    activities[args.activityIndex] = {
      ...activities[args.activityIndex],
      completed: args.done,
    };

    await ctx.db.patch(args.planId, { activities });
    return { success: true };
  },
});

// Create a plan from a learning item
export const createFromLearning = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    href: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Try to resolve user by identity.email
    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email ?? ""))
      .unique()
      .catch(() => null);

    // Auto-provision a minimal user doc if identity exists but no user doc yet
    if (!user) {
      const newUserId = await ctx.db.insert("users", {
        email: identity.email ?? "",
        name: identity.name ?? "",
        image: identity.pictureUrl ?? undefined,
        role: "employee",
        isAnonymous: false,
      } as any);
      user = await ctx.db.get(newUserId);
    }

    if (!user) throw new Error("Unauthorized");

    // basic idempotence: avoid duplicate plans for same href+title (regardless of status)
    const existing = await ctx.db
      .query("developmentPlans")
      .withIndex("by_user", (q) => q.eq("userId", user._id as Id<"users">))
      .collect();

    const dup = existing.find(
      (p) =>
        p.sourceType === "learning" &&
        p.sourceRef === args.href &&
        p.title === args.title
    );
    if (dup) return dup._id;

    const planId = await ctx.db.insert("developmentPlans", {
      userId: user._id as Id<"users">,
      title: args.title,
      description: args.description,
      sourceType: "learning",
      sourceRef: args.href,
      // Change status to "active" so it shows up in Active Plans immediately
      status: "active",
      progress: 0,
      activities: [
        { title: "Open and review the document", completed: false },
        { title: "Note 3 key takeaways", completed: false },
        { title: "Propose one practice task", completed: false },
      ],
    });
    return planId;
  },
});

// Delete a development plan
export const deletePlan = mutation({
  args: {
    planId: v.id("developmentPlans"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email ?? ""))
      .unique()
      .catch(() => null);

    if (!user || plan.userId !== user._id) {
      throw new Error("Unauthorized - you can only delete your own plans");
    }

    await ctx.db.delete(args.planId);
    return { success: true };
  },
});

// List current user's plans (simple, non-paginated)
export const listMine = query({
  args: { _refreshKey: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email))
      .unique()
      .catch(() => null);

    // Return empty array for new users who don't have a user document yet
    if (!user) return [];

    const plans = await ctx.db
      .query("developmentPlans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return plans;
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