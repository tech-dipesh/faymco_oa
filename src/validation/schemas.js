import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export const createSaleSchema = z.object({
  brand: z.string().min(1),
  earning: z.number().positive()
})

export const reconcileSchema = z.object({
  updates: z
    .array(
      z.object({
        saleId: z.string().uuid(),
        status: z.enum(['approved', 'rejected'])
      })
    )
    .min(1)
})

export const withdrawalSchema = z.object({
  amount: z.number().positive()
})

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: 'validation failed', details: result.error.flatten() })
    }
    req.body = result.data
    next()
  }
}
