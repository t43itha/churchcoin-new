"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, Mail, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NoInvitePage() {
  const router = useRouter();

  const handleCreateNewChurch = () => {
    router.push("/onboarding/new-church/1");
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-error/10 mb-4">
          <AlertCircle className="h-8 w-8 text-error" />
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2 font-primary">
          Invitation required
        </h1>
        <p className="text-grey-mid font-primary">
          You need an invitation to join an existing church.
        </p>
      </div>

      <Card className="p-6 border-ledger mb-8">
        <div className="flex items-start gap-3 mb-4">
          <Mail className="h-5 w-5 text-grey-mid mt-0.5 shrink-0" />
          <div>
            <h3 className="font-medium text-ink font-primary mb-1">
              Expecting an invitation?
            </h3>
            <p className="text-sm text-grey-mid font-primary">
              Contact your church administrator and ask them to send you an
              invite link. The link will be sent to your email address.
            </p>
          </div>
        </div>

        <div className="border-t border-ledger pt-4 mt-4">
          <h4 className="text-sm font-medium text-ink font-primary mb-2">
            Your invitation link may have:
          </h4>
          <ul className="text-sm text-grey-mid font-primary space-y-1">
            <li>• Expired (links are valid for 14 days)</li>
            <li>• Already been used</li>
            <li>• Been revoked by the administrator</li>
          </ul>
        </div>
      </Card>

      <div className="text-center">
        <p className="text-sm text-grey-mid font-primary mb-4">
          Or, if you&apos;re setting up a new church:
        </p>
        <Button
          onClick={handleCreateNewChurch}
          variant="outline"
          className="font-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create a new church
        </Button>
      </div>
    </div>
  );
}
