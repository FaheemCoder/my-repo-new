import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Fetch current user profile with avatar URL
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email ?? ""))
      .unique()
      .catch(() => null);
    if (!user) return null;

    const avatarUrl = user.avatarStorageId
      ? await ctx.storage.getUrl(user.avatarStorageId)
      : user.image ?? null;

    return {
      ...user,
      avatarUrl,
    };
  },
});

// Update profile basics
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    gender: v.optional(v.string()),
    department: v.optional(v.string()),
    targetRole: v.optional(v.string()),
    currentCourses: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Basic validation: ensure strings are clean and not absurdly long
    const sanitize = (s?: string) => (typeof s === "string" ? s.trim() : undefined);
    const name = sanitize(args.name);
    const gender = sanitize(args.gender);
    const department = sanitize(args.department);
    const targetRole = sanitize(args.targetRole);
    const currentCourses =
      args.currentCourses?.map((c) => c.trim()).filter((c) => c.length > 0) ?? undefined;

    // Find or create user
    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email ?? ""))
      .unique()
      .catch(() => null);

    if (!user) {
      const newId = await ctx.db.insert("users", {
        email: identity.email ?? undefined,
        name: identity.name ?? undefined,
        image: identity.pictureUrl ?? undefined,
        isAnonymous: identity.tokenIdentifier?.startsWith("anonymous:") ?? false,
        role: undefined,
        department: undefined,
        position: undefined,
        performance: undefined,
        potential: undefined,
        readinessScore: undefined,
        gender: undefined,
        targetRole: undefined,
        currentCourses: undefined,
        avatarStorageId: undefined,
      });
      user = await ctx.db.get(newId);
      if (!user) throw new Error("Failed to create user");
    }

    // Defensive: if nothing to update, return early
    if (
      name === undefined &&
      gender === undefined &&
      department === undefined &&
      targetRole === undefined &&
      currentCourses === undefined
    ) {
      return true;
    }

    // Apply patch
    await ctx.db.patch(user._id, {
      ...(name !== undefined ? { name } : {}),
      ...(gender !== undefined ? { gender } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(targetRole !== undefined ? { targetRole } : {}),
      ...(currentCourses !== undefined ? { currentCourses } : {}),
    });

    return true;
  },
});

// Upload avatar image; returns public URL
export const uploadAvatar = mutation({
  args: {
    contentType: v.string(),
    base64: v.string(), // pure base64 (no data: prefix)
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email ?? ""))
      .unique()
      .catch(() => null);

    if (!user) {
      // Auto-provision minimal user so avatar upload works for first-time auth
      const newId = await ctx.db.insert("users", {
        email: identity.email ?? undefined,
        name: identity.name ?? undefined,
        image: undefined,
        isAnonymous: identity.tokenIdentifier?.startsWith("anonymous:") ?? false,
        role: undefined,
        department: undefined,
        position: undefined,
        performance: undefined,
        potential: undefined,
        readinessScore: undefined,
        gender: undefined,
        targetRole: undefined,
        currentCourses: undefined,
        avatarStorageId: undefined,
      });
      const created = await ctx.db.get(newId);
      if (!created) throw new Error("Failed to create user");
      // proceed with patch below using created
      const dataUrl = args.base64
        ? `data:${args.contentType};base64,${args.base64}`
        : null;
      await ctx.db.patch(created._id, { image: dataUrl ?? undefined });
      return { url: dataUrl };
    }

    // Store as data URL in the user's image field for simplicity and reliability
    const dataUrl = args.base64
      ? `data:${args.contentType};base64,${args.base64}`
      : null;
    await ctx.db.patch(user._id, { image: dataUrl ?? undefined });

    return { url: dataUrl };
  },
});