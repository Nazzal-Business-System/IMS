import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLanguageLoading() {
  return (
    <div className="max-w-2xl space-y-4" aria-busy>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64 max-w-full" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
