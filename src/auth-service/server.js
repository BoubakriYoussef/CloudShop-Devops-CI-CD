const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { Pool } = require('pg')
const morgan = require('morgan')
require('dotenv').config()

const PORT = process.env.PORT || 8081
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://admin:changeme@postgres:5432/cloudshop'
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-change-in-prod'

const pool = new Pool({ connectionString: DATABASE_URL })

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)
}

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use(morgan('combined'))

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message })
  }
})

app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {}
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, name are required' })
  }
  try {
    const hash = await bcrypt.hash(password, 10)
    const result = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, name, hash]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'email already exists' })
    }
    res.status(500).json({ error: err.message })
  }
})

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    const user = result.rows[0]
    if (!user) {
      return res.status(401).json({ error: 'invalid credentials' })
    }
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return res.status(401).json({ error: 'invalid credentials' })
    }
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '2h' })
    res.json({ token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'missing token' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch (err) {
    res.status(401).json({ error: 'invalid token' })
  }
}

app.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [req.user.sub])
    const user = result.rows[0]
    if (!user) return res.status(404).json({ error: 'user not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`))
  })
  .catch((err) => {
    console.error('Failed to init DB', err)
    process.exit(1)
  })
