import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

export const analyze = action({
  args: {
    targetRoleKey: v.string(),
  },
  handler: async (ctx, args): Promise<{
    overlap: string[];
    gaps: Array<{
      competency: string;
      required: number;
      current: number;
      delta: number;
      severity: "high" | "medium" | "low";
    }>;
    hardRequirements: {
      performance: { required: number; current: number; delta: number };
      experienceYears: { required: number; current: number; delta: number };
      adcScore: { required: number; current: number; delta: number };
    };
    recommendations: Array<{
      competency: string;
      activityType: "mentorship" | "internalTraining" | "enrichment" | "jobRotation";
      description: string;
      estimatedWeeks: number;
      successMetric: string;
    }>;
    idpDraft: {
      title: string;
      description: string;
      activities: Array<{ title: string; description: string; completed: boolean }>;
    };
  }> => {
    // Fetch user's assessment
    const assessment: Doc<"employeeAssessments"> | null = await ctx.runQuery(api.assessments.getMine, {});
    if (!assessment) {
      throw new Error("Please complete your assessment first");
    }

    // Fetch success profile
    const profiles: Doc<"successProfiles">[] = await ctx.runQuery(api.successProfiles.list, {});
    const profile = profiles.find((p: Doc<"successProfiles">) => p.roleKey === args.targetRoleKey);
    if (!profile) {
      throw new Error("Success profile not found");
    }

    // Quantify competency gaps
    const gaps: Array<{
      competency: string;
      required: number;
      current: number;
      delta: number;
      severity: "high" | "medium" | "low";
    }> = [];

    const overlap: string[] = [];
    const competenciesMap = assessment.competencies as Record<string, number>;

    for (const comp of profile.competencies) {
      const requiredScore = comp.weight * 5; // 0..5 scale
      const currentScore = competenciesMap[comp.name] || 0;
      const delta = requiredScore - currentScore;

      if (delta > 0) {
        gaps.push({
          competency: comp.name,
          required: requiredScore,
          current: currentScore,
          delta,
          severity: delta >= 2 ? "high" : delta >= 1 ? "medium" : "low",
        });
      } else {
        overlap.push(comp.name);
      }
    }

    // Sort gaps by severity
    gaps.sort((a, b) => b.delta - a.delta);

    // Hard requirements
    const hardRequirements: {
      performance: { required: number; current: number; delta: number };
      experienceYears: { required: number; current: number; delta: number };
      adcScore: { required: number; current: number; delta: number };
    } = {
      performance: {
        required: profile.minPerformance,
        current: assessment.performance,
        delta: profile.minPerformance - assessment.performance,
      },
      experienceYears: {
        required: profile.minExperienceYears,
        current: assessment.experienceYears,
        delta: profile.minExperienceYears - assessment.experienceYears,
      },
      adcScore: {
        required: profile.minAdcScore,
        current: assessment.adcScore,
        delta: profile.minAdcScore - assessment.adcScore,
      },
    };

    // Generate recommendations
    const recommendations: Array<{
      competency: string;
      activityType: "mentorship" | "internalTraining" | "enrichment" | "jobRotation";
      description: string;
      estimatedWeeks: number;
      successMetric: string;
    }> = [];

    for (const gap of gaps) {
      if (gap.severity === "high") {
        recommendations.push({
          competency: gap.competency,
          activityType: "mentorship",
          description: `Pair with senior leader to develop ${gap.competency} through guided practice`,
          estimatedWeeks: 12,
          successMetric: `Improve ${gap.competency} score from ${gap.current.toFixed(1)} to ${gap.required.toFixed(1)}`,
        });
        recommendations.push({
          competency: gap.competency,
          activityType: "internalTraining",
          description: `Complete advanced training module on ${gap.competency}`,
          estimatedWeeks: 4,
          successMetric: `Pass certification assessment with 85%+ score`,
        });
      } else if (gap.severity === "medium") {
        recommendations.push({
          competency: gap.competency,
          activityType: "internalTraining",
          description: `Attend workshop series on ${gap.competency}`,
          estimatedWeeks: 6,
          successMetric: `Demonstrate proficiency in 3 real-world scenarios`,
        });
        recommendations.push({
          competency: gap.competency,
          activityType: "enrichment",
          description: `Lead cross-functional project requiring ${gap.competency}`,
          estimatedWeeks: 8,
          successMetric: `Successfully deliver project with positive stakeholder feedback`,
        });
      } else {
        recommendations.push({
          competency: gap.competency,
          activityType: "enrichment",
          description: `Shadow team member excelling in ${gap.competency}`,
          estimatedWeeks: 2,
          successMetric: `Document 5 key learnings and apply to current role`,
        });
      }
    }

    // Generate IDP draft
    const idpDraft = {
      title: `Development Plan: ${profile.title}`,
      description: `Personalized development plan to bridge gaps for ${profile.title} role. Focus areas: ${gaps.slice(0, 3).map((g) => g.competency).join(", ")}`,
      activities: recommendations.slice(0, 8).map((rec) => ({
        title: `${rec.activityType}: ${rec.competency}`,
        description: `${rec.description} (${rec.estimatedWeeks} weeks). Success: ${rec.successMetric}`,
        completed: false,
      })),
    };

    return {
      overlap,
      gaps,
      hardRequirements,
      recommendations,
      idpDraft,
    };
  },
});
