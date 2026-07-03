"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from env.
 * Returns null if credentials are missing — callers should check and fall back
 * to the local WebSocket realtime layer.
 *
 * Enable by adding to .env:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
 */
let _client: SupabaseClient | null = null;
let _checked = false;

export function getSupabaseClient(): SupabaseClient | null {
  if (_checked) return _client;
  _checked = true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !url.startsWith("http")) {
    return null;
  }
  try {
    _client = createClient(url, key, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
    console.info("[supabase] client initialized for", url);
  } catch (e) {
    console.warn("[supabase] failed to init client:", e);
    _client = null;
  }
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}
