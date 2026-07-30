export type Category = {
  id: string;
  name: string;
  emoji: string;
  is_income: boolean;
  exclude_from_budget: boolean;
  sort_order: number;
  is_system: boolean;
};

export type Transaction = {
  id: string;
  account_id: string;
  account_name: string;
  date: string;
  name: string;
  merchant_name: string | null;
  logo_url: string | null;
  amount_cents: number;
  currency: string;
  pending: boolean;
  category: Category | null;
  categorized_by: string;
  notes: string | null;
  excluded: boolean;
};

export type TransactionsPage = {
  transactions: Transaction[];
  next_cursor: string | null;
};
