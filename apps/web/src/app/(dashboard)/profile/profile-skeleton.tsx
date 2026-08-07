export function ProfileSkeleton() {
  return (
    <div className="ims-profile-page mx-auto flex w-full max-w-5xl flex-col gap-6" aria-busy>
      <div className="ims-profile-hero">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-[color-mix(in_srgb,#fff_12%,transparent)] sm:mx-0" />
          <div className="flex-1 space-y-3">
            <div className="mx-auto h-8 w-48 animate-pulse rounded bg-[color-mix(in_srgb,#fff_14%,transparent)] sm:mx-0" />
            <div className="mx-auto h-4 w-56 animate-pulse rounded bg-[color-mix(in_srgb,#fff_10%,transparent)] sm:mx-0" />
            <div className="mx-auto h-3 w-64 animate-pulse rounded bg-[color-mix(in_srgb,#fff_8%,transparent)] sm:mx-0" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.9fr)]">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ims-profile-panel h-36">
              <div className="mb-4 h-4 w-32 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
              <div className="space-y-3">
                <div className="h-3 w-full animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="ims-profile-panel h-40">
              <div className="mb-4 h-4 w-28 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
              <div className="space-y-3">
                <div className="h-3 w-full animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
