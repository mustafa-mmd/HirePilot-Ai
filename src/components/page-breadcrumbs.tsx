import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function PageBreadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => <li className="flex items-center gap-1.5" key={`${item.label}-${index}`}>{index > 0 ? <ChevronRight className="size-3.5" aria-hidden="true" /> : null}{item.href ? <Link className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={item.href}>{item.label}</Link> : <span className="font-medium text-foreground" aria-current="page">{item.label}</span>}</li>)}
      </ol>
    </nav>
  );
}
