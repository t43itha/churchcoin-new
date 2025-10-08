"use client";

type DonorListSkeletonProps = {
  count?: number;
};

export function DonorListSkeleton({ count = 6 }: DonorListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-lg border border-ledger bg-paper px-4 py-3"
        >
          <div className="flex flex-col gap-2">
            <div className="h-4 w-40 rounded bg-ledger" />
            <div className="h-3 w-56 rounded bg-ledger/80" />
            <div className="flex gap-3">
              <div className="h-3 w-32 rounded bg-ledger/80" />
              <div className="h-3 w-24 rounded bg-ledger/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
