import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return <div className="mx-auto max-w-6xl space-y-6"><Skeleton className="h-10 w-72" /><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-44" />)}</div><Skeleton className="h-48" /></div>;
}
