"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendMessage, markThreadRead, toggleReaction } from "../actions";
import { createClient } from "@/lib/supabase/client";

type Reaction = { emoji: string; count: number; byMe: boolean };

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  isMe: boolean;
  reactions: Reaction[];
};

const EMOJI_PICKER = ["like", "heart", "laugh", "wow", "sad", "pray"];
const EMOJI_MAP: Record<string, string> = {
  like: "👍", heart: "❤️", laugh: "😂", wow: "😮", sad: "😢", pray: "🙏",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
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
  myId,
  otherName,
}: {
  threadId: string;
  initialMessages: Message[];
  myId: string;
  otherName: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [isPending, start] = useTransition();
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typingChannelRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typingTimerRef = useRef<any>(null);

  useEffect(() => { markThreadRead(threadId); }, [threadId]);

  // Typing indicator
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel("typing:" + threadId, { config: { presence: { key: myId } } });
    typingChannelRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state: Record<string, any[]> = ch.presenceState();
      const names: string[] = Object.entries(state)
        .filter(([uid, p]) => uid !== myId && p?.[0]?.typing)
        .map(([, p]) => p[0].name as string);
      setTypingNames(names);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, myId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Realtime: new messages
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("thread:" + threadId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: "thread_id=eq." + threadId },
        (payload) => {
          const row = payload.new as { id: string; sender_id: string; body: string; created_at: string };
          const isMe = row.sender_id === myId;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            if (isMe) {
              const optIdx = prev.findIndex((m) => m.id.startsWith("opt-") && m.body === row.body && m.isMe);
              if (optIdx !== -1) {
                const next = [...prev];
                next[optIdx] = { id: row.id, senderId: row.sender_id, senderName: "You", body: row.body, createdAt: row.created_at, isMe: true, reactions: [] };
                return next;
              }
            }
            return [...prev, { id: row.id, senderId: row.sender_id, senderName: isMe ? "You" : otherName, body: row.body, createdAt: row.created_at, isMe, reactions: [] }];
          });
          if (!isMe) markThreadRead(threadId);
        })
      // Realtime: reactions
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        // Refetch reactions for visible messages (simple approach)
        const supabase2 = createClient();
        const msgIds = messages.map((m) => m.id).filter((id) => !id.startsWith("opt-"));
        if (!msgIds.length) return;
        supabase2.from("message_reactions").select("message_id, user_id, emoji").in("message_id", msgIds)
          .then(({ data }) => {
            if (!data) return;
            const byMsg: Record<string, { emoji: string; user_id: string }[]> = {};
            for (const r of data) {
              if (!byMsg[r.message_id]) byMsg[r.message_id] = [];
              byMsg[r.message_id].push(r);
            }
            setMessages((prev) => prev.map((m) => {
              const rows = byMsg[m.id] ?? [];
              const grouped: Record<string, Reaction> = {};
              for (const r of rows) {
                if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, byMe: false };
                grouped[r.emoji].count++;
                if (r.user_id === myId) grouped[r.emoji].byMe = true;
              }
              return { ...m, reactions: Object.values(grouped) };
            }));
          });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, myId, otherName]);

  function broadcastTyping(isTyping: boolean) {
    typingChannelRef.current?.track({ name: otherName, typing: isTyping });
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    broadcastTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => broadcastTyping(false), 3000);
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    broadcastTyping(false);
    const optimistic: Message = {
      id: "opt-" + Date.now(), senderId: "me", senderName: "You",
      body, createdAt: new Date().toISOString(), isMe: true, reactions: [],
    };
    setMessages((prev) => [...prev, optimistic]);
    start(async () => {
      const res = await sendMessage(threadId, body);
      if (res.error) alert(res.error);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent); }
  }

  function handleReact(messageId: string, emojiKey: string) {
    setPickerFor(null);
    start(async () => {
      await toggleReaction(messageId, emojiKey);
      // Optimistic update
      setMessages((prev) => prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find((r) => r.emoji === emojiKey);
        if (existing) {
          const updated = existing.byMe
            ? (existing.count > 1 ? { ...existing, count: existing.count - 1, byMe: false } : null)
            : { ...existing, count: existing.count + 1, byMe: true };
          const reactions = updated
            ? m.reactions.map((r) => r.emoji === emojiKey ? updated : r)
            : m.reactions.filter((r) => r.emoji !== emojiKey);
          return { ...m, reactions };
        }
        return { ...m, reactions: [...m.reactions, { emoji: emojiKey, count: 1, byMe: true }] };
      }));
    });
  }

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
    <div className="flex flex-1 flex-col overflow-hidden" onClick={() => setPickerFor(null)}>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {grouped.length === 0 && (
          <p className="py-12 text-center text-sm text-ink/40">Baat shuru karein</p>
        )}
        {grouped.map((g) => (
          <div key={g.day}>
            <div className="my-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-line" />
              <span className="text-xs text-ink/40">{g.day}</span>
              <div className="h-px flex-1 bg-line" />
            </div>
            {g.msgs.map((m) => (
              <div key={m.id} className={"mb-2 flex " + (m.isMe ? "justify-end" : "justify-start")}>
                <div className="relative max-w-xs">
                  {/* Long-press area */}
                  <div
                    className={"rounded-2xl px-3 py-2 text-sm " + (
                      m.isMe
                        ? "rounded-br-sm bg-emerald text-white"
                        : "rounded-bl-sm bg-card border border-line text-ink"
                    )}
                    onContextMenu={(e) => { e.preventDefault(); if (!m.id.startsWith("opt-")) setPickerFor(m.id); }}
                    onTouchStart={() => {
                      if (m.id.startsWith("opt-")) return;
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (window as any).__reactionTimer = setTimeout(() => setPickerFor(m.id), 500);
                    }}
                    onTouchEnd={() => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      clearTimeout((window as any).__reactionTimer);
                    }}
                  >
                    {!m.isMe && (
                      <p className="mb-0.5 text-xs font-semibold text-emerald">{m.senderName}</p>
                    )}
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={"mt-0.5 text-right text-xs " + (m.isMe ? "text-white/70" : "text-ink/40")}>
                      {formatTime(m.createdAt)}
                    </p>
                  </div>

                  {/* Emoji picker */}
                  {pickerFor === m.id && (
                    <div
                      className={"absolute z-20 flex gap-1 rounded-2xl border border-line bg-card p-2 shadow-lg " + (m.isMe ? "right-0" : "left-0")}
                      style={{ bottom: "calc(100% + 4px)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {EMOJI_PICKER.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleReact(m.id, key)}
                          className="h-9 w-9 rounded-xl text-lg transition hover:bg-cream-2 active:scale-90"
                        >
                          {EMOJI_MAP[key]}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Reaction counts */}
                  {m.reactions.length > 0 && (
                    <div className={"mt-0.5 flex flex-wrap gap-1 " + (m.isMe ? "justify-end" : "justify-start")}>
                      {m.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleReact(m.id, r.emoji); }}
                          className={"inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold transition " + (
                            r.byMe ? "bg-emerald/20 text-emerald" : "bg-line text-ink/70"
                          )}
                        >
                          {EMOJI_MAP[r.emoji] ?? r.emoji} {r.count}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {typingNames.length > 0 && (
        <div className="flex items-center gap-2 border-t border-line bg-card px-4 py-1.5">
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40" style={{ animationDelay: i * 150 + "ms" }} />
            ))}
          </span>
          <span className="text-xs text-ink/50">{typingNames.join(", ")} likh raha hai</span>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-line bg-card px-3 py-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={() => broadcastTyping(false)}
          placeholder="Message likhein..."
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
