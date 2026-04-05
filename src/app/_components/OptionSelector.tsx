"use client";

import type { Database } from "@/lib/types";

type Option = Database["public"]["Tables"]["options"]["Row"];

type Props = {
  options: Option[];
  selectedIds: string[];
  onToggle: (optionId: string) => void;
};

export function OptionSelector({ options, selectedIds, onToggle }: Props) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isSelected = selectedIds.includes(opt.id);

        return (
          <label
            key={opt.id}
            className={`
              flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors
              ${isSelected ? "border-amber-600 bg-amber-50" : "border-zinc-200 hover:border-amber-300"}
            `}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(opt.id)}
              className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-zinc-900">
                {opt.name}
              </span>
              {opt.description && (
                <span className="block text-xs text-zinc-500">
                  {opt.description}
                </span>
              )}
            </div>
            <span className="text-sm font-medium text-zinc-700">
              ¥{opt.price.toLocaleString()}
            </span>
          </label>
        );
      })}
    </div>
  );
}
