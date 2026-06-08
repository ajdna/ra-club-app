"use client";

import { useState, useTransition } from "react";
import {
  addRoleMapping,
  updateRoleMapping,
  deleteRoleMapping,
  SYSTEM_ROLES,
  type RoleMappingRow,
  type SystemRole,
} from "./actions";

// ─── helpers ──────────────────────────────────────────────────────────────────
const BOOL_LABEL = (v: boolean) => (v ? "✅ Yes" : "—");

function Toggle({
  name,
  checked,
  onChange,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-emerald" : "bg-ink/20"}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </label>
  );
}

// ─── Add form ─────────────────────────────────────────────────────────────────
function AddForm({ onDone }: { onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState("");
  const [membersRow, setMembersRow] = useState(false);
  const [followup, setFollowup] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addRoleMapping(fd);
      if (res.error) { setErr(res.error); return; }
      onDone();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-2xl border border-emerald/30 bg-card p-4 space-y-3"
    >
      <p className="font-semibold text-emerald">New Role Mapping</p>

      <div className="flex gap-2">
        <input
          name="display_name"
          placeholder="Display name (e.g. Star Member)"
          required
          className="flex-1 rounded-xl border border-line bg-cream px-3 py-2 text-sm"
        />
        <select
          name="system_role"
          defaultValue="member"
          className="rounded-xl border border-line bg-cream px-3 py-2 text-sm"
        >
          {SYSTEM_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          name="sort_order"
          type="number"
          defaultValue={99}
          placeholder="Order"
          className="w-20 rounded-xl border border-line bg-cream px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-6 text-sm">
        <span className="flex items-center gap-2">
          <Toggle name="gets_members_row" checked={membersRow} onChange={setMembersRow} />
          Health track (members row)
        </span>
        <span className="flex items-center gap-2">
          <Toggle name="gets_followup" checked={followup} onChange={setFollowup} />
          Follow-up tasks
        </span>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-emerald px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add Role"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl border border-line px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Edit form (inline) ───────────────────────────────────────────────────────
function EditForm({
  row,
  onDone,
}: {
  row: RoleMappingRow;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState("");
  const [membersRow, setMembersRow] = useState(row.gets_members_row);
  const [followup, setFollowup] = useState(row.gets_followup);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateRoleMapping(row.id, fd);
      if (res.error) { setErr(res.error); return; }
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          name="display_name"
          defaultValue={row.display_name}
          required
          className="flex-1 rounded-xl border border-line bg-cream px-3 py-2 text-sm"
        />
        <select
          name="system_role"
          defaultValue={row.system_role as string}
          className="rounded-xl border border-line bg-cream px-3 py-2 text-sm"
        >
          {SYSTEM_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          name="sort_order"
          type="number"
          defaultValue={row.sort_order}
          className="w-20 rounded-xl border border-line bg-cream px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-6 text-sm">
        <span className="flex items-center gap-2">
          <Toggle name="gets_members_row" checked={membersRow} onChange={setMembersRow} />
          Health track
        </span>
        <span className="flex items-center gap-2">
          <Toggle name="gets_followup" checked={followup} onChange={setFollowup} />
          Follow-up tasks
        </span>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-emerald px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="rounded-xl border border-line px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function RoleMappingsClient({ initial }: { initial: RoleMappingRow[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletePending, startDelete] = useTransition();

  // Re-fetch after any mutation (simple refresh via server action)
  async function refresh() {
    // page is force-dynamic; trigger a soft refresh
    const { getRoleMappings } = await import("./actions");
    setRows(await getRoleMappings());
    setAdding(false);
    setEditing(null);
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    startDelete(async () => {
      const res = await deleteRoleMapping(id);
      if (res.error) { alert(res.error); return; }
      setRows((prev) => prev.filter((r) => r.id !== id));
    });
  }

  return (
    <div>
      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-cream-2 text-xs uppercase text-ink/60">
            <tr>
              <th className="px-4 py-2 text-left">Display Name</th>
              <th className="px-4 py-2 text-left">System Role</th>
              <th className="px-4 py-2 text-center">Members Row</th>
              <th className="px-4 py-2 text-center">Follow-up Tasks</th>
              <th className="px-4 py-2 text-center">Order</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-cream-2/50">
                {editing === row.id ? (
                  <td colSpan={6} className="px-4 py-3">
                    <EditForm
                      row={row}
                      onDone={refresh}
                    />
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium">{row.display_name}</td>
                    <td className="px-4 py-3 text-ink/70">
                      <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-xs font-mono text-emerald-d">
                        {row.system_role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {BOOL_LABEL(row.gets_members_row)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {BOOL_LABEL(row.gets_followup)}
                    </td>
                    <td className="px-4 py-3 text-center text-ink/60">{row.sort_order}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditing(row.id)}
                        className="mr-2 text-xs font-semibold text-sage-d hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(row.id, row.display_name)}
                        disabled={deletePending}
                        className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/50">
                  No role mappings yet. Run migration first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add form */}
      {adding ? (
        <AddForm onDone={refresh} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-4 rounded-xl border border-dashed border-emerald/40 px-5 py-2 text-sm font-semibold text-emerald hover:bg-emerald/5"
        >
          + Add Role Mapping
        </button>
      )}

      <div className="mt-6 rounded-xl bg-cream-2 px-4 py-3 text-xs text-ink/60 space-y-1">
        <p className="font-semibold text-ink/80">How it works</p>
        <p>• <strong>Display Name</strong> — label you enter in the Excel import file (case-insensitive)</p>
        <p>• <strong>System Role</strong> — the actual DB role the user gets</p>
        <p>• <strong>Members Row</strong> — whether this role gets a health-track profile (weight, membership)</p>
        <p>• <strong>Follow-up Tasks</strong> — whether 12 months of call/visit tasks are auto-generated</p>
        <p>• To add a brand-new system role: run <code className="rounded bg-cream px-1">ALTER TYPE user_role ADD VALUE &apos;new_role&apos;;</code> in Supabase first</p>
      </div>
    </div>
  );
}
