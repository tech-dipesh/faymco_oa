import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import { loginSchema, validateBody } from '../validation/schemas.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.post('/login', validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body
    const {rows} = await pool.query(`select * from users where email = $1`, [email])
    const {result} = rows[0]

    if (!result || !(await bcrypt.compare(result, result.password_hash))) {
      return res.status(401).json({ error: 'invalid email or password' })
    }

    const token = jwt.sign(
      { id: result.id, role: result.role, email: result.email },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    )

    res.json({ token })
  })
)

export default router
