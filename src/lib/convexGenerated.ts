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

type SubcategoriesWithParentsQuery = FunctionReference<
  "query",
  "public",
  { churchId: Id<"churches">; type?: "income" | "expense" },
  Array<{
    _id: Id<"categories">;
    name: string;
    type: "income" | "expense";
    parentName?: string;
    displayName: string;
  }>
>;

type BaseApi = typeof generatedApi;

type BaseAuthModule = BaseApi["auth"];

type AugmentedAuthModule = Omit<
  BaseAuthModule,
  "createInvitation" | "listInvitations" | "getInvitationByToken" | "revokeInvitation"
> & {
  createInvitation: FunctionReference<
    "mutation",
    "public",
    {
      email: string;
      role: UserRole;
      churchId: Id<"churches">;
      invitedBy: Id<"users">;
    },
    { invitationId: Id<"userInvites">; token: string; expiresAt: number }
  >;
  listInvitations: FunctionReference<
    "query",
    "public",
    { churchId: Id<"churches"> },
    Array<{
      _id: Id<"userInvites">;
      email: string;
      role: UserRole;
      token: string;
      createdAt: number;
      expiresAt: number;
      acceptedAt?: number;
      revokedAt?: number;
      invitedByUser?: { _id: Id<"users">; name: string } | null;
    }>
  >;
  getInvitationByToken: FunctionReference<
    "query",
    "public",
    { token: string },
    | ({
        _id: Id<"userInvites">;
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
    { invitationId: Id<"userInvites"> },
    null
  >;
};

type AugmentedApi = Omit<BaseApi, "categories" | "auth"> & {
  categories: {
    getCategories: CategoriesQuery;
    getSubcategoriesWithParents: SubcategoriesWithParentsQuery;
  };
  auth: AugmentedAuthModule;
};

export const api = generatedApi as AugmentedApi;

export type { Doc, Id };
