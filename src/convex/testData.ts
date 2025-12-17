import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

export const seedSuccessProfiles = action({
  args: {},
  handler: async (ctx) => {
    // Senior Product Manager
    await ctx.runMutation(api.successProfiles.upsert, {
      roleKey: "senior-product-manager",
      title: "Senior Product Manager",
      competencies: [
        { name: "Strategic Thinking", weight: 0.9 },
        { name: "Product Vision", weight: 0.85 },
        { name: "Stakeholder Management", weight: 0.8 },
        { name: "Data Analysis", weight: 0.75 },
        { name: "User Research", weight: 0.7 },
        { name: "Technical Acumen", weight: 0.65 },
      ],
      minPerformance: 4.0,
      minExperienceYears: 5,
      minAdcScore: 75,
      notes: "Requires proven track record of successful product launches",
    });

    // Engineering Manager
    await ctx.runMutation(api.successProfiles.upsert, {
      roleKey: "engineering-manager",
      title: "Engineering Manager",
      competencies: [
        { name: "Technical Leadership", weight: 0.9 },
        { name: "Team Development", weight: 0.85 },
        { name: "System Design", weight: 0.8 },
        { name: "Project Management", weight: 0.75 },
        { name: "Communication", weight: 0.8 },
        { name: "Conflict Resolution", weight: 0.7 },
      ],
      minPerformance: 4.5,
      minExperienceYears: 6,
      minAdcScore: 80,
      notes: "Must demonstrate ability to lead and grow engineering teams",
    });

    return { success: true, message: "Success profiles seeded" };
  },
});

export const seedMyAssessment = action({
  args: {},
  handler: async (ctx) => {
    // Create sample assessment for current user
    await ctx.runMutation(api.assessments.upsertMine, {
      performance: 3.5,
      experienceYears: 3,
      adcScore: 68,
      competencies: {
        "Strategic Thinking": 3.0,
        "Product Vision": 2.5,
        "Stakeholder Management": 3.5,
        "Data Analysis": 4.0,
        "User Research": 3.0,
        "Technical Acumen": 3.5,
      },
    });

    return { success: true, message: "Sample assessment created" };
  },
});