import { useState } from 'react'
import { register } from '../api.js'

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await register({ email: form.email, password: form.password, name: form.name })
      setMessage('Compte créé. Vous pouvez vous connecter.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="card">
      <h2>Inscription</h2>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <form className="grid" onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Nom"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
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
        <button type="submit">Creer un compte</button>
      </form>
    </section>
  )
}
