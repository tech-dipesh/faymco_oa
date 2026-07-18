import { readFileSync } from 'fs'
import pool from './db.js'

async function migrate() {
  try {
    const sql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
    await pool.query(sql)
    console.log('migration complete')
    process.exit(0)
  }
  catch (err) {
    console.log(err);
    process.exit(0)
  }
}

migrate()
 