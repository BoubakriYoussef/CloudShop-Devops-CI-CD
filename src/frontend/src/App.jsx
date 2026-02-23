import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { health } from './api.js'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Products from './pages/Products.jsx'
import Orders from './pages/Orders.jsx'

function RequireAuth({ children }) {
  const token = localStorage.getItem('cloudshop_token')
  if (!token) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    health()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('down'))
  }, [])

  return (
    <div className="app">
      <header>
        <div>
          <h1>CloudShop</h1>
          <p>API Gateway status: <strong>{status}</strong></p>
        </div>
        <nav className="nav">
          <NavLink to="/" end>Login</NavLink>
          <NavLink to="/register">Inscription</NavLink>
          <NavLink to="/products">Produits</NavLink>
          <NavLink to="/orders">Commandes</NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/products"
          element={
            <RequireAuth>
              <Products />
            </RequireAuth>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireAuth>
              <Orders />
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  )
}
