"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface RealtimeNotification {
  type: string;
  title: string;
  message: string;
  level: "info" | "success" | "warning" | "error";
  ts: string;
  meta?: Record<string, any>;
}

/**
 * Realtime hook.
 *
 * - If NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are set,
 *   subscribes to the Supabase Realtime channel `tenant:<tenantId>`.
 * - Otherwise, falls back to the local socket.io mini-service (port 3003).
 *
 * Returns: { connected, notifications, lastEvent }
 */
export function useRealtime(tenantId?: string, userId?: string, role?: string) {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [lastEvent, setLastEvent] = useState<any>(null);
  // Detect channel type once (lazy initializer — does not re-run on every render)
  const [channel] = useState<"supabase" | "socketio" | null>(() => {
    if (typeof window === "undefined") return null; // SSR guard
    return getSupabaseClient() ? "supabase" : "socketio";
  });
  const socketRef = useRef<Socket | null>(null);
  const sbChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    if (channel === "supabase") {
      const sb = getSupabaseClient();
      if (!sb) return;
      // ── Supabase Realtime path ──────────────────────────────────────────
      const ch = sb.channel(`tenant:${tenantId}`, {
        config: { broadcast: { self: false }, presence: { key: userId || "anon" } },
      });

      ch.on("broadcast", { event: "notification" }, (msg: any) => {
        const n = msg.payload as RealtimeNotification;
        if (n) setNotifications((prev) => [n, ...prev].slice(0, 50));
      });
      ch.on("broadcast", { event: "entity:changed" }, (msg: any) => {
        setLastEvent(msg.payload);
      });

      ch.subscribe((status: string) => {
        setConnected(status === "SUBSCRIBED");
      });

      sbChannelRef.current = ch;
      return () => {
        sb.removeChannel(ch);
        sbChannelRef.current = null;
      };
    }

    // ── Local socket.io fallback ─────────────────────────────────────────
    const sock = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socketRef.current = sock;

    sock.on("connect", () => {
      setConnected(true);
      sock.emit("subscribe", { tenantId, userId, role });
    });
    sock.on("disconnect", () => setConnected(false));
    sock.on("notification", (n: RealtimeNotification) => {
      setNotifications((prev) => [n, ...prev].slice(0, 50));
    });
    sock.on("entity:changed", (e: any) => setLastEvent(e));

    return () => {
      sock.disconnect();
      socketRef.current = null;
    };
  }, [tenantId, userId, role, channel]);

  return { connected, notifications, lastEvent, channel, socketRef };
}
