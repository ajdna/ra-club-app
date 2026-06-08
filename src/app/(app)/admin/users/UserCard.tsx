"use client";

import { useState, useTransition } from "react";
import { approveUser, rejectUser, updateUserRole, updateUserDetails } from "../actions";

type UserRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  parent_id: string | null;
  address: string | null;
};

type MemberRow = {
  user_id: string;
  membership_type: string;
  stage: number;
} | undefined;

const ALL_ROLES = [
  "member", "coach", "jco", "nco", "club_owner", "privilege", "guest", "upline",
] as const;

const MEMBERSHIP_TYPES = ["basic", "elite", "privilege"] as const;

export function UserCard({
  user,
  member,
  nameById,
  allUsers,
  isPending = false,
}: {
  user: UserRow;
  member: MemberRow;
  nameById: Map<string, string>;
  allUsers: UserRow[];
  isPending?: boolean;
}) {
  const [expanded, setExpanded] = useState(isPending);
  const [editMode, setEditMode] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Editable fields state
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [role, setRole] = useState(user.role);
  const [parentId, setParentId] = useState(user.parent_id ?? "");
  const [membership, setMembership] = useState(member?.membership_type ?? "basic");
  const [status, setStatus] = useState(user.status);

  const uplineName = user.parent_id ? (nameById.get(user.parent_id) ?? "—") : "—";

  function statusBadge() {
    const map: Record<string, string> = {
      active: "bg-good/15 text-good",
      pending: "bg-warn/15 text-warn",
      rejected: "bg-bad/15 text-bad",
      inactive: "bg-line text-ink/50",
    };
    return map[user.status] ?? "bg-line text-ink/50";
  }

  function toast(ok: boolean, text: string) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3000);
  }

  function handleApprove() {
    startTransition(async () => {
      const res = await approveUser(user.id);
      toast(res.ok, res.ok ? "Approved!" : (res as { ok: false; error: string }).error);
    });
  }

  function handleReject() {
    startTransition(async () => {
      const res = await rejectUser(user.id);
      toast(res.ok, res.ok ? "Rejected." : (res as { ok: false; error: string }).error);
    });
  }

  function handleSaveRole() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("user_id", user.id);
      fd.set("role", role);
      fd.set("parent_id", parentId);
      fd.set("membership", membership);
      fd.set("status", status);
      const res = await updateUserRole(fd);
      toast(res.ok, res.ok ? "Role updated!" : (res as { ok: false; error: string }).error);
      if (res.ok) setEditMode(false);
    });
  }

  function handleSaveDetails() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("user_id", user.id);
      fd.set("name", name);
      fd.set("phone", phone);
      fd.set("address", address);
      const res = await updateUserDetails(fd);
      toast(res.ok, res.ok ? "Details saved!" : (res as { ok: false; error: string }).error);
      if (res.ok) setEditMode(false);
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-d text-sm font-semibold text-white">
          {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-ink">{user.name}</div>
          <div className="truncate text-xs text-ink/55">
            {user.role} · {uplineName}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusBadge()}`}>
          {user.status}
        </span>
        <span className="text-ink/40 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-line px-4 pb-4 pt-3 space-y-4">
          {/* Contact info */}
          <div className="text-sm space-y-1 text-ink/70">
            {user.email && <div>📧 {user.email}</div>}
            {user.phone && <div>📱 {user.phone}</div>}
            {user.address && <div>📍 {user.address}</div>}
            {member && (
              <div>
                🎗 {member.membership_type} · Stage {member.stage}
              </div>
            )}
          </div>

          {/* Pending approval buttons */}
          {isPending && user.status === "pending" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={pending}
                className="flex-1 rounded-xl bg-good px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                ✓ Approve
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={pending}
                className="flex-1 rounded-xl bg-bad/15 px-3 py-2 text-sm font-semibold text-bad transition hover:bg-bad/25 disabled:opacity-50"
              >
                ✗ Reject
              </button>
            </div>
          )}

          {/* Edit toggle */}
          {!isPending && (
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className="text-sm font-semibold text-terra-d underline"
            >
              {editMode ? "Cancel" : "Edit →"}
            </button>
          )}

          {editMode && (
            <div className="space-y-3 pt-1">
              {/* Personal details */}
              <p className="text-xs font-semibold uppercase tracking-wider text-sage-d">
                Personal details
              </p>
              <label className="block text-sm">
                <span className="text-ink/60">Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-ink outline-none focus:border-terra text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-ink/60">Phone</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-ink outline-none focus:border-terra text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-ink/60">Address</span>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-ink outline-none focus:border-terra text-sm"
                />
              </label>
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={pending}
                className="w-full rounded-xl bg-emerald px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save details
              </button>

              {/* Role & access */}
              <p className="text-xs font-semibold uppercase tracking-wider text-sage-d pt-2">
                Role & access
              </p>
              <label className="block text-sm">
                <span className="text-ink/60">Role</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-ink outline-none focus:border-terra text-sm"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-ink/60">Upline / Coach</span>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-ink outline-none focus:border-terra text-sm"
                >
                  <option value="">— no parent —</option>
                  {allUsers
                    .filter((u) => u.id !== user.id && u.status === "active")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                </select>
              </label>
              {member && (
                <label className="block text-sm">
                  <span className="text-ink/60">Membership</span>
                  <select
                    value={membership}
                    onChange={(e) => setMembership(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-ink outline-none focus:border-terra text-sm"
                  >
                    {MEMBERSHIP_TYPES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-sm">
                <span className="text-ink/60">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-ink outline-none focus:border-terra text-sm"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive (soft-delete)</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handleSaveRole}
                disabled={pending}
                className="w-full rounded-xl bg-terra px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save role & access
              </button>
            </div>
          )}

          {msg && (
            <p
              role="alert"
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                msg.ok ? "bg-good/15 text-good" : "bg-bad/15 text-bad"
              }`}
            >
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
