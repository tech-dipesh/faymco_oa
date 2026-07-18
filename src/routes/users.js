import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import pool from '../db.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get( '/me/balance', requireAuth, asyncHandler(async (req, res) => {
    const result = await pool.query(
      `select withdrawable_balance, last_withdrawal_at from users where id = $1`,
      [req.user.id]
    )
    const user = result.rows[0]
    let cooldownRemainingMs = 0
    if (user.last_withdrawal_at) {
      const cooldownEnd = new Date(user.last_withdrawal_at)
      cooldownEnd.setHours(cooldownEnd.getHours() + 24)
      cooldownRemainingMs = Math.max(0, cooldownEnd - new Date())
    }

    res.json({
      withdrawableBalance: user.withdrawable_balance,
      lastWithdrawalAt: user.last_withdrawal_at,
      canWithdraw: cooldownRemainingMs === 0,
      cooldownRemainingMs
    })
  })
)

export default router
