import pool, { withTransaction } from '../db.js'
import { roundMoney } from '../utils/money.js'

export async function runAdvancePayoutJob() {
  const pendingSales = await pool.query(
    `select id from sales where status = 'pending' and advance_paid = false`
  )

  let processed = 0
  let totalAmount = 0
  const errors = []

  for (const row of pendingSales.rows) {
    try {
      const advanceAmount = await withTransaction(async (client) => {
        const lockedResult = await client.query(
          `select * from sales where id = $1 for update`,
          [row.id]
        )
        const sale = lockedResult.rows[0]

        if (!sale || sale.advance_paid || sale.status !== 'pending') {
          return 0
        }

        const amount = roundMoney(Number(sale.earning) * 0.1)

        await client.query(
          `update sales set advance_paid = true, advance_amount = $1, advance_paid_at = now() where id = $2`,
          [amount, sale.id]
        )
        await client.query(
          `update users set withdrawable_balance = withdrawable_balance + $1 where id = $2`,
          [amount, sale.user_id]
        )
        await client.query(
          `insert into payouts (user_id, sale_id, type, amount) values ($1, $2, 'advance', $3)`,
          [sale.user_id, sale.id, amount]
        )

        return amount
      })

      if (advanceAmount > 0) {
        processed += 1
        totalAmount = roundMoney(totalAmount + advanceAmount)
      }
    } catch (error) {
      errors.push({ saleId: row.id, message: error.message })
    }
  }

  return { processed, totalAmount, errors }
}

export async function getPayoutsForUser(userId) {
  const result = await pool.query(
    `select * from payouts where user_id = $1 order by created_at desc`,
    [userId]
  )
  return result.rows
}
