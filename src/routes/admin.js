import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { reconcileSchema, validateBody } from '../validation/schemas.js'
import { reconcileSales } from '../services/reconciliationService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.post( '/reconcile', requireAuth, requireAdmin, validateBody(reconcileSchema), asyncHandler(async (req, res) => {
    const summary = await reconcileSales(req.body.updates)
    res.json(summary)
  })
)

export default router
