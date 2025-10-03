"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ALL_ROLES, getRoleDisplayName, getRolePermissions } from "@/lib/rbac";
import type { UserRole } from "@/lib/rbac";

type Invite = {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  createdAt: number;
  expiresAt: number;
  acceptedAt: number | null;
  revokedAt: number | null;
  invitedBy: { id: string; name: string } | null;
};

const formatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const buildInviteUrl = (token: string) =>
  typeof window === "undefined"
    ? `/register?invite=${token}`
    : `${window.location.origin}/register?invite=${token}`;

export default function ManageUsersPage() {
  const { user, loading } = useSession();
  const permissions = useMemo(
    () => getRolePermissions(user?.role),
    [user?.role]
  );

  const [invites, setInvites] = useState<Invite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("finance");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    setInvitesLoading(true);
    setListError(null);

    try {
      const response = await fetch("/api/users/invites", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "" }));
        throw new Error(body.error || "Unable to load invitations");
      }

      const data = (await response.json()) as { invites: Invite[] };
      setInvites(data.invites);
      setListError(null);
    } catch (fetchError) {
      console.error("Failed to load invites", fetchError);
      setListError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load invitations"
      );
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (permissions.canManageUsers) {
      fetchInvites().catch((err) => {
        console.error(err);
      });
    }
  }, [fetchInvites, permissions.canManageUsers]);

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    setFormError(null);

    try {
      const response = await fetch("/api/users/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "" }));
        throw new Error(body.error || "Could not create invite");
      }

      setEmail("");
      setFormError(null);
      setListError(null);
      await fetchInvites();
      setFeedback("Invitation created. Share the invite link below.");
    } catch (submitError) {
      console.error("Failed to create invite", submitError);
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create invite"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (token: string) => {
    setFormError(null);
    setListError(null);
    setFeedback(null);
    try {
      const response = await fetch(`/api/users/invites/${token}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "" }));
        throw new Error(body.error || "Unable to revoke invite");
      }

      await fetchInvites();
      setFeedback("Invitation revoked");
    } catch (revokeError) {
      console.error("Failed to revoke invite", revokeError);
      setListError(
        revokeError instanceof Error
          ? revokeError.message
          : "Unable to revoke invite"
      );
    }
  };

  const copyInviteLink = async (token: string) => {
    setFormError(null);
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(buildInviteUrl(token));
      setFeedback("Invite link copied to clipboard");
    } catch (copyError) {
      console.error("Failed to copy invite link", copyError);
      setFormError("Could not copy invite link to clipboard");
    }
  };

  const sortedInvites = useMemo(() => {
    return [...invites].sort((a, b) => b.createdAt - a.createdAt);
  }, [invites]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-24">
        <Card className="max-w-lg border-ledger bg-paper shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-ink">
              Loading team access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-grey-mid">Please wait while we load your permissions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!permissions.canManageUsers) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-24">
        <Card className="max-w-lg border-ledger bg-paper shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-ink">
              Restricted access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-grey-mid">
              You do not have permission to manage team members. Contact an administrator
              if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-12">
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8">
          <h1 className="text-3xl font-semibold text-ink">Team access</h1>
          <p className="text-sm text-grey-mid">
            Invite new team members, assign their role, and manage pending invitations.
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8">
        <Card className="border-ledger bg-paper shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-ink">
              Invite a team member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-end" onSubmit={handleInvite}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-grey-mid">
                  Email address
                </label>
                <Input
                  type="email"
                  required
                  placeholder="team@church.org"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="font-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-grey-mid">
                  Role
                </label>
                <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                  <SelectTrigger className="font-primary border-ledger">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="font-primary">
                    {ALL_ROLES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {getRoleDisplayName(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-ink text-paper hover:bg-ink/90"
              >
                {submitting ? "Sending invite..." : "Send invite"}
              </Button>
            </form>
            {feedback ? (
              <p className="mt-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                {feedback}
              </p>
            ) : null}
            {formError ? (
              <p className="mt-4 rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
                {formError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-ledger bg-paper shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-ink">
              Pending invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {listError ? (
              <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
                {listError}
              </p>
            ) : invitesLoading ? (
              <p className="text-sm text-grey-mid">Loading invitations...</p>
            ) : sortedInvites.length === 0 ? (
              <p className="text-sm text-grey-mid">
                There are no pending invitations. Send an invite to add your team.
              </p>
            ) : (
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited by</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInvites.map((invite) => {
                    const status = invite.revokedAt
                      ? "Revoked"
                      : invite.acceptedAt
                        ? "Accepted"
                        : invite.expiresAt < Date.now()
                          ? "Expired"
                          : "Pending";

                    return (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium text-ink">
                          {invite.email}
                        </TableCell>
                        <TableCell>{getRoleDisplayName(invite.role)}</TableCell>
                        <TableCell>{invite.invitedBy?.name ?? "—"}</TableCell>
                        <TableCell>{formatter.format(invite.expiresAt)}</TableCell>
                        <TableCell>{status}</TableCell>
                        <TableCell>
                          {status === "Pending" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="font-primary border-ledger"
                                onClick={() => copyInviteLink(invite.token)}
                              >
                                Copy link
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="font-primary border-error text-error hover:bg-error/10"
                                onClick={() => handleRevoke(invite.token)}
                              >
                                Revoke
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <span className="text-xs text-grey-mid">—</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
