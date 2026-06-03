"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

import { cn } from "@/utils";

export function DoncLogoMark({
  className,
  size = "md",
  compressed = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  compressed?: boolean;
}) {
  const imageSize = compressed ? "48px" : size === "lg" ? "112px" : size === "sm" ? "80px" : "96px";

  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-hidden",
        compressed ? "h-10 w-12" : size === "sm" && "h-8 w-20",
        !compressed && size === "md" && "h-10 w-24",
        !compressed && size === "lg" && "h-11 w-28",
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src={compressed ? "/DONC-comprimido.png" : "/DONC.png"}
        alt=""
        fill
        sizes={imageSize}
        className={cn("object-contain", compressed ? "object-center" : "object-left")}
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
        compressed={collapsed}
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
