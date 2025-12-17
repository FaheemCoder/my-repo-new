import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
/* removed api import to avoid circular type issues */

// Get dashboard analytics
export const getDashboardAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    // Return empty state for unauthenticated or new users
    if (!currentUser || !currentUser._id) {
      return {
        personal: {
          activePlans: 0,
          completedLearning: 0,
          achievements: 0,
          avgProgress: 0,
        },
        organizational: null,
      };
    }

    // Get user-specific analytics - only for users with actual database records
    const userPlans = await ctx.db
      .query("developmentPlans")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    const userProgress = await ctx.db.query("learningProgress")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    const userAchievements = await ctx.db.query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    const activePlans = userPlans.filter(plan => plan.status === "active");
    const completedLearning = userProgress.filter(progress => progress.completed === true);
    const avgProgress =
      activePlans.length > 0
        ? Math.round(
            activePlans.reduce((sum, plan) => {
              const total = plan.activities?.length ?? 0;
              if (total === 0) return sum;
              const done = plan.activities?.filter((a: any) => a.completed).length ?? 0;
              const pct = Math.round((done / total) * 100);
              return sum + pct;
            }, 0) / activePlans.length,
          )
        : 0;

    // If admin or committee, get organizational analytics
    let organizationalData = null;
    if (currentUser.role === "admin" || currentUser.role === "committee") {
      const allEmployees = await ctx.db.query("users")
        .filter((q) => q.neq(q.field("isAnonymous"), true))
        .collect();

      const allPlans = await ctx.db.query("developmentPlans").collect();
      const allProgress = await ctx.db.query("learningProgress").collect();

      const highPotential = allEmployees.filter(emp => emp.potential === "high" || (typeof emp.potential === "string" && emp.potential === "high")).length;
      const readyNow = allEmployees.filter(emp => (emp.readinessScore || 0) >= 80).length;
      const inDevelopment = allPlans.filter(plan => plan.status === "active").length;

      organizationalData = {
        totalEmployees: allEmployees.length,
        highPotential,
        readyNow,
        inDevelopment,
        successionHealth: Math.round((readyNow / Math.max(allEmployees.length, 1)) * 100),
      };
    }

    return {
      personal: {
        activePlans: activePlans.length,
        completedLearning: completedLearning.length,
        achievements: userAchievements.length,
        avgProgress: Math.round(avgProgress),
      },
      organizational: organizationalData,
    };
  },
});

// Get succession pipeline health
export const getSuccessionPipelineHealth = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "committee")) {
      throw new Error("Unauthorized");
    }

    const employees = await ctx.db.query("users")
      .filter((q) => q.neq(q.field("isAnonymous"), true))
      .collect();

    const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];
    
    const pipelineData = departments.map(dept => {
      const deptEmployees = employees.filter(emp => emp.department === dept);
      const highPotential = deptEmployees.filter(emp => emp.potential === "high" || (typeof emp.potential === "string" && emp.potential === "high")).length;
      const readyNow = deptEmployees.filter(emp => (emp.readinessScore || 0) >= 80).length;
      
      return {
        department: dept,
        total: deptEmployees.length,
        highPotential,
        readyNow,
        healthScore: Math.round((readyNow / Math.max(deptEmployees.length, 1)) * 100),
      };
    });

    return pipelineData;
  },
});

// Start a simple gap analysis session (stores start event)
export const startGapAnalysisSession = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const id = await ctx.db.insert("gapAnalysis", {
      userId: user._id,
      targetRole: "unspecified",
      gaps: [],
      overallScore: 0,
      analysisDate: Date.now(),
    } as any);
    return id;
  },
});

// Submit answers and compute a lightweight analysis
export const submitGapAnalysisAnswers = mutation({
  args: {
    sessionId: v.id("gapAnalysis"),
    answers: v.object({
      targetRole: v.string(),
      topStrength: v.string(),
      growthArea: v.string(),
      timeline: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const months = parseInt(args.answers.timeline || "6", 10);
    // Type the severity to match schema union to satisfy TS
    const severity: "critical" | "important" | "nice_to_have" =
      months <= 3 ? "critical" : months <= 6 ? "important" : "nice_to_have";

    const gaps = [
      {
        competency: args.answers.growthArea || "Focus Area",
        currentLevel: 2,
        requiredLevel: 4,
        gap: 2,
        severity,
        recommendations: [
          `Enroll in "${args.answers.growthArea} Fundamentals" within 2 weeks.`,
          "Pair with a mentor for biweekly check-ins.",
          "Apply for a stretch project aligned to your target role.",
        ],
      },
    ];

    const scoreBase = 70;
    const penalty = severity === "critical" ? 25 : severity === "important" ? 15 : 5;
    const overallScore = Math.max(0, scoreBase - penalty);

    await ctx.db.patch(args.sessionId, {
      targetRole: args.answers.targetRole || "unspecified",
      gaps,
      overallScore,
      analysisDate: Date.now(),
    });

    return {
      summary: `For the target role "${args.answers.targetRole}", focus on ${args.answers.growthArea}. Your top strength "${args.answers.topStrength}" will accelerate progress. Estimated timeline: ${months} months.`,
      recommendations: [
        `Complete two learning items on ${args.answers.growthArea} within the next month.`,
        "Set up a mentorship with clear biweekly goals.",
        "Select one impact project and define measurable outcomes.",
      ],
    };
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