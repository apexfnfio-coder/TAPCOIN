"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/Providers";

interface UserRow {
  id: string; username: string; walletAddress: string | null; isGuest: boolean;
  role: string; status: string; bestScore: number; totalRuns: number; totalTrees: number;
  createdAt: string; lastSeenAt: string;
}

interface UserDetail {
  user: UserRow & { totalGreen: number; totalRedHits: number; totalPlayMs: number };
  recentRuns: { id: string; score: number; trees: number; durationMs: number; valid: boolean; flags: string | null; competition: string | null; createdAt: string }[];
  competitions: { name: string; status: string; bestScore: number; runs: number }[];
  recentSessions: { ip: string; userAgent: string; createdAt: string }[];
}

export default function AdminUsersPage() {
  const { me } = useApp();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [error, setError] = useState("");

  async function load(query = q, p = page) {
    try {
      const r = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}&page=${p}`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok) { setRows(j.data.users); setPages(j.data.pages); }
    } catch { /* keep */ }
  }

  useEffect(() => { load("", 1); }, []);

  async function openDetail(id: string) {
    const r = await fetch(`/api/admin/users/${id}`, { cache: "no-store" });
    const j = await r.json();
    if (j.ok) setDetail(j.data);
  }

  async function setStatus(id: string, status: "active" | "suspended") {
    setError("");
    const r = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).then((x) => x.json());
    if (r.ok) {
      setDetail(null);
      load();
    } else {
      setError(r.error?.message || "Action failed.");
    }
  }

  return (
    <div>
      <div className="panel panel-pad">
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); load(q, 1); }}
          style={{ display: "flex", gap: 10 }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search username or wallet…"
            style={{ flex: 1, background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 9, color: "var(--cream)", padding: "11px 13px" }}
          />
          <button className="btn btn-gold" type="submit">Search</button>
        </form>
      </div>
      {error && <div className="error-box" style={{ marginTop: 12 }}>{error}</div>}

      <div className="panel" style={{ marginTop: 14, overflow: "hidden" }}>
        {rows === null ? (
          <div style={{ padding: 20 }}>{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 10 }} />)}</div>
        ) : rows.length === 0 ? (
          <div className="empty-state"><div className="big">No users found</div></div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Player</th><th>Wallet</th><th style={{ textAlign: "right" }}>Best</th><th style={{ textAlign: "right" }}>Runs</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.username}</b>
                    {u.role === "admin" && <span className="chip scheduled" style={{ marginLeft: 8 }}>Admin</span>}
                    {u.isGuest && <span className="chip" style={{ marginLeft: 8 }}>Guest</span>}
                  </td>
                  <td className="mono sub" style={{ fontSize: 12 }}>{u.walletAddress ? `${u.walletAddress.slice(0, 4)}...${u.walletAddress.slice(-4)}` : "—"}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-display)", color: "var(--gold)" }}>{u.bestScore.toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>{u.totalRuns}</td>
                  <td>{u.status === "active" ? <span className="chip live">Active</span> : <span className="chip danger">Suspended</span>}</td>
                  <td style={{ textAlign: "right" }}><button className="btn btn-ghost btn-sm" onClick={() => openDetail(u.id)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pages > 1 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: 14 }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => { setPage(page - 1); load(q, page - 1); }}>← Prev</button>
            <span className="sub" style={{ alignSelf: "center" }}>Page {page} / {pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => { setPage(page + 1); load(q, page + 1); }}>Next →</button>
          </div>
        )}
      </div>

      {detail && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-head">
              <div className="modal-title">{detail.user.username}</div>
              <button className="modal-x" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                <div className="stat-tile"><div className="k">Best</div><div className="v">{detail.user.bestScore.toLocaleString()}</div></div>
                <div className="stat-tile"><div className="k">Runs</div><div className="v cream">{detail.user.totalRuns}</div></div>
                <div className="stat-tile"><div className="k">Trees</div><div className="v cream">{detail.user.totalTrees}</div></div>
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label>Wallet</label>
                <div className="mono sub" style={{ fontSize: 12, wordBreak: "break-all" }}>{detail.user.walletAddress || "— (guest)"}</div>
              </div>
              <div className="field">
                <label>Recent sessions</label>
                {detail.recentSessions.length === 0 ? <span className="sub">None</span> : (
                  <table className="tbl">
                    <tbody>
                      {detail.recentSessions.map((s, i) => (
                        <tr key={i}><td className="mono" style={{ fontSize: 12 }}>{s.ip || "?"}</td><td className="sub" style={{ fontSize: 12 }}>{s.userAgent.slice(0, 42)}…</td><td className="sub" style={{ fontSize: 12 }}>{new Date(s.createdAt).toLocaleDateString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="field">
                <label>Recent runs</label>
                {detail.recentRuns.length === 0 ? <span className="sub">None</span> : (
                  <table className="tbl">
                    <tbody>
                      {detail.recentRuns.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>{r.score.toLocaleString()}</td>
                          <td>{r.trees} trees</td>
                          <td>{r.valid ? <span className="chip live">Valid</span> : <span className="chip danger" title={r.flags || ""}>Flagged</span>}</td>
                          <td className="sub">{new Date(r.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {detail.user.id !== me?.id && (
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  {detail.user.status === "active" ? (
                    <button className="btn btn-wood" onClick={() => setStatus(detail.user.id, "suspended")}>Suspend account</button>
                  ) : (
                    <button className="btn btn-gold" onClick={() => setStatus(detail.user.id, "active")}>Reactivate account</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
