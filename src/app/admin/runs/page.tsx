"use client";

import { useEffect, useState } from "react";

interface RunRow {
  id: string; username: string; userId: string; gameSlug: string; level: number; targetTrees: number;
  progress: number; endedBy: string; score: number; trees: number; green: number; redHits: number;
  durationMs: number; valid: boolean; flags: string | null; competition: string | null; createdAt: string;
}

export default function AdminRunsPage() {
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [notice, setNotice] = useState("");

  async function load(f = flaggedOnly, p = page) {
    const r = await fetch(`/api/admin/runs?flagged=${f ? 1 : 0}&page=${p}`, { cache: "no-store" });
    const j = await r.json();
    if (j.ok) { setRuns(j.data.runs); setPages(j.data.pages); }
  }
  useEffect(() => { load(flaggedOnly, 1); setPage(1); }, [flaggedOnly]);

  async function invalidate(id: string, invalidate: boolean) {
    setNotice("");
    const r = await fetch("/api/admin/runs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId: id, invalidate }) }).then((x) => x.json());
    if (r.ok) { setNotice(invalidate ? "Run invalidated." : "Run restored."); load(); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="card-title" style={{ margin: 0 }}>Score Review</h2>
        <div className="tabs">
          <button className={flaggedOnly ? "active" : ""} onClick={() => setFlaggedOnly(true)}>Flagged</button>
          <button className={!flaggedOnly ? "active" : ""} onClick={() => setFlaggedOnly(false)}>All runs</button>
        </div>
      </div>
      {notice && <div className="sub" style={{ color: "var(--gold)", marginBottom: 10 }}>{notice}</div>}

      <div className="panel" style={{ overflow: "hidden" }}>
        {runs === null ? (
          <div style={{ padding: 20 }}>{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 10 }} />)}</div>
        ) : runs.length === 0 ? (
          <div className="empty-state"><div className="big">{flaggedOnly ? "No flagged runs" : "No runs yet"}</div><div>{flaggedOnly ? "Anti-cheat has nothing to report. Nice." : "Submitted runs will appear here."}</div></div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Player</th><th>Module</th><th style={{ textAlign: "right" }}>Level</th><th style={{ textAlign: "right" }}>Progress</th><th style={{ textAlign: "right" }}>Score</th><th>Status</th><th>When</th><th></th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.username}</b>{r.competition && <div className="sub" style={{ fontSize: 11 }}>{r.competition}</div>}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{r.gameSlug}</td>
                  <td style={{ textAlign: "right" }}>{r.level}</td>
                  <td style={{ textAlign: "right" }}>{r.progress}/{r.targetTrees}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-display)", color: "var(--gold)" }}>{r.score.toLocaleString()}</td>
                  <td>{r.valid ? <span className="chip live">{r.endedBy}</span> : <span className="chip danger">{r.flags || "FLAGGED"}</span>}</td>
                  <td className="sub" style={{ fontSize: 12 }}>{new Date(r.createdAt).toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>
                    {r.valid ? <button className="btn btn-ghost btn-sm" onClick={() => invalidate(r.id, true)}>Invalidate</button> : <button className="btn btn-ghost btn-sm" onClick={() => invalidate(r.id, false)}>Restore</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pages > 1 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: 14 }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => { setPage(page - 1); load(flaggedOnly, page - 1); }}>Prev</button>
            <span className="sub" style={{ alignSelf: "center" }}>Page {page} / {pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => { setPage(page + 1); load(flaggedOnly, page + 1); }}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
