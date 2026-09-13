"use client";

import { useEffect, useState } from "react";

type GameModuleRow = {
  slug: string;
  name: string;
  version: string;
  description: string;
  assetBasePath: string;
  active: boolean;
};

export default function AdminGamesPage() {
  const [games, setGames] = useState<GameModuleRow[] | null>(null);
  const [defaultGameSlug, setDefaultGameSlug] = useState("tap-chimp");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const r = await fetch("/api/admin/games", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) {
      setGames(j.data.games);
      setDefaultGameSlug(j.data.defaultGameSlug);
    }
  }

  useEffect(() => { load(); }, []);

  async function makeDefault(slug: string) {
    setNotice("");
    setError("");
    const r = await fetch("/api/admin/games", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultGameSlug: slug }),
    }).then((x) => x.json());
    if (r.ok) {
      setNotice(`${slug} is now the default game module.`);
      await load();
    } else {
      setError(r.error?.message || "Unable to update default game.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div>
          <h2 className="card-title" style={{ margin: 0 }}>Game Modules</h2>
          <p className="sub" style={{ margin: "6px 0 0" }}>Installed modules share auth, eligibility, leaderboards, competitions, and admin review.</p>
        </div>
        <span className="chip scheduled">Default: {defaultGameSlug}</span>
      </div>
      {notice && <div className="sub" style={{ color: "var(--gold)", marginBottom: 10 }}>{notice}</div>}
      {error && <div className="error-box">{error}</div>}

      <div className="panel" style={{ overflow: "hidden" }}>
        {games === null ? (
          <div style={{ padding: 20 }}>{[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72, marginBottom: 10 }} />)}</div>
        ) : games.length === 0 ? (
          <div className="empty-state"><div className="big">No modules registered</div></div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Module</th><th>Slug</th><th>Version</th><th>Assets</th><th style={{ textAlign: "right" }}>Status</th></tr></thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.slug}>
                  <td><b>{game.name}</b><div className="sub">{game.description}</div></td>
                  <td className="mono" style={{ fontSize: 12 }}>{game.slug}</td>
                  <td>{game.version}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{game.assetBasePath}</td>
                  <td style={{ textAlign: "right" }}>
                    {game.active ? (
                      <span className="chip live">Active</span>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => makeDefault(game.slug)}>Make default</button>
                    )}
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
