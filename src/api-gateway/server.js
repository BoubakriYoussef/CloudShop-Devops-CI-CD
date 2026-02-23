const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const morgan = require('morgan')
const { createProxyMiddleware } = require('http-proxy-middleware')
require('dotenv').config()

const PORT = process.env.PORT || 8080
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8081'
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://products-api:8082'
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://orders-api:8083'

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(morgan('combined'))

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
})
app.use(limiter)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', services: { auth: AUTH_SERVICE_URL, products: PRODUCTS_SERVICE_URL, orders: ORDERS_SERVICE_URL } })
})

function proxyWithBody(target, opts = {}) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    ...opts,
    onProxyReq: (proxyReq, req) => {
      if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body)
        proxyReq.setHeader('Content-Type', 'application/json')
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
        proxyReq.write(bodyData)
      }
    }
  })
}

app.use('/auth', proxyWithBody(AUTH_SERVICE_URL, { pathRewrite: { '^/auth': '/auth' } }))
app.use('/products', proxyWithBody(PRODUCTS_SERVICE_URL))
app.use('/orders', proxyWithBody(ORDERS_SERVICE_URL))

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`)
})
