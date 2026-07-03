/**
 * Finora Realtime Bridge (server-side)
 * =====================================
 * Pushes notifications to connected clients via either:
 *  1. Supabase Realtime (preferred) — if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *  2. Local socket.io mini-service (fallback) — works out-of-the-box in the sandbox
 *
 * Channel model: each tenant has its own channel `tenant:<tenantId>` so broadcasts
 * stay scoped. Clients subscribe via Supabase Realtime channel API.
 *
 * To enable Supabase: add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to .env
 * To use local fallback: leave them unset (default sandbox behavior)
 */
import { getSupabaseServer } from "@/lib/supabase-server";

export interface NotifyPayload {
  tenantId: string;
  type:
    | "sale.created"
    | "sale.confirmed"
    | "purchase.created"
    | "purchase.confirmed"
    | "invoice.created"
    | "invoice.paid"
    | "cash.in"
    | "cash.out"
    | "stock.low"
    | "user.created"
    | "audit.logged"
    | "generic";
  title: string;
  message: string;
  level?: "info" | "success" | "warning" | "error";
  meta?: Record<string, any>;
}

const CHANNEL_PREFIX = "tenant:";

async function notifyViaSupabase(payload: NotifyPayload) {
  const sb = getSupabaseServer();
  if (!sb) return false;
  try {
    const channel = sb.channel(`${CHANNEL_PREFIX}${payload.tenantId}`);
    await channel.send({
      type: "broadcast",
      event: "notification",
      payload: { ...payload, ts: new Date().toISOString() },
    });
    await channel.send({
      type: "broadcast",
      event: "entity:changed",
      payload: {
        type: payload.type,
        tenantId: payload.tenantId,
        meta: payload.meta || {},
        ts: new Date().toISOString(),
      },
    });
    return true;
  } catch (e) {
    console.error("[realtime-supabase] broadcast failed:", e);
    return false;
  }
}

async function notifyViaSocketIO(payload: NotifyPayload) {
  try {
    const { io } = await import("socket.io-client");
    const sock = io("/?XTransformPort=3003", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 500,
      timeout: 4000,
    });
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), 2000);
      sock.once("connect", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    sock.emit("broadcast", {
      tenantId: payload.tenantId,
      event: "notification",
      data: { ...payload, ts: new Date().toISOString() },
    });
    sock.emit("broadcast", {
      tenantId: payload.tenantId,
      event: "entity:changed",
      data: {
        type: payload.type,
        tenantId: payload.tenantId,
        meta: payload.meta || {},
        ts: new Date().toISOString(),
      },
    });
    setTimeout(() => sock.disconnect(), 200);
  } catch (e) {
    console.error("[realtime-socketio] notify failed:", e);
  }
}

export async function notify(payload: NotifyPayload) {
  // Try Supabase first; if not configured, fall back to local WebSocket
  const sent = await notifyViaSupabase(payload);
  if (!sent) {
    await notifyViaSocketIO(payload);
  }
}
