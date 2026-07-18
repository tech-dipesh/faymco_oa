import pool, { withTransaction } from '../db.js'
// I'm Adding  a total Cooldown Hours which is a 1 day with adding a Fallback on everywhere.
const cooldownHours = 24

export async function requestWithdrawal(userId, amount) {
  return withTransaction(async (client) => {
    const userResult = await client.query(`select * from users where id = $1 for update`, [userId])
    const user = userResult.rows[0]

    if (user.last_withdrawal_at) {
      const cooldownEnd = new Date(user.last_withdrawal_at)
      cooldownEnd.setHours(cooldownEnd.getHours() + cooldownHours)
      if (new Date() < cooldownEnd) {
        const error = new Error('withdrawal cooldown active, only one withdrawal every 24 hours')
        error.status = 429
        error.details = { nextWithdrawalAt: cooldownEnd }
        throw error
      }
    }

    if (Number(user.withdrawable_balance) < amount) {
      const error = new Error('insufficient balance')
      error.status = 400
      error.details = { requested: amount, available: user.withdrawable_balance }
      throw error
    }

    await client.query(
      `update users set withdrawable_balance = withdrawable_balance - $1, last_withdrawal_at = now() where id = $2`,
      [amount, userId]
    )

    const withdrawalResult = await client.query(
      `insert into withdrawals (user_id, amount) values ($1, $2) returning *`,
      [userId, amount]
    )

    return withdrawalResult.rows[0]
  })
}

export async function completeWithdrawal(withdrawalId) {
  return withTransaction(async (client) => {
    const withdrawal = await lockProcessingWithdrawal(client, withdrawalId)

    const updated = await client.query(
      `update withdrawals set status = 'completed', completed_at = now() where id = $1 returning *`,
      [withdrawal.id]
    )
    return updated.rows[0]
  })
}

export async function failWithdrawal(withdrawalId) {
  return withTransaction(async (client) => {
    const withdrawal = await lockProcessingWithdrawal(client, withdrawalId)

    await client.query(
      `update withdrawals set status = 'failed', failed_at = now() where id = $1`,
      [withdrawal.id]
    )

    await client.query(
      `update users set withdrawable_balance = withdrawable_balance + $1, last_withdrawal_at = null where id = $2`,
      [withdrawal.amount, withdrawal.user_id]
    )

    await client.query(
      `insert into payouts (user_id, withdrawal_id, type, amount) values ($1, $2, 'recovery', $3)`,
      [withdrawal.user_id, withdrawal.id, withdrawal.amount]
    )

    return { withdrawalId: withdrawal.id, creditedBack: withdrawal.amount }
  })
}

async function lockProcessingWithdrawal(client, withdrawalId) {
  const result = await client.query(`select * from withdrawals where id = $1 for update`, [withdrawalId])
  const withdrawal = result.rows[0]

  if (!withdrawal) {
    const error = new Error('withdrawal not found')
    error.status = 404
    throw error
  }
  if (withdrawal.status !== 'processing') {
    const error = new Error('withdrawal is not in a processing state')
    error.status = 409
    throw error
  }

  return withdrawal
}

export async function getWithdrawalsForUser(userId) {
  const result = await pool.query(
    `select * from withdrawals where user_id = $1 order by created_at desc`,
    [userId]
  )
  return result.rows
}
