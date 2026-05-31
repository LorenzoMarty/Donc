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
        size === "sm" && "h-8 w-20",
        size === "md" && "h-10 w-24",
        size === "lg" && "h-11 w-28",
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src="/DONC.png"
        alt=""
        fill
        sizes={size === "lg" ? "112px" : size === "sm" ? "80px" : "96px"}
        className="object-contain object-left"
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
        className={cn(collapsed && "h-10 w-12")}
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
