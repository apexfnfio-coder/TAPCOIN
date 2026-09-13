"use client";

import { useEffect, useState } from "react";

interface FullConfig {
  game: {
    runDurationSec: number; treeHp: number; chopIntervalMs: number; pointsPerTree: number;
    pointsPerGreen: number; redHitPenaltySec: number; redHitScorePenalty: number; playerSpeed: number;
    treeSpacingMin: number; treeSpacingMax: number; candleChanceGreen: number; candleChanceRed: number;
    maxDurationSec: number; defaultGameSlug: string; levelGoalBase: number; levelGoalGrowth: number;
    difficultyGrowth: number; maxLevelDurationSec: number;
  };
  token: {
    symbol: string; name: string; contractAddress: string; cluster: string;
    decimals: number; buyLinks: { label: string; url: string }[]; explorerUrl: string;
    priceUsd: number; priceSource: "local" | "manual" | "api"; minHoldingUsd: number;
  };
  leaderboardEligibility: { enabled: boolean; state: "requires-token" | "open"; text: string };
  links: { twitter: string; telegram: string; discord: string; website: string };
  announcement: string;
  maintenance: boolean;
}

const GAME_FIELDS: { key: keyof FullConfig["game"]; label: string; step?: string; hint?: string }[] = [
  { key: "treeHp", label: "Base tree HP" },
  { key: "chopIntervalMs", label: "Base chop interval (ms)" },
  { key: "pointsPerTree", label: "Points per tree" },
  { key: "pointsPerGreen", label: "Points per green candle" },
  { key: "redHitPenaltySec", label: "Red hit time penalty (sec)" },
  { key: "redHitScorePenalty", label: "Red hit score penalty" },
  { key: "playerSpeed", label: "Base player speed (px/s)" },
  { key: "treeSpacingMin", label: "Tree spacing min (px)" },
  { key: "treeSpacingMax", label: "Tree spacing max (px)" },
  { key: "candleChanceGreen", label: "Green candle chance", step: "0.01" },
  { key: "candleChanceRed", label: "Red candle chance", step: "0.01" },
  { key: "levelGoalBase", label: "Level 1 tree goal" },
  { key: "levelGoalGrowth", label: "Level goal growth", step: "0.1" },
  { key: "difficultyGrowth", label: "Difficulty growth", step: "0.01" },
  { key: "maxLevelDurationSec", label: "Level safety limit (sec)" },
];

