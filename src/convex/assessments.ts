import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email ?? ""))
      .first();
    if (!user) return null;

    const assessment = await ctx.db
      .query("employeeAssessments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    return assessment;
  },
});

export const upsertMine = mutation({
  args: {
    performance: v.number(),
    experienceYears: v.number(),
    adcScore: v.number(),
    competencies: v.any(), // Record<string, number>
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email ?? ""))
      .first();
    if (!user) throw new Error("User not found");

    // Clamp values
    const performance = Math.max(0, Math.min(5, args.performance));
    const adcScore = Math.max(0, Math.min(100, args.adcScore));
    const experienceYears = Math.max(0, args.experienceYears);

    const existing = await ctx.db
      .query("employeeAssessments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        performance,
        experienceYears,
        adcScore,
        competencies: args.competencies,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("employeeAssessments", {
        userId: user._id,
        performance,
        experienceYears,
        adcScore,
        competencies: args.competencies,
      });
    }
  },
});
