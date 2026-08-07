import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsAppearanceLoading() {
  return (
    <div className="max-w-2xl space-y-4" aria-busy>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
}
