# copilot.money

Personal finance management app. Users connect bank accounts via Plaid; the app tracks transactions, budgets, and spending.

## Structure

- `frontend/` — Next.js (TypeScript). Has its own `AGENTS.md` — read it before working there.
- `backend/` — Python 3.13, FastAPI + uvicorn, managed with `uv` (run things with `uv run`, add deps with `uv add`).
- Database: Postgres (async access via `asyncpg`).

## Deployment

Railway project `copilot-money`, two services deployed from this repo via GitHub CI/CD:

- `backend` — FastAPI via `uvicorn main:app` (config in `backend/railway.json`), routes under `/api/backend/*`, health check at `/api/backend/health`.
- `frontend` — Next.js.

Local dev needs both processes: `uv run uvicorn main:app --port 8000 --reload` in `backend/` (env from root `.env`) and `npm run dev` in `frontend/` — the frontend proxy targets `localhost:8000` locally via `BACKEND_INTERNAL_URL` in `frontend/.env.local`.

The frontend talks to the backend only through its Next.js proxy route over Railway's private network (`http://backend.railway.internal`) with a shared `BACKEND_API_TOKEN` bearer secret; the browser never calls FastAPI directly. The backend's public domain exposes only the health check and Plaid webhooks. `railway up` from `backend/` or `frontend/` deploys that service directly; pushing to `main` deploys both.

## Engineering principles

These apply to all code in this repo, human- or AI-written.

1. **DRY.** Before writing new code, look for existing code that does the same thing and reuse or extend it. Duplication is a bug waiting to diverge.
2. **Modular, single-purpose units.** Small functions and modules with one clear job and clear boundaries. If a function needs "and" to describe it, split it.
3. **No hacky behavior.** No monkey-patching, no swallowing exceptions to make errors go away, no sleep-based race fixes, no hardcoded values that belong in config, no dead code left "just in case". If the clean fix is bigger than the task at hand, say so instead of shipping the hack.
4. **Comments are a smell.** If a block needs several comments to justify what it's doing, the code is probably wrong — rewrite it to be self-explanatory. The only good comment states a constraint the code can't express (a gotcha, an external requirement), not what the next line does.
5. **Fail loudly and early.** Validate inputs at the boundary, raise on impossible states, and let errors propagate to a handler that can actually deal with them. This is a finance app — silent data corruption is the worst failure mode.
6. **Types everywhere.** Full TypeScript types on the frontend, type hints + Pydantic models on the backend. No `any` / untyped dicts crossing module boundaries.
7. **Simple over clever.** Prefer the boring, obvious implementation. Optimize only with evidence.
8. **Leave it better.** Match the style of the surrounding code; if you touch something broken, fix it or flag it — don't code around it.

## Money-specific rules

- Never represent money as floats. Use integer cents (or `Decimal` in Python) end to end.
- Plaid credentials and all secrets live in environment variables, never in code or commits.
- Treat all financial data as sensitive: no logging of account numbers, tokens, or transaction details beyond what debugging strictly requires.
