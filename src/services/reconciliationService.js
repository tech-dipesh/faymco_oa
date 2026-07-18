import { withTransaction } from '../db.js'
import { roundMoney } from '../utils/money.js'

export async function reconcileSales(updates) {
  let approved = 0
  let rejected = 0
  let totalFinalPayout = 0
  let totalAdjustments = 0
  const skipped = []

  for (const update of updates) {
    const outcome = await withTransaction(async (client) => {
      const lockedResult = await client.query(
        `select * from sales where id = $1 for update`,
        [update.saleId]
      )
      const sale = lockedResult.rows[0]

      if (!sale) {
        return { skipped: { saleId: update.saleId, reason: 'sale not found' } }
      }
      if (sale.status !== 'pending') {
        return { skipped: { saleId: update.saleId, reason: 'sale already reconciled' } }
      }

      await client.query(
        `update sales set status = $1, reconciled_at = now() where id = $2`,
        [update.status, sale.id]
      )

      const advancePaid = sale.advance_amount ? Number(sale.advance_amount) : 0

      if (update.status === 'approved') {
        const finalAmount = roundMoney(Number(sale.earning) - advancePaid)
        if (finalAmount !== 0) {
          await client.query(
            `update users set withdrawable_balance = withdrawable_balance + $1 where id = $2`,
            [finalAmount, sale.user_id]
          )
          await client.query(
            `insert into payouts (user_id, sale_id, type, amount) values ($1, $2, 'final', $3)`,
            [sale.user_id, sale.id, finalAmount]
          )
        }
        return { approved: true, amount: finalAmount }
      }

      const adjustment = roundMoney(-advancePaid)
      if (adjustment !== 0) {
        await client.query(
          `update users set withdrawable_balance = withdrawable_balance + $1 where id = $2`,
          [adjustment, sale.user_id]
        )
        await client.query(
          `insert into payouts (user_id, sale_id, type, amount) values ($1, $2, 'adjustment', $3)`,
          [sale.user_id, sale.id, adjustment]
        )
      }
      return { rejected: true, amount: adjustment }
    })

    if (outcome.skipped) {
      skipped.push(outcome.skipped)
      continue
    }
    if (outcome.approved) {
      approved += 1
      totalFinalPayout = roundMoney(totalFinalPayout + outcome.amount)
    }
    if (outcome.rejected) {
      rejected += 1
      totalAdjustments = roundMoney(totalAdjustments + outcome.amount)
    }
  }

  return {
    processed: updates.length - skipped.length,
    approved,
    rejected,
    totalFinalPayout,
    totalAdjustments,
    skipped
  }
}
