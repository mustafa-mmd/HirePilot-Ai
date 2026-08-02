import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationDetailsLoading() {
  return <div className="mx-auto max-w-7xl space-y-6"><Skeleton className="h-5 w-80 max-w-full" /><div className="space-y-3"><Skeleton className="h-9 w-72 max-w-full" /><Skeleton className="h-5 w-96 max-w-full" /></div><div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton className="h-28 rounded-xl" key={index} />)}</div><Skeleton className="h-12 rounded-xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div></div>;
}
