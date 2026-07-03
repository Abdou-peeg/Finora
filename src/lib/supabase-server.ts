import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client.
 * Uses the service role key (server-only) to broadcast real-time events.
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env.
 * Returns null if not configured.
 */
let _client: SupabaseClient | null = null;
let _checked = false;

export function getSupabaseServer(): SupabaseClient | null {
  if (_checked) return _client;
  _checked = true;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !url.startsWith("http")) {
    return null;
  }
  try {
    _client = createClient(url, key, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
  } catch (e) {
    console.warn("[supabase-server] init failed:", e);
    _client = null;
  }
  return _client;
}

export function isSupabaseServerConfigured(): boolean {
  return getSupabaseServer() !== null;
}
