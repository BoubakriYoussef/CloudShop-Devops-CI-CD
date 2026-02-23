import { useState } from 'react'
import { login, me } from '../api.js'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [user, setUser] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const data = await login({ email: form.email, password: form.password })
      localStorage.setItem('cloudshop_token', data.token)
      const profile = await me(data.token)
      setUser(profile)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="card">
      <h2>Connexion</h2>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <form className="grid" onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button type="submit">Se connecter</button>
      </form>

      {user && (
        <div className="info">
          Connecte en tant que <strong>{user.email}</strong>
        </div>
      )}
    </section>
  )
}
