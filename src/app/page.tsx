import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "$TAP Arcade | Chop Timber. Ride The Pump.",
  description: "Enter the $TAP Chimp Solana arcade: chop trees, dodge market dumps, and climb the leaderboard.",
  openGraph: {
    title: "$TAP Arcade",
    description: "A level-based Solana trading arcade built for fast, competitive runs.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <div className="container">
      <section className="hero px-hero" aria-labelledby="home-title">
        <div className="hero-bg" aria-hidden="true">
          <div className="layer" style={{ backgroundImage: "url(/assets/bg/sky.png)" }} />
          <div className="layer" style={{ backgroundImage: "url(/assets/bg/far.png)" }} />
          <div className="layer" style={{ backgroundImage: "url(/assets/bg/mid.png)" }} />
          <div className="layer" style={{ backgroundImage: "url(/assets/bg/front.png)" }} />
        </div>
        <div className="hero-veil" aria-hidden="true" />
        <div className="hero-inner">
          <p className="eyebrow">SOLANA TRADING ARCADE</p>
          <h1 id="home-title" className="display display-xl">CHOP THE MARKET.<br /><span className="gold-text">CLIMB THE CANOPY.</span></h1>
          <p className="lead" style={{ maxWidth: 560 }}>Master $TAP Chimp: chop trees, collect green candles, dodge brutal red dumps, and turn every run into a leaderboard climb.</p>
          <div className="hero-actions">
            <Link className="btn btn-gold" href="/play">PLAY NOW <span aria-hidden="true">→</span></Link>
            <Link className="btn btn-ghost" href="/how-to-play">HOW TO PLAY</Link>
          </div>
          <div className="hero-stats" aria-label="Platform highlights">
            <div className="hero-stat"><div className="v">LEVELS</div><div className="k">Skill-based runs</div></div>
            <div className="hero-stat"><div className="v">ON-CHAIN</div><div className="k">Solana-ready rewards</div></div>
            <div className="hero-stat"><div className="v">LIVE</div><div className="k">Global leaderboard</div></div>
          </div>
        </div>
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, padding: "32px 0 64px" }} aria-label="Explore $TAP Arcade">
        <Link className="panel panel-pad" href="/leaderboard"><h2 className="card-title">Leaderboard</h2><p className="sub">See who rules the canopy.</p></Link>
        <Link className="panel panel-pad" href="/buy"><h2 className="card-title">Get $TAP</h2><p className="sub">Find official token information.</p></Link>
      </section>
    </div>
  );
}

