"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendBroadcast, sendBroadcastToGroup, createBroadcastGroup, deleteBroadcastGroup } from "../actions";
import type { BroadcastGroup } from "../actions";

type Target = "all" | "coaches" | "members";

const TARGET_OPTIONS: { value: Target; label: string; desc: string; icon: string }[] = [
  { value: "all",     label: "Everyone",     desc: "All coaches + members", icon: "globe" },
  { value: "coaches", label: "Coaches Only", desc: "NCO, JCO, Coaches",     icon: "office" },
  { value: "members", label: "Members Only", desc: "Club members",           icon: "run" },
];

const FILTER_OPTIONS = [
  { value: "all",      label: "Everyone in my team" },
  { value: "by_role",  label: "By role" },
  { value: "by_stage", label: "By stage" },
];

const ROLE_OPTIONS  = ["member", "coach", "jco", "nco"];
const STAGE_OPTIONS = ["1", "2", "3", "4", "5", "6"];

export function BroadcastClient({ groups: initialGroups }: { groups: BroadcastGroup[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"quick" | "lists">("quick");

  // Quick send
  const [subject,   setSubject]   = useState("");
  const [body,      setBody]      = useState("");
  const [target,    setTarget]    = useState<Target>("all");
  const [isPending, start]        = useTransition();
  const [err,       setErr]       = useState("");

  // My lists
  const [groups,        setGroups]        = useState<BroadcastGroup[]>(initialGroups);
  const [showCreate,    setShowCreate]    = useState(false);
  const [newName,       setNewName]       = useState("");
  const [newFType,      setNewFType]      = useState<BroadcastGroup["filterType"]>("all");
  const [newFValue,     setNewFValue]     = useState("");
  const [selectedGroup, setSelectedGroup] = useState<BroadcastGroup | null>(null);
  const [groupBody,     setGroupBody]     = useState("");
  const [groupSubject,  setGroupSubject]  = useState("");

  function handleQuickSend(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    start(async () => {
      const res = await sendBroadcast(subject, body, target);
      if (res.error) { setErr(res.error); return; }
      router.push("/messages");
    });
  }

  function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const fv = newFType === "all" ? null : (newFValue || null);
      const res = await createBroadcastGroup(newName, newFType, fv);
      if (res.error) { setErr(res.error); return; }
      setGroups((prev) => [{ id: res.id!, name: newName, filterType: newFType, filterValue: fv }, ...prev]);
      setShowCreate(false);
      setNewName(""); setNewFType("all"); setNewFValue("");
    });
  }

  function handleDeleteGroup(id: string) {
    start(async () => {
      await deleteBroadcastGroup(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (selectedGroup?.id === id) setSelectedGroup(null);
    });
  }

  function handleGroupSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroup) return;
    setErr("");
    start(async () => {
      const res = await sendBroadcastToGroup(selectedGroup.id, groupSubject, groupBody);
      if (res.error) { setErr(res.error); return; }
      router.push("/messages");
    });
  }

  function filterLabel(g: BroadcastGroup) {
    if (g.filterType === "all")      return "Everyone in team";
    if (g.filterType === "by_role")  return "Role: " + g.filterValue;
    if (g.filterType === "by_stage") return "Stage " + g.filterValue;
    return g.filterType;
  }

  return (
    <main className="px-4 pb-10 pt-5 max-w-lg mx-auto">
      <Link href="/messages" className="text-sm font-semibold text-sage-d">
        {"<- Messages"}
      </Link>
      <h1 className="font-display mt-3 text-xl font-semibold text-emerald">
        Team Broadcast
      </h1>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("quick")}
          className={"flex-1 rounded-xl py-2.5 text-sm font-semibold transition " + (
            tab === "quick" ? "bg-emerald text-white" : "bg-card border border-line text-ink/70"
          )}
        >
          Quick Send
        </button>
        <button
          type="button"
          onClick={() => setTab("lists")}
          className={"flex-1 rounded-xl py-2.5 text-sm font-semibold transition " + (
            tab === "lists" ? "bg-emerald text-white" : "bg-card border border-line text-ink/70"
          )}
        >
          {"My Lists" + (groups.length > 0 ? " (" + groups.length + ")" : "")}
        </button>
      </div>

      {tab === "quick" && (
        <form onSubmit={handleQuickSend} className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">Send To</label>
            <div className="grid grid-cols-3 gap-2">
              {TARGET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTarget(opt.value)}
                  className={"rounded-xl border px-3 py-2.5 text-left transition " + (
                    target === opt.value
                      ? "border-emerald bg-emerald/10 text-emerald"
                      : "border-line bg-card text-ink/70"
                  )}
                >
                  <div className="text-sm font-bold">{opt.icon}</div>
                  <div className="mt-1 text-xs font-semibold leading-tight">{opt.label}</div>
                  <div className="text-[11px] text-ink/50 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">
              Subject <span className="font-normal text-ink/50">(optional)</span>
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Morning shake reminder"
              className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Message *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Apna message likhein..."
              rows={5}
              required
              className="w-full resize-none rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald"
            />
          </div>

          {err && <p className="text-sm text-bad">{err}</p>}
          <button
            type="submit"
            disabled={!body.trim() || isPending}
            className="w-full rounded-2xl bg-emerald py-3 font-semibold text-white disabled:opacity-40"
          >
            {isPending ? "Bhej raha hai..." : (TARGET_OPTIONS.find((t) => t.value === target)?.label ?? "Send") + " ko Bhejo"}
          </button>
        </form>
      )}

      {tab === "lists" && (
        <div className="mt-5 space-y-4">
          {groups.length === 0 && !showCreate && (
            <div className="rounded-2xl border border-line bg-card px-4 py-8 text-center text-sm text-ink/50">
              Koi saved list nahi.
              <br />Neeche button dabao nayi list banane ke liye.
            </div>
          )}

          {groups.map((g) => (
            <div
              key={g.id}
              onClick={() => setSelectedGroup(selectedGroup?.id === g.id ? null : g)}
              className={"cursor-pointer rounded-2xl border p-4 transition " + (
                selectedGroup?.id === g.id ? "border-emerald bg-emerald/5" : "border-line bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-ink">{g.name}</div>
                  <div className="mt-0.5 text-xs text-ink/50">{filterLabel(g)}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id); }}
                  className="shrink-0 rounded-lg bg-bad/10 px-2 py-1 text-xs font-semibold text-bad"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {selectedGroup && (
            <form onSubmit={handleGroupSend} className="space-y-3 rounded-2xl border border-emerald bg-emerald/5 p-4">
              <p className="text-sm font-semibold text-emerald">Send to: {selectedGroup.name}</p>
              <input
                value={groupSubject}
                onChange={(e) => setGroupSubject(e.target.value)}
                placeholder="Subject (optional)"
                className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-emerald"
              />
              <textarea
                value={groupBody}
                onChange={(e) => setGroupBody(e.target.value)}
                placeholder="Message likhein..."
                rows={4}
                required
                className="w-full resize-none rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-emerald"
              />
              {err && <p className="text-xs text-bad">{err}</p>}
              <button
                type="submit"
                disabled={!groupBody.trim() || isPending}
                className="w-full rounded-xl bg-emerald py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {isPending ? "Bhej raha hai..." : "Bhejo"}
              </button>
            </form>
          )}

          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-full rounded-2xl border border-dashed border-emerald/50 py-3 text-sm font-semibold text-emerald/80 transition hover:bg-emerald/5"
            >
              + Nayi List Banao
            </button>
          ) : (
            <form onSubmit={handleCreateGroup} className="space-y-3 rounded-2xl border border-line bg-card p-4">
              <p className="text-sm font-semibold text-ink">Nayi Broadcast List</p>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="List name e.g. Stage 1 Members"
                required
                className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm outline-none focus:border-emerald"
              />
              <select
                value={newFType}
                onChange={(e) => { setNewFType(e.target.value as BroadcastGroup["filterType"]); setNewFValue(""); }}
                className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm outline-none focus:border-emerald"
              >
                {FILTER_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {newFType === "by_role" && (
                <select
                  value={newFValue}
                  onChange={(e) => setNewFValue(e.target.value)}
                  className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm outline-none"
                >
                  <option value="">Select role</option>
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              )}

              {newFType === "by_stage" && (
                <select
                  value={newFValue}
                  onChange={(e) => setNewFValue(e.target.value)}
                  className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm outline-none"
                >
                  <option value="">Select stage</option>
                  {STAGE_OPTIONS.map((s) => <option key={s} value={s}>{"Stage " + s}</option>)}
                </select>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-xl border border-line py-2 text-sm font-semibold text-ink/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || isPending}
                  className="flex-1 rounded-xl bg-emerald py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {isPending ? "Saving..." : "Save List"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
