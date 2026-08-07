import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsSecurityLoading() {
  return (
    <div className="max-w-2xl space-y-4" aria-busy>
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