export default function AdminConfigPage() {
  const [cfg, setCfg] = useState<FullConfig | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => j.ok && setCfg(j.data.config))
      .catch(() => {});
  }, []);

  async function save() {
    if (!cfg) return;
    setSaving(true); setError(""); setNotice("");
    const r = await fetch("/api/admin/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) }).then((x) => x.json());
    setSaving(false);
    if (r.ok) { setCfg(r.data.config); setNotice("Configuration saved. User-facing app updated instantly."); }
    else setError(r.error?.message || "Save failed.");
  }

  if (!cfg) return <div className="spinner" />;

  const num = (v: unknown) => (typeof v === "number" && !isNaN(v) ? v : 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="card-title" style={{ margin: 0 }}>System Settings</h2>
        <button className="btn btn-gold" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save all"}</button>
      </div>
      {error && <div className="error-box">{error}</div>}
      {notice && <div className="sub" style={{ color: "var(--gold)", marginBottom: 10 }}>{notice}</div>}

      <div className="panel panel-pad" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Game Modules</h3>
        <div className="form-row">
          <div className="field"><label>Default module</label><input value={cfg.game.defaultGameSlug} onChange={(e) => setCfg({ ...cfg, game: { ...cfg.game, defaultGameSlug: e.target.value.trim() } })} /></div>
          <div className="field"><label>Mode</label><input value="Level-based unlimited progression" disabled /></div>
        </div>
        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr", display: "grid", gap: 12 }}>
          {GAME_FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <input type="number" step={f.step || (String(f.key).includes("Chance") ? "0.01" : "1")} value={num(cfg.game[f.key])} onChange={(e) => setCfg({ ...cfg, game: { ...cfg.game, [f.key]: parseFloat(e.target.value) || 0 } })} />
            </div>
          ))}
        </div>
      </div>

      <div className="panel panel-pad" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Token & Leaderboard Eligibility</h3>
        <div className="form-row">
          <div className="field"><label>Symbol</label><input value={cfg.token.symbol} onChange={(e) => setCfg({ ...cfg, token: { ...cfg.token, symbol: e.target.value } })} /></div>
          <div className="field"><label>Name</label><input value={cfg.token.name} onChange={(e) => setCfg({ ...cfg, token: { ...cfg.token, name: e.target.value } })} /></div>
        </div>
        <div className="field"><label>Contract address (Solana mint)</label><input className="mono" value={cfg.token.contractAddress} onChange={(e) => setCfg({ ...cfg, token: { ...cfg.token, contractAddress: e.target.value.trim() } })} /></div>
        <div className="form-row">
          <div className="field"><label>Cluster</label><input value={cfg.token.cluster} onChange={(e) => setCfg({ ...cfg, token: { ...cfg.token, cluster: e.target.value } })} /></div>
          <div className="field"><label>Explorer URL</label><input value={cfg.token.explorerUrl} onChange={(e) => setCfg({ ...cfg, token: { ...cfg.token, explorerUrl: e.target.value } })} /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Decimals</label><input type="number" value={cfg.token.decimals} onChange={(e) => setCfg({ ...cfg, token: { ...cfg.token, decimals: parseInt(e.target.value, 10) || 0 } })} /></div>
          <div className="field"><label>Estimated price USD</label><input type="number" step="0.000001" value={cfg.token.priceUsd} onChange={(e) => setCfg({ ...cfg, token: { ...cfg.token, priceUsd: parseFloat(e.target.value) || 0 } })} /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Price source</label><select value={cfg.token.priceSource} onChange={(e) => setCfg({ ...cfg, token: { ...cfg.token, priceSource: e.target.value as FullConfig["token"]["priceSource"] } })}><option value="local">Local fallback</option><option value="manual">Manual</option><option value="api">API</option></select></div>
          <div className="field"><label>Minimum holding USD</label><input type="number" step="0.01" value={cfg.token.minHoldingUsd} onChange={(e) => setCfg({ ...cfg, token: { ...cfg.token, minHoldingUsd: parseFloat(e.target.value) || 0 } })} /></div>
        </div>
        <div className="form-row">
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}><input type="checkbox" checked={cfg.leaderboardEligibility.enabled} onChange={(e) => setCfg({ ...cfg, leaderboardEligibility: { ...cfg.leaderboardEligibility, enabled: e.target.checked } })} style={{ width: 18, height: 18 }} /> Require eligibility checks</label>
          <div className="field"><label>Leaderboard mode</label><select value={cfg.leaderboardEligibility.state} onChange={(e) => setCfg({ ...cfg, leaderboardEligibility: { ...cfg.leaderboardEligibility, state: e.target.value as FullConfig["leaderboardEligibility"]["state"] } })}><option value="requires-token">Requires verified token</option><option value="open">Open</option></select></div>
        </div>
        <div className="field"><label>Eligibility text</label><input value={cfg.leaderboardEligibility.text} onChange={(e) => setCfg({ ...cfg, leaderboardEligibility: { ...cfg.leaderboardEligibility, text: e.target.value } })} /></div>
        <div className="field">
          <label>Buy links (label=url, one per line)</label>
          <textarea rows={3} value={cfg.token.buyLinks.map((l) => `${l.label}=${l.url}`).join("\n")} onChange={(e) => {
            const buyLinks = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => {
              const [label, ...rest] = line.split("=");
              return { label: (label || "").trim(), url: rest.join("=").trim() };
            }).filter((l) => l.label && l.url);
            setCfg({ ...cfg, token: { ...cfg.token, buyLinks } });
          }} placeholder={"Jupiter=https://jup.ag/swap/SOL-...\nRaydium=https://raydium.io/swap/..."} />
        </div>
      </div>

      <div className="panel panel-pad" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Official Links</h3>
        <div className="form-row">
          <div className="field"><label>X / Twitter</label><input value={cfg.links.twitter} onChange={(e) => setCfg({ ...cfg, links: { ...cfg.links, twitter: e.target.value } })} /></div>
          <div className="field"><label>Telegram</label><input value={cfg.links.telegram} onChange={(e) => setCfg({ ...cfg, links: { ...cfg.links, telegram: e.target.value } })} /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Discord</label><input value={cfg.links.discord} onChange={(e) => setCfg({ ...cfg, links: { ...cfg.links, discord: e.target.value } })} /></div>
          <div className="field"><label>Website</label><input value={cfg.links.website} onChange={(e) => setCfg({ ...cfg, links: { ...cfg.links, website: e.target.value } })} /></div>
        </div>
      </div>

      <div className="panel panel-pad">
        <h3 className="card-title">Content & Status</h3>
        <div className="field"><label>Announcement banner (empty = hidden)</label><input value={cfg.announcement} onChange={(e) => setCfg({ ...cfg, announcement: e.target.value })} placeholder="Stronger together — $TAP" /></div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}><input type="checkbox" checked={cfg.maintenance} onChange={(e) => setCfg({ ...cfg, maintenance: e.target.checked })} style={{ width: 18, height: 18 }} /> Maintenance mode (disables gameplay)</label>
      </div>
    </div>
  );
}
