"use client";

import { useEffect, useState } from "react";

interface Comp {
  id: string; gameSlug: string; name: string; description: string; rules: string; status: string;
  startsAt: string; endsAt: string; rewards: Record<string, string | number>;
  participants: number; runs: number; createdAt: string;
}

const emptyForm = {
  gameSlug: "tap-chimp", name: "", description: "", rules: "",
  startsAt: "", endsAt: "", rewards: "",
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminCompetitionsPage() {
  const [comps, setComps] = useState<Comp[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/competitions", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) setComps(j.data.competitions);
  }
  useEffect(() => { load(); }, []);

  function parseRewards(txt: string): Record<string, string | number> {
    // format: "1=500 $TAP, 2=250 $TAP, 3=100 $TAP"
    const out: Record<string, string | number> = {};
    txt.split(",").map((s) => s.trim()).filter(Boolean).forEach((pair) => {
      const [k, ...rest] = pair.split("=");
      if (k && rest.length) out[k.trim()] = rest.join("=").trim();
    });
    return out;
  }

  function rewardsToText(r: Record<string, string | number>) {
    return Object.entries(r).map(([k, v]) => `${k}=${v}`).join(", ");
  }

  async function submit() {
    setError(""); setNotice("");
    const payload: any = {
      gameSlug: form.gameSlug,
      name: form.name,
      description: form.description,
      rules: form.rules,
      rewards: parseRewards(form.rewards),
    };
    if (form.startsAt) payload.startsAt = new Date(form.startsAt).toISOString();
    if (form.endsAt) payload.endsAt = new Date(form.endsAt).toISOString();

    const url = editingId ? `/api/admin/competitions/${editingId}` : "/api/admin/competitions";
    const method = editingId ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then((x) => x.json());
    if (r.ok) {
      setNotice(editingId ? "Competition updated." : "Competition created.");
      setForm(emptyForm); setEditingId(null); setShowForm(false);
      load();
    } else {
      setError(r.error?.message || "Save failed.");
    }
  }

  async function setStatus(id: string, status: string) {
    setError(""); setNotice("");
    const r = await fetch(`/api/admin/competitions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    }).then((x) => x.json());
    if (r.ok) { setNotice(`Status → ${status}.`); load(); }
    else setError(r.error?.message || "Failed.");
  }

  async function archive(id: string) {
    if (!confirm("Archive this competition? It stays in history but disappears from listings.")) return;
    await fetch(`/api/admin/competitions/${id}`, { method: "DELETE" });
    load();
  }

  function edit(c: Comp) {
    setEditingId(c.id);
    setForm({
      gameSlug: c.gameSlug, name: c.name, description: c.description, rules: c.rules,
      startsAt: toLocalInput(c.startsAt), endsAt: toLocalInput(c.endsAt),
      rewards: rewardsToText(c.rewards || {}),
    });
    setShowForm(true);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="card-title" style={{ margin: 0 }}>Competitions</h2>
        <button className="btn btn-gold" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}>
          {showForm ? "Close" : "+ New Competition"}
        </button>
      </div>
      {error && <div className="error-box">{error}</div>}
      {notice && <div className="sub" style={{ color: "var(--gold)", marginBottom: 10 }}>{notice}</div>}

      {showForm && (
        <div className="panel panel-pad" style={{ marginBottom: 16 }}>
          <h3 className="card-title">{editingId ? "Edit Competition" : "Create Competition"}</h3>
          <div className="form-row">
            <div className="field"><label>Game module</label><input value={form.gameSlug} onChange={(e) => setForm({ ...form, gameSlug: e.target.value.trim() })} /></div>
            <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Weekly Chop Challenge" /></div>
          </div>
          <div className="field"><label>Description</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Chop as many trees as you can. Top players win $TAP rewards." /></div>
          <div className="form-row">
            <div className="field"><label>Starts at</label><input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
            <div className="field"><label>Ends at</label><input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></div>
          </div>
          <div className="field"><label>Rules</label><textarea rows={2} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} placeholder="Best single verified run counts. Unlimited attempts while live." /></div>
          <div className="field"><label>Rewards (rank=prize, comma separated)</label><input value={form.rewards} onChange={(e) => setForm({ ...form, rewards: e.target.value })} placeholder="1=500 $TAP, 2=250 $TAP, 3=100 $TAP" /></div>
          <button className="btn btn-gold" onClick={submit} disabled={!form.name || (!editingId && (!form.startsAt || !form.endsAt))}>
            {editingId ? "Save changes" : "Create"}
          </button>
        </div>
      )}

      <div className="panel" style={{ overflow: "hidden" }}>
        {comps === null ? (
          <div style={{ padding: 20 }}>{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 10 }} />)}</div>
        ) : comps.length === 0 ? (
          <div className="empty-state">
            <div className="big">No competitions yet</div>
            <div>Create the first one with the button above.</div>
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Name</th><th>Module</th><th>Status</th><th>Window</th><th style={{ textAlign: "right" }}>Players</th><th style={{ textAlign: "right" }}>Runs</th><th></th></tr></thead>
            <tbody>
              {comps.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td className="mono" style={{ fontSize: 12 }}>{c.gameSlug}</td>
                  <td><span className={`chip ${c.status}`}>{c.status}</span></td>
                  <td className="sub" style={{ fontSize: 12 }}>{new Date(c.startsAt).toLocaleString()} → {new Date(c.endsAt).toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>{c.participants}</td>
                  <td style={{ textAlign: "right" }}>{c.runs}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => edit(c)}>Edit</button>{" "}
                    {c.status === "scheduled" && <button className="btn btn-ghost btn-sm" onClick={() => setStatus(c.id, "live")}>Start</button>}{" "}
                    {c.status === "live" && <button className="btn btn-ghost btn-sm" onClick={() => setStatus(c.id, "ended")}>End</button>}{" "}
                    {c.status !== "archived" && <button className="btn btn-ghost btn-sm" onClick={() => archive(c.id)}>Archive</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
