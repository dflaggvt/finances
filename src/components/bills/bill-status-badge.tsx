import { Badge } from "@/components/ui/badge";

const statusConfig = {
  paid: { label: "Paid", variant: "default" as const, className: "bg-green-600" },
  upcoming: { label: "Upcoming", variant: "secondary" as const, className: "" },
  overdue: { label: "Overdue", variant: "destructive" as const, className: "" },
  skipped: { label: "Skipped", variant: "outline" as const, className: "" },
};

export function BillStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.upcoming;
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
