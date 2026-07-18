# API Reference
Base URL: `http://localhost:3000/api`
All The Every Routes With Except Authoticatate: `/auth/login` rest needs a header.
Header Format: `Authorization: Bearer ${token}`

## Seeded Account With we can do: `bun seed`
- user: `john@example.com` / `password123`
- admin: `admin@example.com` / `admin123`


### POST /auth/login
```json
{ "email": "email@example.com", "password": "password123" }
```
→ `{ "token": "..." }`


### POST /sales
_auth: any user_
```json
{ "brand": "brand_1", "earning": 40 }
```
→ the created sale, `status: "pending"`

### GET /sales
_auth: any user_ — own sales for a regular user, all sales for an admin.


### POST /payouts/advance/run
_auth: admin_ — runs the advance payout job over every pending, unpaid sale.
```json
{ "processed": 3, "totalAmount": 12, "errors": [] }
```

### GET /payouts
_auth: any user_ — the payout ledger for the logged-in user
(`advance` / `final` / `adjustment` / `recovery` rows).

---

### POST /admin/reconcile
_auth: admin_
```json
{
  "updates": [
    { "saleId": "...", "status": "rejected" },
    { "saleId": "...", "status": "approved" },
    { "saleId": "...", "status": "approved" }
  ]
}
```
→
```json
{
  "processed": 3,
  "approved": 2,
  "rejected": 1,
  "totalFinalPayout": 72,
  "totalAdjustments": -4,
  "skipped": []
}
```

---

### POST /withdrawals
_auth: any user_
```json
{ "amount": 50 }
```
→ `201` with the withdrawal (`status: "processing"`), or:
- `429` if the 24 hour cooldown hasn't passed
- `400` if the balance is insufficient

### GET /withdrawals
_auth: any user_ — withdrawal history for the logged-in user.

### POST /withdrawals/:id/complete
_auth: admin_ — marks a processing withdrawal as completed.

### POST /withdrawals/:id/fail
_auth: admin_ — simulates a gateway failure/cancellation/rejection. Credits
the amount back to the user's balance, clears their cooldown, and logs a
`recovery` payout.

---

### GET /users/me/balance
_auth: any user_
```json
{
  "withdrawableBalance": "68.00",
  "lastWithdrawalAt": null,
  "canWithdraw": true,
  "cooldownRemainingMs": 0
}
```
