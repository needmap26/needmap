import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
}

export const StatCard = ({ title, value, icon, className }: StatCardProps) => {
  return (
    <div className={cn("bg-white p-6 rounded-xl border border-[#E5E3DB] shadow-sm flex items-center space-x-4", className)}>
      <div className="p-3 bg-primary-light text-primary rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-text-secondary text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-foreground mt-1">{value}</h3>
      </div>
    </div>
  );
};
