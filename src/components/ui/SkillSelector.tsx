import React from "react";
import { cn } from "@/lib/utils";

interface SkillSelectorProps {
  selectedSkills: string[];
  onChange: (skills: string[]) => void;
  className?: string;
}

export const SKILL_OPTIONS = [
  "Medical", "Teaching", "Driving", "Construction", 
  "Cooking", "IT", "Counseling", "Legal"
];

export const SkillSelector = ({ selectedSkills, onChange, className }: SkillSelectorProps) => {
  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      onChange(selectedSkills.filter(s => s !== skill));
    } else {
      onChange([...selectedSkills, skill]);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {SKILL_OPTIONS.map((skill) => (
        <button
          key={skill}
          type="button"
          onClick={() => toggleSkill(skill)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
            selectedSkills.includes(skill)
              ? "bg-primary text-white border-primary"
              : "bg-white text-text-secondary border-[#E5E3DB] hover:border-primary hover:text-primary"
          )}
        >
          {skill}
        </button>
      ))}
    </div>
  );
};
