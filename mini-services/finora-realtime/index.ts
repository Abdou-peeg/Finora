import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

/**
 * Finora Realtime Hub
 * --------------------
 * Room model: each tenant joins room `tenant:<tenantId>` so broadcast stays scoped.
 * Frontend payload includes tenantId which we use to scope room joining.
 *
 * Event channels:
 *  - client → server: 'subscribe'   { tenantId, userId, role }
 *  - server → client: 'notification' { type, title, message, level, ts }
 *  - server → client: 'entity:changed' { entity, action, id, tenantId }
 *  - server → client: 'cash:changed' { tenantId, balance }
 *  - server → client: 'stock:changed' { tenantId, productId, qty }
 */

io.on('connection', (socket) => {
  console.log(`[realtime] connected ${socket.id}`)

  socket.on('subscribe', (payload: { tenantId: string; userId?: string; role?: string }) => {
    if (!payload?.tenantId) return
    const room = `tenant:${payload.tenantId}`
    socket.join(room)
    socket.data.tenantId = payload.tenantId
    socket.data.userId = payload.userId
    socket.data.role = payload.role
    socket.emit('subscribed', { room, ts: new Date().toISOString() })
    console.log(`[realtime] ${socket.id} joined ${room} as ${payload.role}`)
  })

  // Server-to-server broadcast helper: REST API emits 'broadcast' events to us
  // via a local HTTP push (see lib/realtime-server.ts). They arrive here.
  socket.on('broadcast', (payload: { tenantId: string; event: string; data: any }) => {
    if (!payload?.tenantId) return
    const room = `tenant:${payload.tenantId}`
    io.to(room).emit(payload.event, { ...payload.data, _ts: Date.now() })
  })

  socket.on('disconnect', () => {
    console.log(`[realtime] disconnected ${socket.id}`)
  })

  socket.on('error', (err) => console.error(`[realtime] error ${socket.id}:`, err))
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[finora-realtime] WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => httpServer.close(() => process.exit(0)))
process.on('SIGINT', () => httpServer.close(() => process.exit(0)))
