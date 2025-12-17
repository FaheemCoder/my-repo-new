import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const deleteCorruptedAuthAccount = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all authAccounts and check for corrupted ones
    const allAccounts = await ctx.db.query("authAccounts").collect();
    
    for (const account of allAccounts) {
      // Check if userId is empty or invalid
      if (!account.userId || account.userId === "" || typeof account.userId !== "string" || !account.userId.startsWith("j")) {
        await ctx.db.delete(account._id);
        return { success: true, deletedId: account._id, reason: "Invalid userId" };
      }
    }
    
    return { success: false, message: "No corrupted account found" };
  },
});