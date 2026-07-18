import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { runAdvancePayoutJob, getPayoutsForUser } from '../services/payoutService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.post('/advance/run', requireAdmin, asyncHandler(async (req, res) => {
  const summary = await runAdvancePayoutJob()
    res.json(summary)
  })
)

router.get('/', asyncHandler(async (req, res) => {
  const payouts = await getPayoutsForUser(req.user.id)
    res.json({ payouts })
  })
)

export default router
