import type { Category, Transaction } from "@/lib/finance-types";

export type BudgetCategorySummary = {
  category: Category;
  budget_cents: number | null;
  spent_cents: number;
};

export type BudgetSummary = {
  month: string;
  income_cents: number;
  total_budget_cents: number;
  total_spent_cents: number;
  categories: BudgetCategorySummary[];
};

export type CashflowMonth = {
  month: string;
  income_cents: number;
  expense_cents: number;
  net_cents: number;
};

export type TransactionsPageData = {
  transactions: Transaction[];
  next_cursor: string | null;
};
