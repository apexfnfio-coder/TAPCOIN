"use client";

import { useEffect, useState } from "react";

interface LogRow {
  id: string; action: string; actor: string; target: string;
  meta: string; ip: string; createdAt: string;
}

const FILTERS = ["", "ADMIN_", "WALLET_", "RUN_", "GUEST_", "PROFILE_"];

export default function AdminSecurityPage() {
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [action, setAction] = useState("");

  async function load(a = action, p = page) {
    const r = await fetch(`/api/admin/audit?action=${encodeURIComponent(a)}&page=${p}`, { cache: "no-store" });
    const j = await r.json();
    if (j.ok) { setLogs(j.data.logs); setPages(j.data.pages); }
  }
  useEffect(() => { load("", 1); }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h2 className="card-title" style={{ margin: 0 }}>Security & Audit Log</h2>
        <div className="tabs">
          {FILTERS.map((f) => (
            <button key={f || "all"} className={action === f ? "active" : ""} onClick={() => { setAction(f); setPage(1); load(f, 1); }}>
              {f === "" ? "All" : f.replace("_", " ").toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="panel" style={{ overflow: "hidden" }}>
        {logs === null ? (
          <div style={{ padding: 20 }}>{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 10 }} />)}</div>
        ) : logs.length === 0 ? (
          <div className="empty-state"><div className="big">No audit events</div><div>Authentication, score, and admin events are recorded here.</div></div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Target</th><th>IP</th><th>Details</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="sub" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{new Date(l.createdAt).toLocaleString()}</td>
                  <td><span className={`chip ${l.action.startsWith("ADMIN_") ? "scheduled" : l.action.includes("FAILED") || l.action.includes("REJECTED") ? "danger" : ""}`}>{l.action}</span></td>
                  <td>{l.actor}</td>
                  <td className="mono sub" style={{ fontSize: 11, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{l.target || "—"}</td>
                  <td className="mono sub" style={{ fontSize: 11 }}>{l.ip || "—"}</td>
                  <td className="mono sub" style={{ fontSize: 11, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }} title={l.meta}>{l.meta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pages > 1 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: 14 }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => { setPage(page - 1); load(action, page - 1); }}>← Prev</button>
            <span className="sub" style={{ alignSelf: "center" }}>Page {page} / {pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => { setPage(page + 1); load(action, page + 1); }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
