# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM golang:1.22-alpine AS server-builder
WORKDIR /src

RUN cat > main.go <<'EOF'
package main

import (
  "flag"
  "log"
  "net/http"
  "os"
  "path/filepath"
  "strings"
)

func main() {
  dir := flag.String("dir", "/www", "directory to serve")
  addr := flag.String("addr", ":8080", "listen address")
  flag.Parse()

  root := *dir
  fs := http.FileServer(http.Dir(root))

  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    path := strings.TrimPrefix(r.URL.Path, "/")
    if path == "" {
      path = "index.html"
    }

    fullPath := filepath.Join(root, filepath.Clean(path))
    if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
      fs.ServeHTTP(w, r)
      return
    }

    http.ServeFile(w, r, filepath.Join(root, "index.html"))
  })

  log.Printf("serving %s on %s", root, *addr)
  log.Fatal(http.ListenAndServe(*addr, nil))
}
EOF

RUN go build -o /out/server ./main.go

FROM scratch
COPY --from=server-builder /out/server /server
COPY --from=build /app/build /www

EXPOSE 8080
ENTRYPOINT ["/server", "-dir=/www"]
