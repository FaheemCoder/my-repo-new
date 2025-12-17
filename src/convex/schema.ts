import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // default auth tables using convex auth.
  ...authTables, // do not remove or modify

  // the users table is the default users table that is brought in by the authTables
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("admin"), v.literal("committee"), v.literal("employee"), v.literal("user"))),
    department: v.optional(v.string()),
    position: v.optional(v.string()),
    performance: v.optional(v.number()),
    potential: v.optional(v.string()),
    readinessScore: v.optional(v.number()),
    gender: v.optional(v.string()),
    targetRole: v.optional(v.string()),
    currentCourses: v.optional(v.array(v.string())),
    avatarStorageId: v.optional(v.id("_storage")),
    joinDate: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("by_role", ["role"])
    .index("by_department", ["department"]),

  // Employee profiles with detailed succession planning data
  employeeProfiles: defineTable({
    userId: v.id("users"),
    currentRole: v.string(),
    targetRoles: v.array(v.string()),
    yearsInRole: v.optional(v.number()),
    careerAspirations: v.array(v.string()),
    competencies: v.array(v.object({
      name: v.string(),
      currentLevel: v.number(),
      targetLevel: v.number(),
      importance: v.string(),
    })),
    keyCompetencies: v.optional(v.array(v.string())),
    strengths: v.array(v.string()),
    developmentAreas: v.array(v.string()),
    certifications: v.optional(v.array(v.string())),
    lastAssessmentDate: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Individual Development Plans
  developmentPlans: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    activities: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        completed: v.optional(v.boolean()),
        done: v.optional(v.boolean()),
        dueDate: v.optional(v.number()),
      })
    ),
    progress: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("paused"), v.literal("selected"), v.literal("")),
    sourceType: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // Gap Analysis Results
  gapAnalysis: defineTable({
    userId: v.id("users"),
    targetRole: v.string(),
    gaps: v.array(
      v.object({
        competency: v.string(),
        currentLevel: v.number(),
        requiredLevel: v.number(),
        gap: v.number(),
        severity: v.union(v.literal("critical"), v.literal("important"), v.literal("nice_to_have")),
        recommendations: v.array(v.string()),
      })
    ),
    overallScore: v.number(),
    analysisDate: v.number(),
    competencyGaps: v.optional(v.array(
      v.object({
        competency: v.string(),
        currentLevel: v.number(),
        requiredLevel: v.number(),
        gap: v.number(),
      })
    )),
    recommendations: v.optional(v.array(v.string())),
    detailedAnswers: v.optional(
      v.object({
        currentRole: v.string(),
        targetRole: v.string(),
        timeframe: v.string(),
        currentSkills: v.string(),
        skillsToLearn: v.string(),
      })
    ),
  }).index("by_user", ["userId"]),

  // Learning Content
  learningContent: defineTable({
    title: v.string(),
    description: v.string(),
    type: v.union(v.literal("course"), v.literal("video"), v.literal("article")),
    duration: v.number(),
    competencies: v.array(v.string()),
    url: v.optional(v.string()),
  }),

  // User Learning Progress
  learningProgress: defineTable({
    userId: v.id("users"),
    contentId: v.id("learningContent"),
    progress: v.number(),
    completed: v.boolean(),
    lastAccessedAt: v.number(),
    status: v.optional(v.union(v.literal("completed"), v.literal("in_progress"), v.literal("not_started"))),
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentId"]),

  // Mentorship Relationships
  mentorships: defineTable({
    mentorId: v.id("users"),
    menteeId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("pending")),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    focusAreas: v.array(v.string()),
  })
    .index("by_mentor", ["mentorId"])
    .index("by_mentee", ["menteeId"]),

  // Project Assignments
  projects: defineTable({
    title: v.string(),
    description: v.string(),
    competencies: v.array(v.string()),
    duration: v.number(),
    availableSlots: v.number(),
  }),

  // Project Applications
  projectApplications: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    appliedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"]),

  // Achievements and Badges
  achievements: defineTable({
    // Allow legacy docs with empty string while enforcing Id<"users"> for new ones
    userId: v.union(v.id("users"), v.literal("")),
    // Allow legacy empty string type
    type: v.union(
      v.literal("badge"),
      v.literal("certificate"),
      v.literal("milestone"),
      v.literal("")
    ),
    title: v.string(),
    description: v.string(),
    earnedAt: v.optional(v.number()),
    earnedDate: v.optional(v.number()),
    category: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Analytics and Reports
  analyticsData: defineTable({
    date: v.optional(v.string()),
    metric: v.optional(v.string()),
    value: v.optional(v.number()),
    // Legacy fields for backward compatibility
    period: v.optional(v.string()),
    type: v.optional(v.string()),
    generatedDate: v.optional(v.number()),
    data: v.optional(v.any()),
  }).index("by_date", ["date"]),

  // Chatbot events & messages
  chatSessions: defineTable({
    userId: v.optional(v.id("users")),
    sessionKey: v.string(),
    startedAt: v.optional(v.number()),
    lastActiveAt: v.number(),
    source: v.string(),
  }).index("by_session_key", ["sessionKey"]),

  chatMessages: defineTable({
    sessionId: v.id("chatSessions"),
    userId: v.optional(v.id("users")),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  }).index("by_session", ["sessionId"]),

  chatEvents: defineTable({
    sessionId: v.id("chatSessions"),
    userId: v.optional(v.id("users")),
    type: v.optional(v.string()),
    eventType: v.optional(v.string()),
    meta: v.optional(v.any()),
    timestamp: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  }).index("by_session", ["sessionId"]),

  // NEW: Success Profiles for target roles
  successProfiles: defineTable({
    title: v.string(),
    roleKey: v.string(),
    competencies: v.array(
      v.object({
        name: v.string(),
        weight: v.number(), // 0..1
      })
    ),
    minPerformance: v.number(), // 0..5
    minExperienceYears: v.number(),
    minAdcScore: v.number(), // 0..100
    notes: v.optional(v.string()),
  }).index("by_role_key", ["roleKey"]),

  // NEW: Employee Assessments
  employeeAssessments: defineTable({
    userId: v.id("users"),
    performance: v.number(), // 0..5
    experienceYears: v.number(),
    adcScore: v.number(), // 0..100
    competencies: v.object({}), // Record<string, number (0..5)>
  }).index("by_user", ["userId"]),
});