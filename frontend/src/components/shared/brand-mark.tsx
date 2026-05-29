"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

import { cn } from "@/utils";

export function DoncLogoMark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-hidden",
        size === "sm" && "h-9 w-24",
        size === "md" && "h-11 w-28",
        size === "lg" && "h-12 w-32",
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src="/DONC.svg"
        alt=""
        fill
        sizes={size === "lg" ? "128px" : size === "sm" ? "96px" : "112px"}
        className="scale-[3.7] object-contain"
        priority
      />
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
    <Link href={href} className={cn("flex min-w-0 items-center", className)}>
      <DoncLogoMark
        size={compact ? "sm" : "md"}
        className={cn(collapsed && "h-12 w-14")}
      />
      <motion.span
        className="sr-only"
        animate={{ opacity: showText ? 1 : 0, width: showText ? "auto" : 0 }}
        transition={{ duration: 0.18 }}
        style={{ overflow: "hidden", whiteSpace: "nowrap" }}
      >
        Donc
      </motion.span>
    </Link>
  );
}
