export type Account = {
  id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  currency: string;
  current_balance_cents: number | null;
  available_balance_cents: number | null;
  credit_limit_cents: number | null;
  balance_as_of: string | null;
  is_hidden: boolean;
  institution_name: string | null;
};

export type AccountsResponse = {
  accounts: Account[];
};

export type NetWorthPoint = {
  date: string;
  assets_cents: number;
  liabilities_cents: number;
  net_cents: number;
};

export type NetWorth = {
  current_assets_cents: number;
  current_liabilities_cents: number;
  current_net_cents: number;
  series: NetWorthPoint[];
};

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
