# Low Level Design:
## 1. What it Does:
Sales through affiliate commissions will be shown as `pending`. When a sale is shown as `pending`,
the user will receive 10% commission on it. Next, the admin either resolves it as `approved` or `rejected`, and the user gets the remaining amount (commission advances are refunded in case of `rejected` sale). Users are allowed to withdraw the balance only once in 24 hours, and in case the operation fails on the payment side, then the money is refunded back to their balance for the next attempt.

- All is Simply Done with a Simple backend build on the Node Express with Bunjs, which communicate with Postgres from raw SQL.

## 2. All Entities:
**users** — the affiliate. Contains `withdrawable_balance` which is a rolling
number (a cached balance), and `last_withdrawal_at` used in the cooldown
check.

**sales** — one row per sale. Has its own state transition life cycle: `pending` =>
`approved`/`rejected`, and in addition to that whether the advance is paid (`advance_paid`,
`advance_amount`, `advance_paid_at`).

**withdrawals** — one row per withdrawal request. That's the thing that leaves
the system to the user's bank/UPI, and thus is the thing that may fail and require
recovery.

**payouts** — a ledger. Every balance transaction creates a new record in this table:
`advance` when the 10% is sent, `final` when the sale is approved and remaining
balance is paid, `adjustment` when the sale is rejected and the advance is clawed
back, `recovery` when the withdrawn funds are credited back due to failure.
That's the table that the user reads from when asking why their balance is X — it
isn't used for calculating the balance (see trade-offs).

## 3. Relationships
```
users (1) ───< sales (many)
users (1) ───< withdrawals (many)
users (1) ───< payouts (many)
sales (1) ───< payouts (many, type=advance/final/adjustment)
withdrawals (1) ───< payouts (many, type=recovery)
```
A payout dispute is associated with either a sale or a withdrawal but not both – and that’s why the `sale_id`/`withdrawal_id` nullable field pair exists on `payouts`.

## 4. Schema (see `src/schema.sql` for the SQL)
```
users
  id, name, email, password_hash, role, withdrawable_balance, last_withdrawal_at, created_at

sales
  id, user_id, brand, earning, status, advance_paid, advance_amount, advance_paid_at, reconciled_at, created_at

withdrawals
  id, user_id, amount, status, created_at, completed_at, failed_at

payouts
  id, user_id, sale_id, withdrawal_id, type, amount, created_at
```
Indexing is Also implemented for the faster read query with `sales(status, advance_paid)` and Also Where Clause on the job runs `payouts(userid) & withdrawls (user_id)`

## 5. Business rules:
### 5.1 Advance payout — 10% of every pending sale, exactly once
The Advance job (`POST /api/payouts/advance/run`) picks up every sale where the
status is `pending` but which is not yet `advance_paid`. The job then creates
its own transaction for each sale and runs `SELECT ... FOR UPDATE` on the
particular sale and checks the value of `advance_paid` inside the row lock
before doing anything else. This double-checking is precisely what makes the
job safe to be fired multiple times – once and again and again, from multiple
terminals, because the first instance wins the lock and all subsequent
invocations find `advance_paid = true` and skip it. One sale, one advance, for
sure.
### 5.2 Final payout:

`POST /api/admin/reconcile` takes an array of `{ saleId, status }`. Each sale
is handled in its own transaction (a mini saga) — if sale #7 in a batch of 50
fails for some reason, the other 49 still go through. For each sale:

- Lock the row, check it's still `pending` (if not, skip it and report why —
  no silently double-processing an already-reconciled sale).
- `approved` → final = `earning - advance_amount`, credited to the user.
- `rejected` → adjustment = `-advance_amount`, debited from the user (this
  is the money they were advanced but didn't earn).

This matches the worked example in the assignment exactly: three ₹40 sales,
₹4 advance each, one rejected and two approved → `-4 + 36 + 36 = 68`.

### 5.3 Withdraw Cooldown:
For `POST /api/withdrawals`, the user row is locked before the
comparison `last_withdrawal_at + 24h < now()` is done. If it's not yet past
that point, the request is declined with a `429` and the time to try again.
Locking the user row before checking it also ensures that if two
withdrawal requests are triggered simultaneously, only one of them will get
through — the second one will wait for the first one to complete and see
the updated `last_withdrawal_at` timestamp.

### 5.4 Failed payout recovery:
No payment gateway here either; failure is simulated via admin actions via
`POST /api/withdrawals/:id/fail`. It locks the withdrawal, verifies that its
status is still `processing` (no double-failure possible), sets its status
to `failed`, updates the `withdrawable_balance` right away, and records a
`recovery` entry in the payouts ledger. And it resets `last_withdrawal_at`
to `null` — if the withdrawal has failed, we don't want users to sit in
24-hour timeout for the funds they've never actually withdrawn.
It's a design decision, mentioned in trade-offs.

There's a corresponding `POST /api/withdrawals/:id/complete` endpoint for the
happy path too.
## 7. Edge cases:
- **Job running twice** — when running the job again, it will encounter `advance_paid = true` within the lock, and do nothing about this sale.
- **Processing a reconciled sale** — the `status != 'pending'` condition will notice it and report as skipped sale instead of double-payment.
- **Sale rejected with no advance ever paid before** — `advance_amount` is `null`, considered as 0. Adjustment is 0, no row created for ₹0 withdrawal.
- **10% rounded down to nearest whole paisa** — amounts like ₹33 are rounded down to ₹3.30 by `roundMoney`. This happens in all places where money gets calculated, so nothing slips into fractions of paisa.
- **Rejecting a sale after advance withdrawal** — it just makes the balance go into negative. It's deliberately possible (tradeoffs) and it automatically prevents any withdrawal since balance requirement is `balance >= amount`.
- **Two simultaneous withdrawal attempts** — row lock on `users` table serializes them; second request will read the balance/cooldown after the first transaction.
- **Withdrawal failure twice/recovery twice** — prevented by `status = 'processing'` check before failing it.

## 8. Trade-offs
**Single ledger table instead of three  tables.**  
A single `payouts` table with a `type` column would result in fewer tables, and balance histories can be achieved in one query rather than in `UNION` of three.

**Negative balances.**  
Allow `withdrawable_balance` to be negative. In case when the withdrawal happens prior to the sale failure, the reconciliation will result in a negative balance that means the user owes the system. The withdrawal lock condition (`balance >= amount`) automatically prevents any payouts till the obligation is cleared.

**Pessimistic locking (`SELECT ... FOR UPDATE`) instead of optimistic locking.**  
For money transfers, it is easier and more reliable to use pessimistic locking approach (locks wait) as opposed to optimistic one (retry in case of collision).

**Cached balance instead of ledger summing on read.** 
`users. withdrawable_balance` is a Physical field update during the same transcation as any other payout action, as opposed to being calculated from payouts on the fly, resulting in immediate reads, with all write paths thourhg a locked transcation.