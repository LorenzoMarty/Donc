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
            <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-md border border-primary/20 bg-primary/10 text-secondary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{detail}</p>
        {progress !== undefined && <Progress value={progress} className="mt-4" />}
      </CardContent>
    </Card>
  );
}
