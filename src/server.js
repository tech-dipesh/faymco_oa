import express from 'express'
import authRoutes from './routes/auth.js'
import saleRoutes from './routes/sales.js'
import payoutRoutes from './routes/payouts.js'
import withdrawalRoutes from './routes/withdrawals.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/users.js'
import { requireAuth } from './middleware/auth.js'

const app = express()
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/sales', saleRoutes)
app.use('/api/payouts', requireAuth, payoutRoutes)
app.use('/api/withdrawals', withdrawalRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/users', userRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'route not found' })
})

app.use((error, req, res, next) => {
  console.error(error)
  res.status(error.status || 500).json({ error: error.message || 'something went wrong', details: error.details })
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`payout system running on port ${port}`)
})
