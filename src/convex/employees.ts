import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
/* removed api import to avoid circular type issues */

// Get all employees for succession planning
export const getAllEmployees = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "committee")) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.query("users")
      .filter((q) => q.neq(q.field("isAnonymous"), true))
      .collect();
  },
});

// Get employee profile
export const getEmployeeProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    // Users can view their own profile, admins and committee can view all
    if (currentUser._id !== args.userId && 
        currentUser.role !== "admin" && 
        currentUser.role !== "committee") {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(args.userId);
    const profile = await ctx.db.query("employeeProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    return { user, profile };
  },
});

// Update employee performance and potential
export const updatePerformancePotential = mutation({
  args: {
    userId: v.id("users"),
    performance: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    potential: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "committee")) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.userId, {
      performance: args.performance === "high" ? 5 : args.performance === "medium" ? 3 : args.performance === "low" ? 1 : args.performance,
      potential: typeof args.potential === "string" ? args.potential : args.potential === 5 ? "high" : args.potential === 3 ? "medium" : "low",
    });

    return { success: true };
  },
});

// Get 9-box matrix data
export const getNineBoxMatrix = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "committee")) {
      throw new Error("Unauthorized");
    }

    const employees = await ctx.db.query("users")
      .filter((q) => q.and(
        q.neq(q.field("isAnonymous"), true),
        q.neq(q.field("performance"), undefined),
        q.neq(q.field("potential"), undefined)
      ))
      .collect();

    return employees.map(emp => ({
      id: emp._id,
      name: emp.name || "Unknown",
      position: emp.position || "Unknown",
      department: emp.department || "Unknown",
      performance: emp.performance,
      potential: emp.potential,
      readinessScore: emp.readinessScore || 0,
    }));
  },
});

// Create or update employee profile
export const upsertEmployeeProfile = mutation({
  args: {
    userId: v.id("users"),
    currentRole: v.string(),
    targetRoles: v.array(v.string()),
    competencies: v.array(v.object({
      name: v.string(),
      currentLevel: v.number(),
      targetLevel: v.number(),
      importance: v.string(),
    })),
    careerAspirations: v.optional(v.string()),
    strengths: v.array(v.string()),
    developmentAreas: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    // Users can update their own profile, admins and committee can update all
    if (currentUser._id !== args.userId && 
        currentUser.role !== "admin" && 
        currentUser.role !== "committee") {
      throw new Error("Unauthorized");
    }

    const existingProfile = await ctx.db.query("employeeProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        currentRole: args.currentRole,
        targetRoles: args.targetRoles,
        competencies: args.competencies,
        careerAspirations: args.careerAspirations ? [args.careerAspirations] : undefined,
        strengths: args.strengths,
        developmentAreas: args.developmentAreas,
        lastAssessmentDate: Date.now(),
      });
      return existingProfile._id;
    } else {
      return await ctx.db.insert("employeeProfiles", {
        userId: args.userId,
        currentRole: args.currentRole,
        targetRoles: args.targetRoles,
        competencies: args.competencies,
        careerAspirations: args.careerAspirations ? [args.careerAspirations] : [],
        strengths: args.strengths,
        developmentAreas: args.developmentAreas,
        lastAssessmentDate: Date.now(),
      });
    }
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