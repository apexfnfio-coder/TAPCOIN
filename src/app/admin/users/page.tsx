"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/Providers";

interface UserRow {
  id: string;
  username: string;
  walletAddress: string | null;
  isGuest: boolean;
  role: string;
  status: string;
  bestScore: number;
  totalRuns: number;
  totalTrees: number;
  paidSeason?: string | null;
  accessOverride?: boolean | null;
  createdAt: string;
  lastSeenAt: string;
}

interface UserDetail {
  user: UserRow & { totalGreen: number; totalRedHits: number; totalPlayMs: number };
  recentRuns: { id: string; score: number; trees: number; durationMs: number; valid: boolean; flags: string | null; competition: string | null; createdAt: string }[];
  competitions: { name: string; status: string; bestScore: number; runs: number }[];
  recentSessions: { ip: string; userAgent: string; createdAt: string }[];
}

interface PaymentRow {
  id: string;
  wallet: string;
  recipient: string;
  amountSol: number;
  signature: string;
  season: string;
  status: string;
  solscanUrl: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    avatar: string;
    walletAddress: string | null;
  } | null;
}

export default function AdminUsersPage() {
  const { me } = useApp();
  const [activeTab, setActiveTab] = useState<"users" | "payments">("users");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [error, setError] = useState("");

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [totalCollectedSol, setTotalCollectedSol] = useState(0);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const currentSeason = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;

  async function loadUsers(query = q, p = page) {
    try {
      const r = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}&page=${p}`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok) { setRows(j.data.users); setPages(j.data.pages); }
    } catch { /* keep */ }
  }

  async function loadPayments() {
    setPaymentsLoading(true);
    try {
      const r = await fetch("/api/admin/payments", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) {
        setPayments(j.data.payments || []);
        setTotalCollectedSol(j.data.totalCollectedSol || 0);
      }
    } catch { /* keep */ }
    setPaymentsLoading(false);
  }

  useEffect(() => {
    loadUsers("", 1);
    loadPayments();
  }, []);

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
      loadUsers();
    } else {
      setError(r.error?.message || "Action failed.");
    }
  }

  async function setAccessOverride(id: string, override: boolean | null) {
    setError("");
    const r = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessOverride: override }),
    }).then((x) => x.json());
    if (r.ok) {
      if (detail) {
        setDetail({
          ...detail,
          user: { ...detail.user, accessOverride: override },
        });
      }
      loadUsers();
    } else {
      setError(r.error?.message || "Action failed.");
    }
  }

  return (
    <div>
      {/* Top Tab Bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          className={`btn ${activeTab === "users" ? "btn-gold" : "btn-ghost"}`}
          onClick={() => setActiveTab("users")}
        >
          👥 Players & Access Control
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "payments" ? "btn-gold" : "btn-ghost"}`}
          onClick={() => {
            setActiveTab("payments");
            loadPayments();
          }}
        >
          ⚡ Live Solscan Payments (0.01 SOL)
        </button>
      </div>

      {activeTab === "users" ? (
        <>
          <div className="panel panel-pad">
            <form
              onSubmit={(e) => { e.preventDefault(); setPage(1); loadUsers(q, 1); }}
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
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Wallet</th>
                    <th style={{ textAlign: "right" }}>Best</th>
                    <th style={{ textAlign: "right" }}>Runs</th>
                    <th>Season Access</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => {
                    const isAdmin = u.role === "admin";
                    const isPaid = u.paidSeason === currentSeason;
                    const hasAccess = isAdmin || u.accessOverride === true || (isPaid && u.accessOverride !== false);

                    return (
                      <tr key={u.id}>
                        <td>
                          <b>{u.username}</b>
                          {isAdmin && <span className="chip scheduled" style={{ marginLeft: 8 }}>Admin</span>}
                          {u.isGuest && <span className="chip" style={{ marginLeft: 8 }}>Guest</span>}
                        </td>
                        <td className="mono sub" style={{ fontSize: 12 }}>
                          {u.walletAddress ? `${u.walletAddress.slice(0, 4)}...${u.walletAddress.slice(-4)}` : "—"}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-display)", color: "var(--gold)" }}>
                          {u.bestScore.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right" }}>{u.totalRuns}</td>
                        <td>
                          {isAdmin ? (
                            <span className="chip scheduled">Admin (Free)</span>
                          ) : u.accessOverride === true ? (
                            <span className="chip live">Force Active</span>
                          ) : u.accessOverride === false ? (
                            <span className="chip danger">Revoked</span>
                          ) : isPaid ? (
                            <span className="chip live">Paid ({u.paidSeason})</span>
                          ) : (
                            <span className="chip" style={{ opacity: 0.6 }}>Unpaid (0.01 SOL)</span>
                          )}
                        </td>
                        <td>
                          {u.status === "active" ? <span className="chip live">Active</span> : <span className="chip danger">Suspended</span>}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openDetail(u.id)}>Manage</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {pages > 1 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: 14 }}>
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => { setPage(page - 1); loadUsers(q, page - 1); }}>← Prev</button>
                <span className="sub" style={{ alignSelf: "center" }}>Page {page} / {pages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => { setPage(page + 1); loadUsers(q, page + 1); }}>Next →</button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* TAB 2: LIVE SOLSCAN PAYMENTS */
        <div className="panel">
          <div className="panel-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>On-Chain 0.01 SOL Season Pass Transactions</h2>
              <div className="sub" style={{ fontSize: 12, marginTop: 4 }}>
                Verified via Solana RPC to treasury: <code className="mono" style={{ color: "var(--gold)" }}>95sKZtgoYZS2Qntti4DhUvPqTC6Ra5rWa7wpmiW6ojr7</code>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>TOTAL COLLECTED</div>
              <div style={{ fontSize: 20, color: "var(--green)", fontWeight: 700, fontFamily: "monospace" }}>
                {totalCollectedSol.toFixed(2)} SOL
              </div>
            </div>
          </div>

          {paymentsLoading ? (
            <div style={{ padding: 20 }}>{[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8 }} />)}</div>
          ) : payments.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}><div className="big">No payments recorded yet</div></div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Player / Wallet</th>
                  <th>Amount</th>
                  <th>Season</th>
                  <th>Solscan Link</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="sub" style={{ fontSize: 12 }}>
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <b>{p.user?.username || "Player"}</b>
                      <div className="mono sub" style={{ fontSize: 11 }}>
                        {p.wallet.slice(0, 6)}...{p.wallet.slice(-6)}
                      </div>
                    </td>
                    <td style={{ color: "var(--green)", fontWeight: 600, fontFamily: "monospace" }}>
                      {p.amountSol} SOL
                    </td>
                    <td>
                      <span className="chip">{p.season}</span>
                    </td>
                    <td>
                      <a
                        href={p.solscanUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mono"
                        style={{ color: "var(--cyan)", textDecoration: "underline", fontSize: 12 }}
                      >
                        {p.signature.slice(0, 8)}...{p.signature.slice(-8)} ↗
                      </a>
                    </td>
                    <td>
                      <span className="chip live">Confirmed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* User Detail & Access Control Modal */}
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
                <label>Wallet Address</label>
                <div className="mono sub" style={{ fontSize: 12, wordBreak: "break-all" }}>{detail.user.walletAddress || "— (guest)"}</div>
              </div>

              {/* Access Control Switcher */}
              <div className="field" style={{ background: "var(--bg-card)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>
                  Season Pass Access Control (0.01 SOL Entry)
                </label>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                  Current Status:{" "}
                  {detail.user.role === "admin" ? (
                    <strong style={{ color: "var(--gold)" }}>Admin (Perpetual Free Access)</strong>
                  ) : detail.user.accessOverride === true ? (
                    <strong style={{ color: "var(--green)" }}>Manual Force Active (Granted by Admin)</strong>
                  ) : detail.user.accessOverride === false ? (
                    <strong style={{ color: "var(--red)" }}>Revoked / Banned by Admin</strong>
                  ) : detail.user.paidSeason === currentSeason ? (
                    <strong style={{ color: "var(--green)" }}>Paid Active ({detail.user.paidSeason})</strong>
                  ) : (
                    <strong style={{ color: "var(--text-dim)" }}>Unpaid for Season {currentSeason}</strong>
                  )}
                </div>

                {detail.user.role !== "admin" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-green btn-sm"
                      onClick={() => setAccessOverride(detail.user.id, true)}
                    >
                      ✓ Grant Access (Force Active)
                    </button>
                    <button
                      type="button"
                      className="btn btn-wood btn-sm"
                      onClick={() => setAccessOverride(detail.user.id, false)}
                    >
                      ✕ Revoke Access (Block Runs)
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setAccessOverride(detail.user.id, null)}
                    >
                      ↺ Reset to Default (Payment Required)
                    </button>
                  </div>
                )}
              </div>

              <div className="field" style={{ marginTop: 14 }}>
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
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
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
