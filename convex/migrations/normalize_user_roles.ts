import { mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { normalizeRole } from "../roles";

export default mutation(async (ctx) => {
  const users = await ctx.db.query("users").collect();
  let updatedUsers = 0;

  for (const user of users) {
    const normalized = normalizeRole(user.role);
    if (normalized !== user.role) {
      await ctx.db.patch(user._id as Id<"users">, { role: normalized });
      updatedUsers += 1;
    }
  }

  const invites = await ctx.db.query("userInvites").collect();
  let updatedInvites = 0;

  for (const invite of invites) {
    const normalized = normalizeRole(invite.role);
    if (normalized !== invite.role) {
      await ctx.db.patch(invite._id as Id<"userInvites">, { role: normalized });
      updatedInvites += 1;
    }
  }

  return { updatedUsers, updatedInvites };
});
