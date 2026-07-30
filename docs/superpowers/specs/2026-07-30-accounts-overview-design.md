# Accounts overview: assets vs debt, drill-down transactions, credit utilization

Date: 2026-07-30

## Goal

Bring the Accounts area up to Copilot-parity (per reference screenshot):

1. `/accounts` opens with an assets-vs-debt overview (totals + history chart + time range).
2. Clicking an account shows that account's transactions on `/accounts/[id]`.
3. Credit accounts show a utilization percentage (balance / credit limit) in the
   list, on group totals, and on the detail page.

## What already exists (no backend changes)

- `GET /net-worth/history?days=N` (7–3650) returns `current_assets_cents`,
  `current_liabilities_cents`, `current_net_cents`, and a daily series with
  `assets_cents` / `liabilities_cents` / `net_cents` per point.
- `GET /transactions?account_id=<uuid>` already filters with keyset pagination,
  backed by the `(account_id, date)` index.
- `credit_limit_cents` is synced from Plaid on link + daily, and exposed on
  `AccountOut`. Plaid returns `null` limits for many issuers — utilization is
  simply omitted then.

## Frontend design

### Shared types (`src/lib/finance-types.ts`)

Hoist `Account` (full `AccountOut` shape) and `NetWorth`/`NetWorthPoint` here.
All three pages querying `["accounts"]` use the same type so the shared React
Query cache is honestly typed; dashboard imports `NetWorth` instead of its
inline copy.

### Overview hero (`/accounts`)

A `Card` at the top: two stat blocks (Assets with a `pos` dot, Debt with a
`neg` dot, `.figure` numerals), a new `AssetsDebtChart` (Recharts, two 2px
areas — assets in `pos`, debt in `neg`, hidden axes, mini-card tooltip showing
both values), and a range selector `1W / 1M / 3M / YTD / 1Y / ALL` mapping to
the `days` param (YTD = days since Jan 1, min 7; ALL = 3650).

Sections render in fixed order (credit, depository, investment, loan, other)
with a subtotal footer per group (hidden accounts excluded, matching net-worth
semantics). The credit group footer also shows aggregate utilization computed
over accounts that have a known limit.

### Utilization

- `src/lib/utilization.ts`: `utilizationPct(balance, limit)` → `null` when the
  limit is missing or ≤ 0; dot tone thresholds: `< 30%` → `pos`, `30–70%` →
  `warn`, `≥ 70%` → `neg`.
- New design token `--color-warn` (ochre, matches the banknote palette's
  `cat-2` ink) added to `globals.css` and documented in `frontend/AGENTS.md`.
  `pos`/`neg` stay reserved for money semantics; a near-limit card is genuine
  debt-risk, so `neg` is defensible there.
- `UtilizationBadge` component: moss pill, toned dot, percentage in neutral
  ink. Used on credit rows, the credit group footer, and the detail header.

### Account detail (`/accounts/[id]`)

- Header gains mask/institution, and for credit accounts with a limit:
  `balance / limit`, the badge, and a thin meter bar (`bg-moss` track, toned
  fill) — same meter pattern as the dashboard budget bar.
- Below the existing balance-history sparkline: the account's transactions via
  `useInfiniteQuery(["transactions", { accountId }])` with a Load-more button.
- Account data still comes from the cached `["accounts"]` list (cheap, already
  cached from the list page); no dedicated `GET /accounts/{id}` needed yet.

### Extraction for reuse (DRY)

`TransactionRow` and the day-grouped section rendering move out of
`transactions/page.tsx` into `src/components/TransactionRow.tsx` and
`src/components/TransactionList.tsx`. The row gets a `hideAccount` prop so the
account-detail page doesn't repeat the account name on every row. Optimistic
category edits keep working on both pages because the row's cache update
matches the `["transactions"]` key prefix.

## Error/empty handling

- No limit from Plaid → no badge, no meter (never show 0% as if known).
- `< 2` history points → chart renders its friendly empty state.
- Empty transaction list → "No transactions yet." line.

## Testing

No frontend test harness exists; verification is `tsc`/`next build` + lint,
plus manual visual check. Backend untouched.
