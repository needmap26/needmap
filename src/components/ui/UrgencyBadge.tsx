import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UrgencyBadgeProps {
  level: string;
  className?: string;
}

export const UrgencyBadge = ({ level, className }: UrgencyBadgeProps) => {
  const styles: Record<string, string> = {
    emergency: "bg-red-100 text-red-800 border fill-red-800",
    critical: "bg-badge-critical-bg text-badge-critical-text",
    high: "bg-badge-high-bg text-badge-high-text",
    medium: "bg-badge-medium-bg text-badge-medium-text",
    low: "bg-badge-low-bg text-badge-low-text",
  };

  const labels: Record<string, string> = {
    emergency: "Emergency",
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider", styles[level], className)}>
      {labels[level]}
    </span>
  );
};
