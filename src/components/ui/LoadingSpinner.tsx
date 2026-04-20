import React from "react";
import { cn } from "@/lib/utils";

export const LoadingSpinner = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex justify-center items-center py-8", className)}>
      <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
    </div>
  );
};
