import React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ title, description, icon, className }: EmptyStateProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center bg-white border border-[#E5E3DB] rounded-xl shadow-sm", className)}>
      <div className="w-16 h-16 bg-primary-light text-primary rounded-full flex items-center justify-center mb-4">
        {icon || <FolderOpen size={32} />}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-text-secondary text-sm max-w-md">{description}</p>
    </div>
  );
};
