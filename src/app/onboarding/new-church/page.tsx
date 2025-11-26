"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewChurchPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding/new-church/1");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ledger border-t-ink" />
    </div>
  );
}
