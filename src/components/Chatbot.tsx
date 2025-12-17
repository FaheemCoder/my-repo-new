import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { MaterialCard } from "@/components/ui/material-card";
import { X, MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Props = {
  source?: "landing" | "dashboard";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideButton?: boolean;
};

export function Chatbot({ source = "landing", open: controlledOpen, onOpenChange, hideButton = false }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  
  const { isLoading, isAuthenticated, sessionActive } = useAuth();

  // ephemereal sessionKey tied to current open state (no localStorage persistence)
  const sessionKey = useMemo(() => {
    if (!open) return null;
    return `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  }, [open]);

  const getOrCreate = useMutation(api.chat.getOrCreateSession);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const safeOpen = () => {
    if (source === "dashboard") {
      if (isLoading) {
        toast("Please wait a moment while we finish signing you in…");
        return;
      }
      if ((!isAuthenticated || !sessionActive)) {
        toast("Sign in to use the assistant");
        return;
      }
    }
    setOpen(true);
  };

  // create a fresh session only when opened
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!open || !sessionKey) return;
      if (source === "dashboard") {
        if (isLoading || (!isAuthenticated || !sessionActive)) return;
      }
      const id = await getOrCreate({ sessionKey, source });
      if (!cancelled) setSessionId(id as string);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [open, sessionKey, source, getOrCreate, isLoading, isAuthenticated, sessionActive]);

  const messages = useQuery(
    api.chat.listMessages,
    sessionId ? { sessionId: sessionId as any } : "skip",
  );

  const send = useMutation(api.chat.sendMessage);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, open]);

  const latestAssistant = useMemo(() => {
    const arr = messages ?? [];
    const last = arr.slice().reverse().find((m) => m.role === "assistant");
    return last?.content ?? "";
  }, [messages]);

  useEffect(() => {
    if (/\(tip:|Tip:/i.test(latestAssistant) && /(thanks|done|that's all|thats all|goodbye)/i.test((messages ?? []).slice().reverse().find((m) => m.role === "user")?.content ?? "")) {
      setInput("");
      setOpen(false);
      setSessionId(null);
    }
  }, [latestAssistant, messages, setOpen]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !sessionId || sending) return;
    setSending(true);
    setInput("");
    try {
      await send({ sessionId: sessionId as any, content });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setInput("");
    setSessionId(null);
  };

  return (
    <>
      {!hideButton && (
        <Button
          onClick={safeOpen}
          className={cn(
            "fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg",
            "hover:bg-primary/90 transition-all hover:shadow-xl",
          )}
          aria-label="Open chat"
          disabled={source === "dashboard" && (isLoading || (!isAuthenticated || !sessionActive))}
        >
          {source === "dashboard" && (isLoading || (!isAuthenticated || !sessionActive)) ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/70 border-t-transparent" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20">
          <MaterialCard className="w-full sm:w-[420px] max-h-[80vh] flex flex-col overflow-hidden relative">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-bold tracking-tight">LokYodha Assistant</div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(messages ?? []).map((m) => (
                <div
                  key={m._id as any}
                  className={cn(
                    "max-w-[85%] px-3 py-2 rounded-lg text-sm",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-secondary text-foreground",
                  )}
                >
                  {m.content}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="p-3 border-t flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your message…"
                className="flex-1 bg-transparent border rounded-md px-3 py-2 outline-none"
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={!input.trim() || !sessionId || sending} aria-busy={sending}>
                {sending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/70 border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </MaterialCard>
        </div>
      )}
    </>
  );
}