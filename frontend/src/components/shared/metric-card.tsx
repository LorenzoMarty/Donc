import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function MetricCard({
  title,
  value,
  detail,
  progress,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  progress?: number;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold tracking-normal">{value}</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl border-2 border-foreground bg-secondary text-secondary-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{detail}</p>
        {progress !== undefined && <Progress value={progress} className="mt-4" />}
      </CardContent>
    </Card>
  );
}
