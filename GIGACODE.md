# Project Rules

## Save files — no silent changes

- **NEVER** modify `save.ts`, `remote.ts`, or any file that reads/writes game state without explicitly asking me first.
- When adding features that could affect save/load, **always mention it** and ask confirmation before touching any save-related code.
- When `?cheat` is in the URL — **no saves at all** (local, cloud, remote). Cheat mode is strictly localhost-only.

## Economy — do not change without explicit permission

- **NEVER** change costs, multipliers, bonuses, or any numbers related to the economy (`economy.ts`, any cost-related logic) without my explicit request and confirmation.
- This includes room costs, department costs, item costs, multipliers like `levelCostMult`, `company().costMult`, stall costs, etc.
- If a feature you're implementing would require economy changes, **describe the numbers you plan to use** and ask me to confirm before touching the code.
