import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { withdrawalSchema, validateBody } from '../validation/schemas.js'
import { requestWithdrawal, completeWithdrawal, failWithdrawal, getWithdrawalsForUser } from '../services/withdrawalService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.post('/', requireAuth, validateBody(withdrawalSchema), asyncHandler(async (req, res) => {
    const withdrawal = await requestWithdrawal(req.user.id, req.body.amount)
    res.status(201).json(withdrawal)
  })
)

router.get('/', requireAuth, asyncHandler(async (req, res) => {
    const withdrawals = await getWithdrawalsForUser(req.user.id)
    res.json({ withdrawals })
  })
)

router.post('/:id/complete', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const withdrawal = await completeWithdrawal(req.params.id)
    res.json(withdrawal)
  })
)

router.post('/:id/fail', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const result = await failWithdrawal(req.params.id)
    res.json(result)
  })
)

export default router
