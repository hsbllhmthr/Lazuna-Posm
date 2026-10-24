import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.resolve(__dirname, 'node_modules/.cache')
const CACHE_FILE = path.resolve(CACHE_DIR, 'lazuna-realtime.json')

function loadRealtimeCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
    }
  } catch (e) {}
  return { notifications: [], updatedStores: {}, deletedStoreIds: [] }
}

function saveRealtimeCache(data) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true })
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data), 'utf-8')
  } catch (e) {}
}

function lazunaRealtimePlugin() {
  let state = loadRealtimeCache()
  const clients = new Set()

  const broadcast = (payload) => {
    const msg = `data: ${JSON.stringify(payload)}\n\n`
    for (const res of clients) {
      try {
        res.write(msg)
      } catch (e) {
        clients.delete(res)
      }
    }
  }

  return {
    name: 'lazuna-realtime-sync',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next()

        // 1. Server-Sent Events (SSE) stream for cross-browser / Incognito realtime sync
        if (req.url.startsWith('/api/realtime-stream') && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          })
          res.write(`data: ${JSON.stringify({ eventType: 'INIT', state })}\n\n`)
          clients.add(res)
          req.on('close', () => {
            clients.delete(res)
          })
          return
        }

        // 2. GET shared realtime state
        if (req.url.startsWith('/api/realtime') && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(state))
          return
        }

        // 3. POST update to shared state & broadcast to all connected browsers
        if (req.url.startsWith('/api/realtime') && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}')

              if (data.notification && data.notification.id) {
                const map = new Map()
                const incoming = [data.notification, ...(state.notifications || [])]
                incoming.forEach((item) => {
                  if (!item || !item.id) return
                  const existing = map.get(item.id)
                  if (existing) {
                    const readBy = Array.from(new Set([...(existing.readBy || []), ...(item.readBy || [])]))
                    const clearedBy = Array.from(new Set([...(existing.clearedBy || []), ...(item.clearedBy || [])]))
                    map.set(item.id, { ...existing, ...item, readBy, clearedBy })
                  } else {
                    map.set(item.id, {
                      ...item,
                      readBy: Array.isArray(item.readBy) ? item.readBy : [],
                      clearedBy: Array.isArray(item.clearedBy) ? item.clearedBy : []
                    })
                  }
                })
                state.notifications = Array.from(map.values())
                  .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
                  .slice(0, 15)
              }

              if (Array.isArray(data.notifications)) {
                const map = new Map()
                ;[...data.notifications, ...(state.notifications || [])].forEach((item) => {
                  if (!item || !item.id) return
                  const existing = map.get(item.id)
                  if (existing) {
                    const readBy = Array.from(new Set([...(existing.readBy || []), ...(item.readBy || [])]))
                    const clearedBy = Array.from(new Set([...(existing.clearedBy || []), ...(item.clearedBy || [])]))
                    map.set(item.id, { ...existing, ...item, readBy, clearedBy })
                  } else {
                    map.set(item.id, item)
                  }
                })
                state.notifications = Array.from(map.values())
                  .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
                  .slice(0, 15)
              }

              if (data.syncPayload) {
                const { action, store, storeId } = data.syncPayload
                if (!state.updatedStores) state.updatedStores = {}
                if (!Array.isArray(state.deletedStoreIds)) state.deletedStoreIds = []

                if (action === 'save' && store) {
                  const key = String(store.id || store.c).toLowerCase()
                  state.updatedStores[key] = store
                  state.deletedStoreIds = state.deletedStoreIds.filter((id) => id !== key)
                } else if (action === 'delete' && storeId) {
                  const key = String(storeId).toLowerCase()
                  delete state.updatedStores[key]
                  if (!state.deletedStoreIds.includes(key)) {
                    state.deletedStoreIds.push(key)
                  }
                }
              }

              saveRealtimeCache(state)
              broadcast({
                eventType: data.eventType || 'NOTIF_AND_SYNC',
                notification: data.notification || null,
                syncPayload: data.syncPayload || null,
                notifications: state.notifications
              })

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: true, state }))
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: err.message }))
            }
          })
          return
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    lazunaRealtimePlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'firebase',
              test: /node_modules[\\/]@?firebase/,
            },
            {
              name: 'vendor',
              test: /node_modules/,
            },
          ],
        },
      },
    },
  },
})
