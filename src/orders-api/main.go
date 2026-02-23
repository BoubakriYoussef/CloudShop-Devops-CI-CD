package main

import (
  "context"
  "encoding/json"
  "log"
  "net/http"
  "os"
  "strconv"
  "time"

  "github.com/gorilla/mux"
  "github.com/jackc/pgx/v5/pgxpool"
)

type Order struct {
  ID        int     `json:"id"`
  ProductID string  `json:"product_id"`
  Quantity  int     `json:"quantity"`
  Status    string  `json:"status"`
  CreatedAt string  `json:"created_at"`
}

type OrderIn struct {
  ProductID string `json:"product_id"`
  Quantity  int    `json:"quantity"`
}

var pool *pgxpool.Pool

func main() {
  port := getenv("PORT", "8083")
  dbURL := getenv("DATABASE_URL", "postgresql://admin:changeme@postgres:5432/cloudshop")

  ctx := context.Background()
  var err error
  pool, err = pgxpool.New(ctx, dbURL)
  if err != nil {
    log.Fatal(err)
  }
  if err := initDB(ctx); err != nil {
    log.Fatal(err)
  }

  r := mux.NewRouter()
  r.HandleFunc("/health", healthHandler).Methods("GET")
  r.HandleFunc("/orders", listOrders).Methods("GET")
  r.HandleFunc("/orders", createOrder).Methods("POST")
  r.HandleFunc("/orders/{id}", getOrder).Methods("GET")
  r.HandleFunc("/orders/{id}", updateOrder).Methods("PUT")
  r.HandleFunc("/orders/{id}", deleteOrder).Methods("DELETE")

  srv := &http.Server{
    Addr:         ":" + port,
    Handler:      r,
    ReadTimeout:  5 * time.Second,
    WriteTimeout: 10 * time.Second,
  }

  log.Printf("Orders API running on port %s", port)
  log.Fatal(srv.ListenAndServe())
}

func initDB(ctx context.Context) error {
  _, err := pool.Exec(ctx, `
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      product_id TEXT NOT NULL,
      quantity INT NOT NULL,
      status TEXT NOT NULL DEFAULT 'created',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)
  return err
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
  ctx := r.Context()
  if err := pool.Ping(ctx); err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
  }
  json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func listOrders(w http.ResponseWriter, r *http.Request) {
  rows, err := pool.Query(r.Context(), "SELECT id, product_id, quantity, status, created_at FROM orders ORDER BY id DESC")
  if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
  }
  defer rows.Close()

  items := []Order{}
  for rows.Next() {
    var o Order
    var created time.Time
    if err := rows.Scan(&o.ID, &o.ProductID, &o.Quantity, &o.Status, &created); err != nil {
      http.Error(w, err.Error(), http.StatusInternalServerError)
      return
    }
    o.CreatedAt = created.Format(time.RFC3339)
    items = append(items, o)
  }
  json.NewEncoder(w).Encode(items)
}

func createOrder(w http.ResponseWriter, r *http.Request) {
  var payload OrderIn
  if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
    http.Error(w, "invalid json", http.StatusBadRequest)
    return
  }
  if payload.ProductID == "" || payload.Quantity <= 0 {
    http.Error(w, "product_id and quantity are required", http.StatusBadRequest)
    return
  }
  var id int
  err := pool.QueryRow(r.Context(),
    "INSERT INTO orders (product_id, quantity) VALUES ($1, $2) RETURNING id",
    payload.ProductID, payload.Quantity,
  ).Scan(&id)
  if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
  }
  w.WriteHeader(http.StatusCreated)
  json.NewEncoder(w).Encode(map[string]interface{}{"id": id, "product_id": payload.ProductID, "quantity": payload.Quantity, "status": "created"})
}

func getOrder(w http.ResponseWriter, r *http.Request) {
  id, err := strconv.Atoi(mux.Vars(r)["id"])
  if err != nil {
    http.Error(w, "invalid id", http.StatusBadRequest)
    return
  }
  var o Order
  var created time.Time
  err = pool.QueryRow(r.Context(),
    "SELECT id, product_id, quantity, status, created_at FROM orders WHERE id = $1",
    id,
  ).Scan(&o.ID, &o.ProductID, &o.Quantity, &o.Status, &created)
  if err != nil {
    http.Error(w, "not found", http.StatusNotFound)
    return
  }
  o.CreatedAt = created.Format(time.RFC3339)
  json.NewEncoder(w).Encode(o)
}

func updateOrder(w http.ResponseWriter, r *http.Request) {
  id, err := strconv.Atoi(mux.Vars(r)["id"])
  if err != nil {
    http.Error(w, "invalid id", http.StatusBadRequest)
    return
  }
  var payload OrderIn
  if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
    http.Error(w, "invalid json", http.StatusBadRequest)
    return
  }
  if payload.ProductID == "" || payload.Quantity <= 0 {
    http.Error(w, "product_id and quantity are required", http.StatusBadRequest)
    return
  }
  ct, err := pool.Exec(r.Context(),
    "UPDATE orders SET product_id=$1, quantity=$2 WHERE id=$3",
    payload.ProductID, payload.Quantity, id,
  )
  if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
  }
  if ct.RowsAffected() == 0 {
    http.Error(w, "not found", http.StatusNotFound)
    return
  }
  json.NewEncoder(w).Encode(map[string]interface{}{"id": id, "product_id": payload.ProductID, "quantity": payload.Quantity})
}

func deleteOrder(w http.ResponseWriter, r *http.Request) {
  id, err := strconv.Atoi(mux.Vars(r)["id"])
  if err != nil {
    http.Error(w, "invalid id", http.StatusBadRequest)
    return
  }
  ct, err := pool.Exec(r.Context(), "DELETE FROM orders WHERE id=$1", id)
  if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
  }
  if ct.RowsAffected() == 0 {
    http.Error(w, "not found", http.StatusNotFound)
    return
  }
  json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

func getenv(key, fallback string) string {
  if v := os.Getenv(key); v != "" {
    return v
  }
  return fallback
}
