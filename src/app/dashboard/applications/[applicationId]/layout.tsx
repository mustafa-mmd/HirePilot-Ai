import { PageBreadcrumbs } from "@/components/page-breadcrumbs";

export default function ApplicationDetailsLayout({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5"><PageBreadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Candidates", href: "/dashboard/candidates" }, { label: "Application details" }]} />{children}</div>;
}
