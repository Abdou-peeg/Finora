"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, X, Send, Loader2, Download, Bot, User } from "lucide-react";
import { toast } from "sonner";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
}

export function FinoraAiWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "Bonjour ! Je suis Finora AI. Je peux créer des clients, des devis, générer des factures, ou vous donner des analyses sur vos finances. Que puis-je faire pour vous ?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingIdx, setExportingIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/finora-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, actions: data.actions }]);
    } catch (e: any) {
      toast.error(e.message || "Finora AI a rencontré une erreur");
      setMessages((prev) => [...prev, { role: "assistant", content: "Désolé, une erreur est survenue. Réessayez." }]);
    } finally {
      setLoading(false);
    }
  }

  async function exportPdf(content: string, idx: number) {
    setExportingIdx(idx);
    try {
      const res = await fetch("/api/finora-ai/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Analyse financière — Finora AI", content }),
      });
      if (!res.ok) throw new Error("Échec de l'export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast.error("Impossible de générer le PDF");
    } finally {
      setExportingIdx(null);
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-[#0d5d4a] hover:bg-[#0a4a3b] text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
          aria-label="Ouvrir Finora AI"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Panneau de chat */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] h-[600px] max-h-[calc(100vh-5rem)] bg-card border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-[#0d5d4a] text-white px-4 py-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold text-sm flex-1">Finora AI</span>
            <button onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-[#0d5d4a]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-3.5 w-3.5 text-[#0d5d4a]" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-[#0d5d4a] text-white" : "bg-muted"
                }`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.actions && m.actions.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-xs opacity-80 list-disc pl-4">
                      {m.actions.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  )}
                  {m.role === "assistant" && m.content.length > 200 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1.5 h-7 px-2 text-xs"
                      onClick={() => exportPdf(m.content, idx)}
                      disabled={exportingIdx === idx}
                    >
                      {exportingIdx === idx ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                      Exporter en PDF
                    </Button>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="h-6 w-6 rounded-full bg-[#0d5d4a]/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3.5 w-3.5 text-[#0d5d4a]" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-2.5 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ex: crée un client Awa Ndiaye..."
              disabled={loading}
              className="text-sm"
            />
            <Button size="icon" onClick={send} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}