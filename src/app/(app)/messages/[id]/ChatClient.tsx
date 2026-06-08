"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendMessage, markThreadRead } from "../actions";

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  isMe: boolean;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function ChatClient({
  threadId,
  initialMessages,
}: {
  threadId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [isPending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Mark read on mount
  useEffect(() => {
    markThreadRead(threadId);
  }, [threadId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    // Optimistic UI
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      senderId: "me",
      senderName: "You",
      body,
      createdAt: new Date().toISOString(),
      isMe: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    start(async () => {
      const res = await sendMessage(threadId, body);
      if (res.error) alert(res.error);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  }

  // Group messages by day
  const grouped: { day: string; msgs: Message[] }[] = [];
  for (const m of messages) {
    const day = formatDay(m.createdAt);
    if (!grouped.length || grouped[grouped.length - 1].day !== day) {
      grouped.push({ day, msgs: [m] });
    } else {
      grouped[grouped.length - 1].msgs.push(m);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {grouped.length === 0 && (
          <p className="py-12 text-center text-sm text-ink/40">
            Baat shuru karein 👋
          </p>
        )}
        {grouped.map((g) => (
          <div key={g.day}>
            <div className="my-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-line" />
              <span className="text-xs text-ink/40">{g.day}</span>
              <div className="h-px flex-1 bg-line" />
            </div>
            {g.msgs.map((m) => (
              <div
                key={m.id}
                className={`mb-1 flex ${m.isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                    m.isMe
                      ? "rounded-br-sm bg-emerald text-white"
                      : "rounded-bl-sm bg-card border border-line text-ink"
                  }`}
                >
                  {!m.isMe && (
                    <p className="mb-0.5 text-xs font-semibold text-emerald">{m.senderName}</p>
                  )}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${m.isMe ? "text-white/70" : "text-ink/40"}`}>
                    {formatTime(m.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 border-t border-line bg-card px-3 py-2 pb-[max(env(safe-area-inset-bottom),8px)]"
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message likhein…"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-emerald"
          style={{ maxHeight: "120px" }}
        />
        <button
          type="submit"
          disabled={!text.trim() || isPending}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald text-white transition disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
