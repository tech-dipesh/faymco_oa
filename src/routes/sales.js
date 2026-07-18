import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { createSaleSchema, validateBody } from '../validation/schemas.js'
import { createSale, getSalesForUser, getAllSales } from '../services/saleService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.post( '/', requireAuth, validateBody(createSaleSchema), asyncHandler(async (req, res) => {
    const sale = await createSale(req.user.id, req.body.brand, req.body.earning)
    res.status(201).json(sale)
  })
)

router.get( '/', requireAuth, asyncHandler(async (req, res) => {
    const sales = req.user.role === 'admin' ? await getAllSales() : await getSalesForUser(req.user.id)
    res.json({ sales })
  })
)

export default router
