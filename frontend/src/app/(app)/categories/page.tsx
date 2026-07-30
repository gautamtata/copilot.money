"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useCategories } from "@/components/CategoryPicker";
import { api } from "@/lib/api";
import type { Category } from "@/lib/finance-types";

type Rule = {
  id: string;
  merchant_pattern: string;
  match_type: string;
  category_id: string;
  priority: number;
};

function BudgetCell({ categoryId, budgetCents }: { categoryId: string; budgetCents: number | null }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(budgetCents != null ? String(budgetCents / 100) : "");

  const save = useMutation({
    mutationFn: (amountCents: number) =>
      api("/budgets", {
        method: "PUT",
        body: JSON.stringify({
          category_id: categoryId,
          month: new Date().toISOString().slice(0, 8) + "01",
          amount_cents: amountCents,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-summary"] }),
  });

  return (
    <div className="flex items-center gap-1 text-xs text-ink-3">
      $
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const dollars = parseFloat(value);
          const cents = Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
          if (cents !== (budgetCents ?? 0)) save.mutate(cents);
        }}
        placeholder="—"
        className="w-16 rounded border border-line bg-paper px-1.5 py-0.5 text-right text-xs tabular-nums text-ink-2 outline-none focus:border-pine"
      />
      /mo
    </div>
  );
}

function CategoryRow({
  category,
  budgetCents,
}: {
  category: Category;
  budgetCents: number | null;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [emoji, setEmoji] = useState(category.emoji);

  const save = useMutation({
    mutationFn: (patch: Partial<Category>) =>
      api(`/categories/${category.id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const remove = useMutation({
    mutationFn: () => api(`/categories/${category.id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="w-12 rounded border border-line-strong bg-paper px-1 py-1 text-center text-sm"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded border border-line-strong bg-paper px-2 py-1 text-sm"
          />
          <button
            onClick={() => {
              save.mutate({ name, emoji });
              setEditing(false);
            }}
            className="text-xs text-pos"
          >
            Save
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-ink-3">
            Cancel
          </button>
        </div>
      ) : (
        <>
          <span className="text-sm">
            {category.emoji} {category.name}
            {category.is_income && <span className="ml-2 text-xs text-pos">income</span>}
            {category.exclude_from_budget && (
              <span className="ml-2 text-xs text-ink-3">excluded from budget</span>
            )}
          </span>
          <div className="flex items-center gap-3">
            {!category.is_income && !category.exclude_from_budget && (
              <BudgetCell categoryId={category.id} budgetCents={budgetCents} />
            )}
            <button
              onClick={() => save.mutate({ exclude_from_budget: !category.exclude_from_budget })}
              className="text-xs text-ink-3 hover:text-ink"
            >
              {category.exclude_from_budget ? "Include in budget" : "Exclude from budget"}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-ink-3 hover:text-ink"
            >
              Edit
            </button>
            {!category.is_system && (
              <button
                onClick={() => confirm(`Delete "${category.name}"?`) && remove.mutate()}
                className="text-xs text-ink-3 hover:text-neg"
              >
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const { data: rules } = useQuery({
    queryKey: ["category-rules"],
    queryFn: () => api<Rule[]>("/category_rules"),
  });
  const { data: summary } = useQuery({
    queryKey: ["budget-summary"],
    queryFn: () =>
      api<{ categories: { category: Category; budget_cents: number | null }[] }>(
        "/budgets/summary",
      ),
  });
  const budgetByCategory = new Map(
    summary?.categories.map((c) => [c.category.id, c.budget_cents]) ?? [],
  );
  const [newName, setNewName] = useState("");

  const createCategory = useMutation({
    mutationFn: () =>
      api("/categories", { method: "POST", body: JSON.stringify({ name: newName }) }),
    onSuccess: () => {
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteRule = useMutation({
    mutationFn: (id: string) => api(`/category_rules/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["category-rules"] }),
  });

  const categoryById = new Map(categories?.map((c) => [c.id, c]) ?? []);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-8 figure text-2xl font-bold">Categories</h1>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="eyebrow">
          Categories
        </h2>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className="rounded-lg border border-line-strong bg-card px-3 py-1.5 text-sm outline-none placeholder:text-ink-3"
          />
          <button
            onClick={() => newName.trim() && createCategory.mutate()}
            className="rounded-lg bg-pine px-3 py-1.5 text-sm font-medium text-white"
          >
            Add
          </button>
        </div>
      </div>
      <div className="mb-10 divide-y divide-line rounded-xl border border-line bg-card">
        {categories?.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            budgetCents={budgetByCategory.get(category.id) ?? null}
          />
        ))}
      </div>

      <h2 className="mb-3 eyebrow">Rules</h2>
      {(rules?.length ?? 0) === 0 && (
        <p className="text-sm text-ink-3">
          No rules yet — create one from a transaction&apos;s category picker with “Always for…”.
        </p>
      )}
      <div className="divide-y divide-line rounded-xl border border-line bg-card">
        {rules?.map((rule) => {
          const category = categoryById.get(rule.category_id);
          return (
            <div key={rule.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm">
                “{rule.merchant_pattern}”{" "}
                <span className="text-ink-3">
                  ({rule.match_type}) → {category ? `${category.emoji} ${category.name}` : "?"}
                </span>
              </span>
              <button
                onClick={() => deleteRule.mutate(rule.id)}
                className="text-xs text-ink-3 hover:text-neg"
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
