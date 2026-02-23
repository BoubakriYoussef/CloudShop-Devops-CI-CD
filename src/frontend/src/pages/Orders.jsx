import { useEffect, useState } from 'react'
import { createOrder, listOrders } from '../api.js'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [orderForm, setOrderForm] = useState({
    product_id: '',
    quantity: 1
  })

  async function refresh() {
    const items = await listOrders()
    setOrders(items)
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message))
  }, [])

  async function handleAddOrder(e) {
    e.preventDefault()
    setError('')
    try {
      await createOrder({ product_id: orderForm.product_id, quantity: Number(orderForm.quantity) })
      setOrderForm({ product_id: '', quantity: 1 })
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="card">
      <h2>Commandes</h2>
      {error && <div className="alert error">{error}</div>}
      <form className="grid" onSubmit={handleAddOrder}>
        <input
          type="text"
          placeholder="Product ID"
          value={orderForm.product_id}
          onChange={(e) => setOrderForm({ ...orderForm, product_id: e.target.value })}
        />
        <input
          type="number"
          placeholder="Quantite"
          value={orderForm.quantity}
          onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
        />
        <button type="submit">Passer commande</button>
      </form>

      <div className="list">
        {orders.map((o) => (
          <div key={o.id} className="item">
            <div>
              <strong>Commande #{o.id}</strong>
              <div className="muted">Product: {o.product_id}</div>
              <div className="muted">Quantite: {o.quantity}</div>
              <div className="muted">Statut: {o.status}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
