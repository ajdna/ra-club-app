"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  sendMessage, markThreadRead, toggleReaction,
  deleteMessage, pinMessage, forwardMessage,
  updateLastSeen, getLastSeen,
} from "../actions";
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
  replyToId: string | null;
  replyToBody: string | null;
  replyToName: string | null;
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

function Tick({ read }: { read: boolean }) {
  return (
    <span className={"inline-flex items-center " + (read ? "text-sky-300" : "text-white/50")}>
      <svg viewBox="0 0 18 12" fill="none" className="h-3 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 6 6 11 17 1" />
        {read && <path d="M6 6l5 5 6-10" />}
      </svg>
    </span>
  );
}

export function ChatClient({
  threadId,
  initialMessages,
  myId,
  otherName,
  initialOtherReadAt,
  initialPinnedId = null,
  initialPinnedBody = null,
  otherUserId = null,
  threads = [],
}: {
  threadId: string;
  initialMessages: Message[];
  myId: string;
  otherName: string;
  initialOtherReadAt: string | null;
  initialPinnedId?: string | null;
  initialPinnedBody?: string | null;
  otherUserId?: string | null;
  threads?: { id: string; name: string }[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(initialOtherReadAt);
  const [text, setText] = useState("");
  const [isPending, start] = useTransition();
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(initialPinnedId);
  const [pinnedBody, setPinnedBody] = useState<string | null>(initialPinnedBody);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typingChannelRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typingTimerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const longPressRef = useRef<any>(null);

  useEffect(() => { markThreadRead(threadId); updateLastSeen(); }, [threadId]);

  useEffect(() => {
    if (!otherUserId) return;
    getLastSeen(otherUserId).then((ts) => setOtherLastSeen(ts));
  }, [otherUserId]);

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
      if (otherUserId) {
        const isOnline = Object.keys(state).includes(otherUserId);
        setOtherOnline(isOnline);
      }
    }).subscribe();
    ch.track({ typing: false });
    return () => { supabase.removeChannel(ch); };
  }, [threadId, myId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("thread:" + threadId)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "chat_messages",
        filter: "thread_id=eq." + threadId,
      }, (payload) => {
        const row = payload.new as {
          id: string; sender_id: string; body: string; created_at: string;
          reply_to_message_id: string | null;
        };
        const isMe = row.sender_id === myId;
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          if (isMe) {
            const optIdx = prev.findIndex((m) => m.id.startsWith("opt-") && m.body === row.body && m.isMe);
            if (optIdx !== -1) {
              const next = [...prev];
              next[optIdx] = {
                id: row.id, senderId: row.sender_id, senderName: "You",
                body: row.body, createdAt: row.created_at, isMe: true, reactions: [],
                replyToId: row.reply_to_message_id,
                replyToBody: prev[optIdx].replyToBody,
                replyToName: prev[optIdx].replyToName,
              };
              return next;
            }
          }
          const quoted = row.reply_to_message_id ? prev.find((m) => m.id === row.reply_to_message_id) : null;
          return [...prev, {
            id: row.id, senderId: row.sender_id,
            senderName: isMe ? "You" : otherName,
            body: row.body, createdAt: row.created_at, isMe, reactions: [],
            replyToId: row.reply_to_message_id ?? null,
            replyToBody: quoted?.body ?? null,
            replyToName: quoted?.senderName ?? null,
          }];
        });
        if (!isMe) markThreadRead(threadId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        const supabase2 = createClient();
        setMessages((prev) => {
          const msgIds = prev.map((m) => m.id).filter((id) => !id.startsWith("opt-"));
          if (!msgIds.length) return prev;
          supabase2.from("message_reactions").select("message_id, user_id, emoji").in("message_id", msgIds)
            .then(({ data }) => {
              if (!data) return;
              const byMsg: Record<string, { message_id: string; user_id: string; emoji: string }[]> = {};
              for (const r of data) {
                if (!byMsg[r.message_id]) byMsg[r.message_id] = [];
                byMsg[r.message_id].push(r);
              }
              setMessages((p) => p.map((m) => {
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
          return prev;
        });
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "chat_messages",
        filter: "thread_id=eq." + threadId,
      }, (payload) => {
        const id = (payload.old as { id: string }).id;
        if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "chat_threads",
        filter: "id=eq." + threadId,
      }, (payload) => {
        const row = payload.new as { pinned_message_id: string | null };
        setPinnedId(row.pinned_message_id ?? null);
        if (row.pinned_message_id) {
          setMessages((prev) => {
            const msg = prev.find((m) => m.id === row.pinned_message_id);
            if (msg) setPinnedBody(msg.body);
            return prev;
          });
        } else {
          setPinnedBody(null);
        }
      })
      .on("postgres_changes", {
        event: "*", schema: "public", table: "chat_reads",
        filter: "thread_id=eq." + threadId,
      }, (payload) => {
        const row = payload.new as { user_id: string; last_read_at: string };
        if (row && row.user_id !== myId) setOtherReadAt(row.last_read_at);
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
    const replyId = replyTo?.id ?? null;
    const replyBody = replyTo?.body ?? null;
    const replyName = replyTo?.senderName ?? null;
    setText(""); setReplyTo(null); broadcastTyping(false);
    const optimistic: Message = {
      id: "opt-" + Date.now(), senderId: "me", senderName: "You",
      body, createdAt: new Date().toISOString(), isMe: true, reactions: [],
      replyToId: replyId, replyToBody: replyBody, replyToName: replyName,
    };
    setMessages((prev) => [...prev, optimistic]);
    start(async () => {
      const res = await sendMessage(threadId, body, replyId);
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

  function startLongPress(msg: Message) {
    if (msg.id.startsWith("opt-")) return;
    longPressRef.current = setTimeout(() => setPickerFor(msg.id), 500);
  }

  function cancelLongPress() { if (longPressRef.current) clearTimeout(longPressRef.current); }

  function handleReply(msg: Message) { setPickerFor(null); setReplyTo(msg); inputRef.current?.focus(); }

  function handleDelete(msg: Message) {
    setPickerFor(null);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    start(async () => { await deleteMessage(msg.id); });
  }

  function handlePin(msg: Message) {
    setPickerFor(null);
    const isUnpin = pinnedId === msg.id;
    const newId = isUnpin ? null : msg.id;
    const newBody = isUnpin ? null : msg.body;
    setPinnedId(newId);
    setPinnedBody(newBody);
    start(async () => { await pinMessage(threadId, newId); });
  }

  function handleForward(msg: Message) {
    setPickerFor(null);
    setForwardMsg(msg);
  }

  function doForward(targetId: string) {
    if (!forwardMsg) return;
    const body = forwardMsg.body;
    const name = forwardMsg.senderName;
    setForwardMsg(null);
    start(async () => { await forwardMessage(targetId, body, name); });
  }

  function formatLastSeen(ts: string | null): string {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 2) return "last seen just now";
    if (diffMin < 60) return "last seen " + diffMin + "m ago";
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return "last seen " + diffH + "h ago";
    return "last seen " + d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  const grouped: { day: string; msgs: Message[] }[] = [];
  for (const m of messages) {
    const day = formatDay(m.createdAt);
    if (!grouped.length || grouped[grouped.length - 1].day !== day) grouped.push({ day, msgs: [m] });
    else grouped[grouped.length - 1].msgs.push(m);
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden" onClick={() => { setPickerFor(null); setForwardMsg(null); }}>

      {/* Online / last seen status bar */}
      {otherUserId && (
        <div className="flex items-center gap-1.5 border-b border-line bg-card px-4 py-1">
          <span className={"h-2 w-2 rounded-full " + (otherOnline ? "bg-green-400" : "bg-ink/20")} />
          <span className="text-xs text-ink/50">
            {otherOnline ? "Online" : formatLastSeen(otherLastSeen)}
          </span>
        </div>
      )}

      {/* Pinned message banner */}
      {pinnedId && pinnedBody && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5">
          <span className="text-sm">📌</span>
          <p className="flex-1 truncate text-xs text-ink/70">{pinnedBody}</p>
          <button type="button" onClick={() => { setPinnedId(null); setPinnedBody(null); start(async () => { await pinMessage(threadId, null); }); }}
            className="shrink-0 text-ink/40 hover:text-ink/70 text-xs">✕</button>
        </div>
      )}

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
            {g.msgs.map((m) => {
              const isRead = m.isMe && otherReadAt !== null && m.createdAt <= otherReadAt;
              return (
                <div key={m.id} className={"mb-2 flex " + (m.isMe ? "justify-end" : "justify-start")}>
                  <div className="relative max-w-xs">
                    <div
                      className={
                        "rounded-2xl px-3 py-2 text-sm " +
                        (m.isMe ? "rounded-br-sm bg-emerald text-white" : "rounded-bl-sm bg-card border border-line text-ink")
                      }
                      onContextMenu={(e) => { e.preventDefault(); if (!m.id.startsWith("opt-")) setPickerFor(m.id); }}
                      onTouchStart={() => startLongPress(m)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                    >
                      {!m.isMe && <p className="mb-0.5 text-xs font-semibold text-emerald">{m.senderName}</p>}

                      {m.replyToBody && (
                        <div className={
                          "mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs " +
                          (m.isMe ? "border-white/50 bg-white/15 text-white/80" : "border-emerald/50 bg-emerald/5 text-ink/60")
                        }>
                          <span className="font-semibold block">{m.replyToName ?? ""}</span>
                          <span className="line-clamp-2">{m.replyToBody}</span>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap">{m.body}</p>

                      <div className={"mt-0.5 flex items-center justify-end gap-1 " + (m.isMe ? "text-white/70" : "text-ink/40")}>
                        <span className="text-xs">{formatTime(m.createdAt)}</span>
                        {m.isMe && !m.id.startsWith("opt-") && <Tick read={isRead} />}
                        {m.isMe && m.id.startsWith("opt-") && <span className="text-xs opacity-40">...</span>}
                      </div>
                    </div>

                    {pickerFor === m.id && (
                      <div
                        className={"absolute z-20 rounded-2xl border border-line bg-card shadow-lg " + (m.isMe ? "right-0" : "left-0")}
                        style={{ bottom: "calc(100% + 4px)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex gap-1 px-2 pt-2">
                          {EMOJI_PICKER.map((key) => (
                            <button key={key} type="button" onClick={() => handleReact(m.id, key)}
                              className="h-9 w-9 rounded-xl text-lg transition hover:bg-cream-2 active:scale-90">
                              {EMOJI_MAP[key]}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-line mx-2 my-1" />
                        <button type="button" onClick={() => handleReply(m)}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-cream-2">
                          ↩ Reply
                        </button>
                        <button type="button" onClick={() => handleForward(m)}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-cream-2">
                          ↪ Forward
                        </button>
                        <button type="button" onClick={() => handlePin(m)}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-cream-2">
                          {pinnedId === m.id ? "📌 Unpin" : "📌 Pin"}
                        </button>
                        {m.isMe && (
                          <button type="button" onClick={() => handleDelete(m)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                            🗑 Delete
                          </button>
                        )}
                      </div>
                    )}

                    {m.reactions.length > 0 && (
                      <div className={"mt-0.5 flex flex-wrap gap-1 " + (m.isMe ? "justify-end" : "justify-start")}>
                        {m.reactions.map((r) => (
                          <button key={r.emoji} type="button"
                            onClick={(e) => { e.stopPropagation(); handleReact(m.id, r.emoji); }}
                            className={"inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold transition " +
                              (r.byMe ? "bg-emerald/20 text-emerald" : "bg-line text-ink/70")}>
                            {EMOJI_MAP[r.emoji] ?? r.emoji} {r.count}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {typingNames.length > 0 && (
        <div className="flex items-center gap-2 border-t border-line bg-card px-4 py-1.5">
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40"
                style={{ animationDelay: i * 150 + "ms" }} />
            ))}
          </span>
          <span className="text-xs text-ink/50">{typingNames.join(", ")} likh raha hai</span>
        </div>
      )}

      {replyTo && (
        <div className="flex items-start gap-2 border-t border-emerald/30 bg-emerald/5 px-3 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-emerald pl-2">
            <p className="text-xs font-semibold text-emerald">{replyTo.senderName}</p>
            <p className="truncate text-xs text-ink/60">{replyTo.body}</p>
          </div>
          <button type="button" onClick={() => setReplyTo(null)}
            className="shrink-0 text-ink/40 hover:text-ink/70" aria-label="Cancel reply">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Forward picker modal */}
      {forwardMsg && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/40" onClick={() => setForwardMsg(null)}>
          <div className="w-full rounded-t-2xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 font-semibold text-ink">Forward to…</p>
            {threads.length === 0 && <p className="text-sm text-ink/50">No other threads</p>}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {threads.filter((t) => t.id !== threadId).map((t) => (
                <button key={t.id} type="button" onClick={() => doForward(t.id)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-cream-2">
                  💬 {t.name}
                </button>
              ))}
            </div>
          </div>
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
        <button type="submit" disabled={!text.trim() || isPending}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald text-white transition disabled:opacity-40">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
