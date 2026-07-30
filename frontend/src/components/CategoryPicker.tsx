"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { Category } from "@/lib/finance-types";

type Props = {
  value: Category | null;
  merchantLabel: string; // shown in the "always categorize" option
  onSelect: (category: Category, createRule: boolean) => void;
};

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/categories"),
    staleTime: 60_000,
  });
}

export function CategoryPicker({ value, merchantLabel, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [ruleMode, setRuleMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: categories } = useCategories();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => {
          setRuleMode(false);
          setOpen((v) => !v);
        }}
        className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-ink-2 transition hover:border-line-strong"
      >
        {value ? `${value.emoji} ${value.name}` : "Categorize"}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-line-strong bg-card p-1 shadow-xl">
          <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-ink-2">
            <input
              type="checkbox"
              checked={ruleMode}
              onChange={(e) => setRuleMode(e.target.checked)}
            />
            Always for “{merchantLabel}”
          </label>
          <div className="max-h-72 overflow-y-auto">
            {categories?.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  onSelect(category, ruleMode);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm hover:bg-moss ${
                  value?.id === category.id ? "bg-moss" : ""
                }`}
              >
                <span>{category.emoji}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
