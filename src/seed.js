import bcrypt from 'bcryptjs'
import pool from './db.js'

async function seed() {
  const userPasswordHash = await bcrypt.hash('password123', 10)
  const adminPasswordHash = await bcrypt.hash('admin123', 10)

  await pool.query(
    `insert into users (name, email, password_hash, role)
     values ($1, $2, $3, 'user')
     on conflict (email) do nothing`,
    ['John Doe', 'john@example.com', userPasswordHash]
  )

  await pool.query(
    `insert into users (name, email, password_hash, role)
     values ($1, $2, $3, 'admin')
     on conflict (email) do nothing`,
    ['Admin', 'admin@example.com', adminPasswordHash]
  )

  const johnResult = await pool.query(`select id from users where email = 'john@example.com'`)
  const john = johnResult.rows[0]

  await pool.query(
    `insert into sales (user_id, brand, earning)
     values ($1, 'brand_1', 40), ($1, 'brand_1', 40), ($1, 'brand_1', 40)`,
    [john.id]
  )

  console.log('seed complete')
  console.log('user login  -> john@example.com / password123')
  console.log('admin login -> admin@example.com / admin123')
  process.exit(0)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
