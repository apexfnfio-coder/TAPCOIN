"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LiveTicker } from "./LiveTicker";
import { WalletBadges } from "./WalletBadges";
import { WeaponLoadout } from "./WeaponLoadout";
import { sound } from "@/lib/sound";
import { OFFICIAL_TAP_MINT } from "@/modules/games/tap-chimp";

interface TreasuryPoolData {
  totalGameFeesSol: number;
  prizePoolSol: number;
  buybackBurnPoolSol: number;
  officialPlayersCount: number;
  season: string;
}

interface HomeStatsData {
  gameSlug: string;
  totals: {
    players: number;
    runs: number;
    trees: number;
  };
  top: {
    username: string;
    score: number;
    level: number;
  }[];
}

export function HomeArcadeClient() {
  const [treasuryPool, setTreasuryPool] = useState<TreasuryPoolData | null>(null);
  const [homeStats, setHomeStats] = useState<HomeStatsData | null>(null);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [copiedCA, setCopiedCA] = useState(false);

  useEffect(() => {
    // Fetch live treasury pool
    fetch("/api/treasury/pool", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j.data) {
          setTreasuryPool(j.data);
        }
      })
      .catch(() => {});

    // Fetch live game stats & top players
    fetch("/api/stats/home", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j.data) {
          setHomeStats(j.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopyCA = () => {
    sound.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(OFFICIAL_TAP_MINT);
      setCopiedCA(true);
      setTimeout(() => setCopiedCA(false), 2500);
    }
  };

  const openTrailer = () => {
    sound.playClick();
    setShowTrailerModal(true);
  };

  const closeTrailer = () => {
    sound.playClick();
    setShowTrailerModal(false);
  };

  return (
    <div className="home-arcade-wrapper">
      {/* 1. Real-time Live Arcade Activity Ticker */}
      <LiveTicker />

      <div className="container">
        {/* 2. Hero Section: Arcade Battle Station Split */}
        <section className="hero px-hero home-hero-section" aria-labelledby="home-title">
          <div className="hero-bg" aria-hidden="true">
            <div className="layer" style={{ backgroundImage: "url(/assets/bg/sky.png)" }} />
            <div className="layer" style={{ backgroundImage: "url(/assets/bg/far.png)" }} />
            <div className="layer" style={{ backgroundImage: "url(/assets/bg/mid.png)" }} />
            <div className="layer" style={{ backgroundImage: "url(/assets/bg/front.png)" }} />
          </div>
          <div className="hero-veil" aria-hidden="true" />
          <div className="leaf-field" aria-hidden="true">
            <i /><i /><i /><i /><i /><i />
          </div>

          <div className="hero-inner home-hero-split">
            {/* Left Column: Title, Slogan, Live Chips, CTAs, Stats */}
            <div className="home-col-info">
              <div className="home-badge-row">
                <span className="live-status-chip">
                  <span className="live-dot" /> LIVE ON SOLANA
                </span>
                <span className="eyebrow-chip">ARCADE BATTLE STATION</span>
                {treasuryPool && (
                  <span
                    className="pool-prize-chip"
                    title="10% of game fees directly funds leaderboard prize pool"
                    style={{
                      background: "rgba(0, 255, 163, 0.15)",
                      border: "1px solid rgba(0, 255, 163, 0.4)",
                      color: "var(--green)",
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    🏆 10% POOL: {treasuryPool.prizePoolSol} SOL
                  </span>
                )}
                {treasuryPool && (
                  <span
                    className="pool-burn-chip"
                    title="90% of game fees committed to $TAP Buyback & Burn"
                    style={{
                      background: "rgba(255, 59, 48, 0.15)",
                      border: "1px solid rgba(255, 59, 48, 0.4)",
                      color: "#ff6b6b",
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    🔥 90% BUYBACK & BURN
                  </span>
                )}
              </div>

              <h1 id="home-title" className="display display-xl home-hero-title">
                CHOP TIMBER.<br />
                <span className="gold-text">RIDE THE PUMP.</span><br />
                DON&apos;T GET REKT.
              </h1>

              <p className="lead home-hero-lead">
                The high-octane Solana arcade battle station. Fell towering trees, ride God Candle surges, dodge brutal bear market dumps, stomp rats, and counter-hit charging bears to lock in your airdrop bag and claim your share of the monthly dev wallet &amp; game fee pool.
              </p>

              {/* Action Buttons */}
              <div className="home-actions-row">
                <Link
                  className="btn btn-gold btn-lg glow-cta home-btn-primary"
                  href="/play"
                  onClick={() => sound.playClick()}
                >
                  <span className="btn-icon">🪓</span>
                  <span>PLAY NOW</span>
                  <span aria-hidden="true">→</span>
                </Link>

                <Link
                  className="btn btn-wood btn-lg home-btn-secondary"
                  href="/play?demo=1"
                  onClick={() => sound.playClick()}
                >
                  <span className="btn-icon">⚡</span>
                  <span>FREE PRACTICE</span>
                </Link>

                <button
                  type="button"
                  className="btn btn-ghost btn-lg home-btn-trailer"
                  onClick={openTrailer}
                  title="Watch 30-second gameplay teaser"
                >
                  <span className="btn-icon">🎬</span>
                  <span>WATCH TRAILER</span>
                </button>
              </div>

              {/* Live Metric Counters */}
              <div className="home-stat-grid" aria-label="Live platform stats">
                <div className="home-stat-card">
                  <div className="v green">
                    {treasuryPool ? `${treasuryPool.prizePoolSol.toFixed(4)} SOL` : "0.0100 SOL"}
                  </div>
                  <div className="k">10% Leaderboard Pool</div>
                </div>
                <div className="home-stat-card">
                  <div className="v">
                    {homeStats?.totals?.trees ? homeStats.totals.trees.toLocaleString("en-US") : "142,850+"}
                  </div>
                  <div className="k">Total Trees Cleared</div>
                </div>
                <div className="home-stat-card">
                  <div className="v">
                    {treasuryPool?.officialPlayersCount
                      ? treasuryPool.officialPlayersCount
                      : homeStats?.totals?.players
                      ? homeStats.totals.players
                      : "42+"}
                  </div>
                  <div className="k">Season Degens</div>
                </div>
                <div className="home-stat-card">
                  <div className="v" style={{ color: "#ffd000" }}>$TAP</div>
                  <div className="k">SPL-20 Official Mint</div>
                </div>
              </div>

              {/* Supported Wallets Strip */}
              <div style={{ marginTop: 8 }}>
                <WalletBadges />
              </div>
            </div>

            {/* Right Column: 3D Mascot Pedestal Showcase */}
            <div className="home-col-mascot">
              <div className="mascot-stage-cabinet">
                <div className="mascot-rank-tag">
                  <span className="tag-spark">★</span> RANK: DEGEN APE
                </div>
                <div className="mascot-ambient-aura" />
                <div className="mascot-character-wrap">
                  <img
                    src="/assets/ape/idle.png"
                    alt="$TAP Ape Mascot"
                    className="mascot-showcase-img float-ape"
                  />
                </div>
                <div className="mascot-ground-shadow" />
                <div className="mascot-pedestal">
                  <div className="pedestal-surface" />
                  <div className="pedestal-trim" />
                  <div className="pedestal-label">
                    <span className="pedestal-label-icon">🪓</span>
                    <span>EQUIPPED: RUSTY HATCHET · +10 DMG</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Official Solana Contract Address (CA) Quick-Copy Strip */}
        <section className="home-ca-bar" aria-label="Official Token Mint">
          <div className="home-ca-left">
            <span className="ca-badge">
              <img src="/assets/logos/tap-coin.png" alt="" width={22} height={22} style={{ objectFit: "contain", verticalAlign: "middle" }} />
              <span>OFFICIAL $TAP SOLANA CONTRACT</span>
            </span>
            <code className="home-ca-code" title="Official $TAP Solana Mint Address">
              {OFFICIAL_TAP_MINT}
            </code>
          </div>

          <div className="home-ca-actions">
            <button
              type="button"
              className={`btn btn-sm ${copiedCA ? "btn-wood" : "btn-gold"}`}
              onClick={handleCopyCA}
              title="Copy official contract address"
            >
              {copiedCA ? "✓ COPIED TO CLIPBOARD" : "📋 COPY CA"}
            </button>
            <a
              href={`https://dexscreener.com/solana/${OFFICIAL_TAP_MINT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              title="View on DexScreener"
            >
              📈 DexScreener ↗
            </a>
            <a
              href="https://jup.ag/swap/SOL-TAP"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              title="Swap on Jupiter"
            >
              🪐 Jupiter ↗
            </a>
          </div>
        </section>

        {/* 4. Three-Pillar Tactical Gameplay Loop Cards */}
        <section className="home-section" aria-label="Tactical Rules">
          <div className="home-section-header">
            <span className="eyebrow" style={{ letterSpacing: 2 }}>ARCADE MECHANICS</span>
            <h2 className="display display-md" style={{ marginTop: 6, marginBottom: 8 }}>
              HOW TO WIN <span className="gold-text">$TAP CHOP</span>
            </h2>
            <p className="sub" style={{ maxWidth: 640, margin: "0 auto" }}>
              Three tactical rules to master the canopy, dodge liquidated dumps, and lock in your airdrop bag.
            </p>
          </div>

          <div className="gameplay-cards-grid">
            {/* Rule 1: Chop & God Candles */}
            <div className="gameplay-card green-card">
              <div className="gameplay-card-head">
                <span className="rule-badge green-badge">PHASE 01 · HARVEST</span>
                <img src="/assets/candle-green.png" alt="Green Candle" width={42} height={42} style={{ objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(0,255,163,0.5))" }} />
              </div>
              <h3 className="card-title" style={{ color: "var(--green)", fontSize: 20 }}>
                Chop Timber &amp; Ride God Candles
              </h3>
              <p className="sub" style={{ lineHeight: 1.6 }}>
                Approach towering oak trunks to fell timber (+100 PTS). Collect glowing green God Candles along the path to build escalating combo streaks up to 10x multiplier.
              </p>
              <div className="gameplay-tags">
                <span className="metric-tag green-tag">+100 PTS / Tree</span>
                <span className="metric-tag green-tag">Up to 10x Multiplier</span>
              </div>
            </div>

            {/* Rule 2: Hazards, Jumping & Combat */}
            <div className="gameplay-card red-card">
              <div className="gameplay-card-head">
                <span className="rule-badge red-badge">PHASE 02 · COMBAT &amp; SURVIVAL</span>
                <img src="/assets/props/bear.png" alt="Bear Hazard" width={46} height={42} style={{ objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(255,59,48,0.5))" }} />
              </div>
              <h3 className="card-title" style={{ color: "#ff6b6b", fontSize: 20 }}>
                Dodge Dumps, Stomp Rats &amp; Counter Bears
              </h3>
              <p className="sub" style={{ lineHeight: 1.6 }}>
                Jump across chasms and leap over red market dumps (-25 PTS penalty). Stomp patrolling rats from above for +10 PTS impulse rebound, and land axe counter-hits on the charging Bear to stun him.
              </p>
              <div className="gameplay-tags">
                <span className="metric-tag" style={{ background: "rgba(255,208,0,0.15)", color: "var(--gold)" }}>[SPACE] or [W] to Jump</span>
                <span className="metric-tag" style={{ background: "rgba(0,255,163,0.15)", color: "var(--green)" }}>+10 Rat Stomp</span>
                <span className="metric-tag" style={{ background: "rgba(255,59,48,0.15)", color: "var(--red)" }}>Counter-Hit ⚡</span>
              </div>
            </div>

            {/* Rule 3: Leaderboard & Tokenomics */}
            <div className="gameplay-card gold-card">
              <div className="gameplay-card-head">
                <span className="rule-badge" style={{ background: "rgba(255,208,0,0.15)", color: "var(--gold)", border: "1px solid rgba(255,208,0,0.4)" }}>
                  PHASE 03 · REWARDS &amp; BURN
                </span>
                <img src="/assets/logos/tap-coin.png" alt="$TAP Coin" width={42} height={42} style={{ objectFit: "contain", filter: "drop-shadow(0 0 10px rgba(255,208,0,0.5))" }} />
              </div>
              <h3 className="card-title" style={{ color: "var(--gold)", fontSize: 20 }}>
                0.01 SOL Pass · Win 10% Pool Monthly
              </h3>
              <p className="sub" style={{ lineHeight: 1.6 }}>
                Connect your Solana wallet and unlock official season ranking for 0.01 SOL. 10% of game fees directly funds top leaderboard prizes, while 90% is committed to automated $TAP buyback &amp; burn.
              </p>
              <div className="gameplay-tags">
                <span className="metric-tag" style={{ background: "rgba(0,255,163,0.15)", color: "var(--green)" }}>10% Prize Pool</span>
                <span className="metric-tag" style={{ background: "rgba(255,59,48,0.15)", color: "#ff6b6b" }}>90% Buyback &amp; Burn</span>
                <span className="metric-tag" style={{ background: "rgba(255,208,0,0.15)", color: "var(--gold)" }}>Solana Verified</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Live Top 3 Apes Champion Podium Preview */}
        {homeStats?.top && homeStats.top.length >= 3 && (
          <section className="home-section" aria-label="Season Champions Podium">
            <div className="home-section-header">
              <span className="eyebrow" style={{ letterSpacing: 2 }}>GLOBAL STANDINGS</span>
              <h2 className="display display-md" style={{ marginTop: 6, marginBottom: 8 }}>
                SEASON TOP APES <span className="gold-text">PODIUM</span>
              </h2>
              <p className="sub" style={{ maxWidth: 640, margin: "0 auto" }}>
                The highest-scoring apes on the verified Solana canopy. Fell timber, climb levels, and take their crown.
              </p>
            </div>

            <div className="podium home-podium-preview" style={{ maxWidth: 760, margin: "0 auto" }}>
              {/* Silver (Rank 2) */}
              <div className="panel podium-col silver">
                <img className="podium-avatar" src="/assets/ui/avatar-default.png" alt="" />
                <div className="podium-rank">2</div>
                <div className="podium-name">{homeStats.top[1]?.username || "Degen_Silver"}</div>
                <div className="podium-score">{(homeStats.top[1]?.score || 3820).toLocaleString("en-US")} PTS</div>
                <div style={{ fontSize: 11, color: "var(--cream-dim)", marginTop: 4 }}>Level {homeStats.top[1]?.level || 3} Chimp</div>
              </div>

              {/* Gold (Rank 1) */}
              <div className="panel podium-col first">
                <div className="podium-crown" style={{ fontSize: 24, marginBottom: 4 }}>👑</div>
                <img className="podium-avatar" src="/assets/ui/avatar-default.png" alt="" />
                <div className="podium-rank">1</div>
                <div className="podium-name">{homeStats.top[0]?.username || "Chimp_King"}</div>
                <div className="podium-score">{(homeStats.top[0]?.score || 6450).toLocaleString("en-US")} PTS</div>
                <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700, marginTop: 4 }}>Canopy Monarch · Lvl {homeStats.top[0]?.level || 5}</div>
              </div>

              {/* Bronze (Rank 3) */}
              <div className="panel podium-col bronze">
                <img className="podium-avatar" src="/assets/ui/avatar-default.png" alt="" />
                <div className="podium-rank">3</div>
                <div className="podium-name">{homeStats.top[2]?.username || "Banana_Chad"}</div>
                <div className="podium-score">{(homeStats.top[2]?.score || 2910).toLocaleString("en-US")} PTS</div>
                <div style={{ fontSize: 11, color: "var(--cream-dim)", marginTop: 4 }}>Level {homeStats.top[2]?.level || 2} Chimp</div>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 24 }}>
              <Link
                href="/leaderboard"
                className="btn btn-gold btn-lg"
                onClick={() => sound.playClick()}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <span>♛ VIEW FULL LEADERBOARD</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        )}

        {/* 6. Weapon Arsenal Preview */}
        <section className="home-section" aria-label="Weapon Arsenal">
          <div className="home-section-header">
            <span className="eyebrow" style={{ letterSpacing: 2 }}>ARMORY LOADOUT</span>
            <h2 className="display display-md" style={{ marginTop: 6, marginBottom: 8 }}>
              FORGE YOUR <span className="gold-text">WEAPON</span>
            </h2>
            <p className="sub" style={{ maxWidth: 640, margin: "0 auto" }}>
              Upgrade from the basic rusty steel hatchet to high-frequency plasma cleavers with enhanced critical strike rates.
            </p>
          </div>

          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <WeaponLoadout />
          </div>
        </section>
      </div>

      {/* 7. Video Trailer Modal */}
      {showTrailerModal && (
        <div
          className="trailer-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="$TAP Arcade Gameplay Trailer"
          onClick={closeTrailer}
        >
          <div
            className="trailer-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="trailer-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="eyebrow">CINEMATIC PREVIEW</span>
                <span className="terminal-tag ok-tag">60 FPS 1080P</span>
              </div>
              <button
                type="button"
                className="modal-x"
                onClick={closeTrailer}
                aria-label="Close trailer"
              >
                ✕
              </button>
            </div>
            <div className="trailer-video-wrapper">
              <video
                src="/assets/media/tap_intro_trailer.mp4"
                controls
                autoPlay
                playsInline
                className="trailer-video-element"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
