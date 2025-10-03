import { api as generatedApi } from "../../convex/_generated/api";
import type { FunctionReference } from "convex/server";
import type { UserRole } from "@/lib/rbac";

import type { Doc, Id } from "../../convex/_generated/dataModel";

type CategoriesQuery = FunctionReference<
  "query",
  "public",
  { churchId: Id<"churches">; type?: "income" | "expense" },
  Doc<"categories">[]
>;

type AugmentedApi = typeof generatedApi & {
  categories: {
    getCategories: CategoriesQuery;
  };
  users: {
    createInvitation: FunctionReference<
      "mutation",
      "public",
      {
        email: string;
        role: UserRole;
        churchId: Id<"churches">;
        invitedBy: Id<"users">;
      },
      { invitationId: string; token: string; expiresAt: number }
    >;
    listInvitations: FunctionReference<
      "query",
      "public",
      { churchId: Id<"churches"> },
      Array<{
        _id: string;
        email: string;
        role: UserRole;
        token: string;
        createdAt: number;
        expiresAt: number;
        acceptedAt?: number;
        revokedAt?: number;
        invitedByUser?: { _id: string; name: string } | null;
      }>
    >;
    getInvitationByToken: FunctionReference<
      "query",
      "public",
      { token: string },
      | ({
          _id: string;
          email: string;
          role: UserRole;
          churchId: Id<"churches">;
          churchName: string | null;
          expiresAt: number;
          acceptedAt?: number;
          revokedAt?: number;
        })
      | null
    >;
    revokeInvitation: FunctionReference<
      "mutation",
      "public",
      { invitationId: string },
      void
    >;
  };
};

export const api = generatedApi as AugmentedApi;

export type { Doc, Id };
