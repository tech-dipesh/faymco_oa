import pool from '../db.js'

export async function createSale(userId, brand, earning) {
  const result = await pool.query(
    `insert into sales (user_id, brand, earning) values ($1, $2, $3) returning *`,
    [userId, brand, earning]
  )
  return result.rows[0]
}

export async function getSalesForUser(userId) {
  const result = await pool.query(
    `select * from sales where user_id = $1 order by created_at desc`,
    [userId]
  )
  return result.rows
}

export async function getAllSales() {
  const result = await pool.query(`select * from sales order by created_at desc`)
  return result.rows
}
