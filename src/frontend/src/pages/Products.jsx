import { useEffect, useState } from 'react'
import { createProduct, deleteProduct, listProducts } from '../api.js'

export default function Products() {
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0
  })

  async function refresh() {
    const items = await listProducts()
    setProducts(items)
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message))
  }, [])

  async function handleAddProduct(e) {
    e.preventDefault()
    setError('')
    try {
      await createProduct(productForm)
      setProductForm({ name: '', description: '', price: 0, stock: 0 })
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteProduct(id) {
    setError('')
    try {
      await deleteProduct(id)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="card">
      <h2>Produits</h2>
      {error && <div className="alert error">{error}</div>}
      <form className="grid" onSubmit={handleAddProduct}>
        <input
          type="text"
          placeholder="Nom"
          value={productForm.name}
          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Description"
          value={productForm.description}
          onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
        />
        <input
          type="number"
          placeholder="Prix"
          value={productForm.price}
          onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
        />
        <input
          type="number"
          placeholder="Stock"
          value={productForm.stock}
          onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
        />
        <button type="submit">Ajouter</button>
      </form>

      <div className="list">
        {products.map((p) => (
          <div key={p.id} className="item">
            <div>
              <strong>{p.name}</strong>
              <div className="muted">{p.description}</div>
              <div className="muted">{p.price} EUR • Stock {p.stock}</div>
            </div>
            <button onClick={() => handleDeleteProduct(p.id)}>Supprimer</button>
          </div>
        ))}
      </div>
    </section>
  )
}
