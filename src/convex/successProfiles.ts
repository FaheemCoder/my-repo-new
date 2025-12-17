import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("successProfiles").collect();
  },
});

export const upsert = mutation({
  args: {
    roleKey: v.string(),
    title: v.string(),
    competencies: v.array(
      v.object({
        name: v.string(),
        weight: v.number(),
      })
    ),
    minPerformance: v.number(),
    minExperienceYears: v.number(),
    minAdcScore: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("successProfiles")
      .withIndex("by_role_key", (q) => q.eq("roleKey", args.roleKey))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        competencies: args.competencies,
        minPerformance: args.minPerformance,
        minExperienceYears: args.minExperienceYears,
        minAdcScore: args.minAdcScore,
        notes: args.notes,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("successProfiles", {
        roleKey: args.roleKey,
        title: args.title,
        competencies: args.competencies,
        minPerformance: args.minPerformance,
        minExperienceYears: args.minExperienceYears,
        minAdcScore: args.minAdcScore,
        notes: args.notes,
      });
    }
  },
});
