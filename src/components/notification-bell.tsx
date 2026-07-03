"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { RealtimeNotification } from "@/hooks/use-realtime";

const ICONS: Record<string, any> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const COLORS: Record<string, string> = {
  info: "text-sky-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-rose-500",
};

export function NotificationBell({ notifications }: { notifications: RealtimeNotification[] }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const unread = Math.max(0, notifications.length - seen);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Mark all current notifications as seen whenever the dropdown is opened
  // (captured at the moment of opening via event handler below — no extra effect).
  function handleToggle() {
    if (!open) setSeen(notifications.length);
    setOpen((v) => !v);
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-4 min-w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border bg-popover shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b">
            <p className="text-sm font-semibold">Notifications temps réel</p>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <ScrollArea className="max-h-96">
            <div className="divide-y">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Aucune notification pour le moment.
                  <br />
                  Les ventes, paiements et alertes stock apparaîtront ici en temps réel.
                </div>
              ) : (
                notifications.map((n, i) => {
                  const Icon = ICONS[n.level ?? "info"] ?? Info;
                  return (
                    <div key={i} className="p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", COLORS[n.level ?? "info"])} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {new Date(n.ts).toLocaleTimeString("fr-FR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
