"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/utils";

export function DoncLogoMark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center text-primary",
        size === "sm" && "h-9 w-9",
        size === "md" && "h-11 w-11",
        size === "lg" && "h-12 w-12",
        className,
      )}
      aria-hidden="true"
    >
      <span className="absolute inset-[13%] rounded-full border-[0.42rem] border-current" />
      <span className="absolute right-[8%] top-[13%] h-[42%] w-[42%] rounded-full bg-card" />
      <span className="absolute right-[9%] top-[16%] h-[42%] w-[18%] origin-bottom rotate-45 rounded-full bg-current" />
      <span className="absolute right-[18%] top-[13%] h-[18%] w-[18%] rounded-full bg-current" />
    </span>
  );
}

export function BrandLink({
  href = "/dashboard",
  compact = false,
  collapsed = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  collapsed?: boolean;
  className?: string;
}) {
  const showText = !compact && !collapsed;

  return (
    <Link href={href} className={cn("flex min-w-0 items-center gap-3", className)}>
      <DoncLogoMark size={compact ? "sm" : "md"} />
      <motion.span
        className="min-w-0 leading-tight"
        animate={{ opacity: showText ? 1 : 0, width: showText ? "auto" : 0 }}
        transition={{ duration: 0.18 }}
        style={{ overflow: "hidden", whiteSpace: "nowrap" }}
      >
        <span className="block text-2xl font-bold tracking-normal text-foreground">Donc</span>
      </motion.span>
    </Link>
  );
}
