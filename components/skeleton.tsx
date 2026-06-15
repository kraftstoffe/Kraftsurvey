import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function SurveyListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Laden">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card-admin p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SurveyBuilderSkeleton() {
  return (
    <div className="max-w-3xl space-y-6" aria-busy="true" aria-label="Laden">
      <div className="flex justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-56 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="card p-6 space-y-4">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="card p-5 space-y-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Laden">
      <div className="flex justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-64 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="kpi-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="kpi-card">
            <Skeleton className="h-8 w-16 mx-auto mb-2" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </div>
        ))}
      </div>
      <div className="card p-6">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export function PublicSurveySkeleton() {
  return (
    <div className="min-h-dvh kraftstoff-bg flex flex-col" aria-busy="true" aria-label="Laden">
      <div className="px-6 pt-6 max-w-xl mx-auto w-full">
        <div className="flex justify-between mb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-1 w-full rounded-full mb-8" />
      </div>
      <div className="flex-1 flex justify-center px-6">
        <div className="card w-full max-w-xl p-8 space-y-6">
          <Skeleton className="h-7 w-[72%] max-w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="flex justify-between pt-4">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
