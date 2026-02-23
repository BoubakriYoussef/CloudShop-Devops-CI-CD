import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, REGISTRY

try:
    from elasticsearch import Elasticsearch
except Exception:
    Elasticsearch = None

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://admin:changeme@postgres:5432/cloudshop')
ELASTICSEARCH_URL = os.getenv('ELASTICSEARCH_URL')
PORT = int(os.getenv('PORT', '8082'))

app = FastAPI()

pool = SimpleConnectionPool(1, 10, dsn=DATABASE_URL)

def init_db():
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS products (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    price NUMERIC(10,2) NOT NULL,
                    stock INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                );
                """
            )
            conn.commit()
    finally:
        pool.putconn(conn)

es_client = None
if ELASTICSEARCH_URL and Elasticsearch:
    es_client = Elasticsearch(ELASTICSEARCH_URL)

class ProductIn(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock: int = 0

class ProductOut(ProductIn):
    id: int

@app.on_event('startup')
def on_startup():
    init_db()

@app.get('/health')
def health():
    try:
        conn = pool.getconn()
        with conn.cursor() as cur:
            cur.execute('SELECT 1')
            cur.fetchone()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        if 'conn' in locals():
            pool.putconn(conn)
    es_ok = None
    if es_client:
        try:
            es_ok = es_client.ping()
        except Exception:
            es_ok = False
    return {"status": "ok", "elasticsearch": es_ok}

@app.get('/metrics')
def metrics():
    return Response(generate_latest(REGISTRY), media_type=CONTENT_TYPE_LATEST)

@app.get('/products', response_model=List[ProductOut])
def list_products():
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT id, name, description, price, stock FROM products ORDER BY id DESC')
            rows = cur.fetchall()
        return [
            {"id": r[0], "name": r[1], "description": r[2], "price": float(r[3]), "stock": r[4]}
            for r in rows
        ]
    finally:
        pool.putconn(conn)

@app.post('/products', response_model=ProductOut, status_code=201)
def create_product(payload: ProductIn):
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                'INSERT INTO products (name, description, price, stock) VALUES (%s, %s, %s, %s) RETURNING id',
                (payload.name, payload.description, payload.price, payload.stock)
            )
            pid = cur.fetchone()[0]
            conn.commit()
        product = {"id": pid, **payload.dict()}
        if es_client:
            try:
                es_client.index(index='products', id=pid, document=product)
            except Exception:
                pass
        return product
    finally:
        pool.putconn(conn)

@app.get('/products/{product_id}', response_model=ProductOut)
def get_product(product_id: int):
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT id, name, description, price, stock FROM products WHERE id = %s', (product_id,))
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail='product not found')
        return {"id": row[0], "name": row[1], "description": row[2], "price": float(row[3]), "stock": row[4]}
    finally:
        pool.putconn(conn)

@app.put('/products/{product_id}', response_model=ProductOut)
def update_product(product_id: int, payload: ProductIn):
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                'UPDATE products SET name=%s, description=%s, price=%s, stock=%s WHERE id=%s',
                (payload.name, payload.description, payload.price, payload.stock, product_id)
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail='product not found')
            conn.commit()
        product = {"id": product_id, **payload.dict()}
        if es_client:
            try:
                es_client.index(index='products', id=product_id, document=product)
            except Exception:
                pass
        return product
    finally:
        pool.putconn(conn)

@app.delete('/products/{product_id}')
def delete_product(product_id: int):
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM products WHERE id = %s', (product_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail='product not found')
            conn.commit()
        if es_client:
            try:
                es_client.delete(index='products', id=product_id)
            except Exception:
                pass
        return {"status": "deleted"}
    finally:
        pool.putconn(conn)

@app.get('/products/search', response_model=List[ProductOut])
def search_products(q: str):
    if es_client:
        try:
            res = es_client.search(index='products', query={"multi_match": {"query": q, "fields": ["name", "description"]}})
            hits = res.get('hits', {}).get('hits', [])
            results = [h.get('_source') for h in hits]
            return results
        except Exception:
            pass

    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id, name, description, price, stock FROM products WHERE name ILIKE %s OR description ILIKE %s',
                (f'%{q}%', f'%{q}%')
            )
            rows = cur.fetchall()
        return [
            {"id": r[0], "name": r[1], "description": r[2], "price": float(r[3]), "stock": r[4]}
            for r in rows
        ]
    finally:
        pool.putconn(conn)
