import React from "react";
import { NeedCategory } from "@/types";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  category: NeedCategory;
  className?: string;
}

export const CategoryBadge = ({ category, className }: CategoryBadgeProps) => {
  const styles = {
    food: "bg-emerald-100 text-emerald-800",
    medical: "bg-red-100 text-red-800",
    shelter: "bg-blue-100 text-blue-800",
    education: "bg-purple-100 text-purple-800",
    other: "bg-gray-100 text-gray-800",
  };

  const labels = {
    food: "Food",
    medical: "Medical",
    shelter: "Shelter",
    education: "Education",
    other: "Other",
  };

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider", styles[category], className)}>
      {labels[category]}
    </span>
  );
};
