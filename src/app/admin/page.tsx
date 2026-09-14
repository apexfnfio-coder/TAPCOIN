"use client";

import { useEffect, useState } from "react";

interface Overview {
  totals: { users: number; runs: number; trees: number; green: number };
  officialPlayers: number;
  season: string;
  treasuryPool: { balanceSol: number; prizePoolSol: number };
  today: { users: number; runs: number };
  liveCompetitions: number;
  flaggedRuns: number;
  recentRuns: { id: string; username: string; gameSlug: string; level: number; progress: number; targetTrees: number; endedBy: string; score: number; trees: number; durationMs: number; valid: boolean; flags: string | null; createdAt: string }[];
  recentPayments: { id: string; wallet: string; username: string; amountSol: number; signature: string; solscanUrl: string; createdAt: string }[];
  recentAudit: { id: string; action: string; actor: string; createdAt: string }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => j.ok && setData(j.data))
      .catch(() => {});
  }, []);

  if (!data) return <div className="spinner" />;

  return (
    <div>
      <div className="kpi-grid">
        <div className="stat-tile">
          <div className="k">Total Users</div>
          <div className="v">{data.totals.users.toLocaleString()}</div>
        </div>
        <div className="stat-tile" style={{ borderColor: "rgba(0, 255, 163, 0.4)" }}>
          <div className="k">Official Season Players</div>
          <div className="v" style={{ color: "var(--green)" }}>{data.officialPlayers.toLocaleString()}</div>
        </div>
        <div className="stat-tile" style={{ borderColor: "rgba(255, 208, 0, 0.4)" }}>
          <div className="k">10% Dev Treasury Pool</div>
          <div className="v" style={{ color: "var(--gold)", fontFamily: "monospace" }}>{data.treasuryPool.prizePoolSol.toFixed(4)} SOL</div>
        </div>
        <div className="stat-tile">
          <div className="k">Treasury Wallet Balance</div>
          <div className="v cream" style={{ fontFamily: "monospace" }}>{data.treasuryPool.balanceSol.toFixed(4)} SOL</div>
        </div>
        <div className="stat-tile">
          <div className="k">Valid runs</div>
          <div className="v cream">{data.totals.runs.toLocaleString()}</div>
        </div>
        <div className="stat-tile">
          <div className="k">Trees chopped</div>
          <div className="v cream">{data.totals.trees.toLocaleString()}</div>
        </div>
        <div className="stat-tile" style={data.flaggedRuns > 0 ? { borderColor: "var(--red-deep)" } : undefined}>
          <div className="k">Flagged / Unpaid runs</div>
          <div className="v" style={{ color: data.flaggedRuns > 0 ? "var(--red)" : "var(--cream)" }}>{data.flaggedRuns}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        {/* Recent Submissions */}
        <div className="panel">
          <div className="panel-pad" style={{ paddingBottom: 0 }}><h2 className="card-title">Recent Submissions (Level & Points)</h2></div>
          {data.recentRuns.length === 0 ? (
            <div className="empty-state"><div className="big">No runs yet</div></div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Player</th><th style={{ textAlign: "right" }}>Level</th><th style={{ textAlign: "right" }}>Progress</th><th style={{ textAlign: "right" }}>Score</th><th style={{ textAlign: "right" }}>Status</th></tr></thead>
              <tbody>
                {data.recentRuns.map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.username}</b><div className="sub mono" style={{ fontSize: 11 }}>{r.gameSlug}</div></td>
                    <td style={{ textAlign: "right" }}>{r.level}</td>
                    <td style={{ textAlign: "right" }}>{r.progress}/{r.targetTrees}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-display)", color: "var(--gold)" }}>{r.score.toLocaleString()}</td>
                    <td style={{ textAlign: "right" }}>{r.valid ? <span className="chip live">{r.endedBy}</span> : <span className="chip danger" title={r.flags || ""}>Flagged</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Solscan Payments */}
        <div className="panel">
          <div className="panel-pad" style={{ paddingBottom: 0 }}><h2 className="card-title">Recent On-Chain 0.01 SOL Payments</h2></div>
          {data.recentPayments.length === 0 ? (
            <div className="empty-state"><div className="big">No payments yet</div></div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Player</th><th>Amount</th><th>Solscan Tx</th><th style={{ textAlign: "right" }}>Time</th></tr></thead>
              <tbody>
                {data.recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.username}</b>
                      <div className="mono sub" style={{ fontSize: 11 }}>{p.wallet.slice(0, 4)}...{p.wallet.slice(-4)}</div>
                    </td>
                    <td style={{ color: "var(--green)", fontWeight: 600, fontFamily: "monospace" }}>{p.amountSol} SOL</td>
                    <td>
                      <a href={p.solscanUrl} target="_blank" rel="noreferrer" className="mono" style={{ color: "var(--cyan)", textDecoration: "underline", fontSize: 12 }}>
                        {p.signature.slice(0, 6)}...{p.signature.slice(-6)} ↗
                      </a>
                    </td>
                    <td style={{ textAlign: "right" }} className="sub">{new Date(p.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
