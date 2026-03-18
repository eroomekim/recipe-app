"use client";

import Tag from "./Tag";

interface TagSelectorProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

export default function TagSelector({
  label,
  options,
  selected,
  onToggle,
}: TagSelectorProps) {
  return (
    <div>
      <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Tag
            key={option}
            label={option}
            active={selected.includes(option)}
            onClick={() => onToggle(option)}
          />
        ))}
      </div>
    </div>
  );
}
