import Link from "next/link";
import { getConfig } from "@/lib/config";

export const metadata = { title: "How to Play — $TAP" };

const STEPS = [
  { n: "1", title: "MOVE", img: "/assets/ape/walk1.png", body: "Move left or right. Desktop uses Arrow Left / Arrow Right or A / D. Mobile uses the two on-screen movement buttons." },
  { n: "2", title: "AUTO CHOP", img: "/assets/ape/chop2.png", body: "Reach a tree and the Ape chops automatically. Watch the tree move through visible damage states until it becomes a stump." },
  { n: "3", title: "DODGE", img: "/assets/candle-red.png", body: "Red candles are hazards. Avoid them while staying in position to keep your run alive and protect your score." },
  { n: "4", title: "COLLECT", img: "/assets/candle-green.png", body: "Green candles are rewards. Move into them to collect bonus points and keep pushing the score higher." },
  { n: "5", title: "CLEAR LEVELS", img: "/assets/ape/celebrate.png", body: "Clear the current tree target to advance. Levels continue without a predefined maximum, while difficulty and patterns evolve." },
  { n: "6", title: "COMPETE", img: "/assets/ape/idle.png", body: "A completed run is submitted for verification. Eligible verified results can appear on the leaderboard and competitions." },
];

export default async function HowToPlayPage() {
  const config = await getConfig();
  const game = config.game;

  return (
    <div className="container info-page" style={{ paddingTop: 28, maxWidth: 900 }}>
      <div className="page-hero-strip compact-hero">
        <div className="eyebrow">$TAP GAME</div>
        <h1 className="display display-lg">HOW TO <span className="gold-text">PLAY</span></h1>
        <p className="sub strip-sub">Simple controls. Automatic chopping. Unlimited level progression.</p>
      </div>

      <div className="step-grid">
        {STEPS.map((step, index) => (
          <div key={step.n} className={`panel step-card reveal d${(index % 5) + 1}`}>
            <span className="step-n">{step.n}</span>
            <div className="step-img"><img src={step.img} alt="" /></div>
            <div className="step-title">{step.title}</div>
            <p>{step.body}</p>
          </div>
        ))}
      </div>

      <div className="panel panel-pad" style={{ marginTop: 18 }}>
        <div className="eyebrow">LIVE GAME RULES</div>
        <div className="stat-grid compact-stat-grid" style={{ marginTop: 12 }}>
          <div className="stat-tile"><div className="k">Tree score</div><div className="v">+{game.pointsPerTree}</div></div>
          <div className="stat-tile"><div className="k">Green candle</div><div className="v" style={{ color: "var(--green)" }}>+{game.pointsPerGreen}</div></div>
          <div className="stat-tile"><div className="k">Red score penalty</div><div className="v" style={{ color: "var(--red)" }}>−{game.redHitScorePenalty}</div></div>
          <div className="stat-tile"><div className="k">Level 1 target</div><div className="v cream">{game.levelGoalBase}</div></div>
        </div>
      </div>

      <div className="info-cta-row">
        <Link href="/play" className="btn btn-gold btn-lg">Play Now</Link>
        <Link href="/leaderboard" className="btn btn-ghost btn-lg">View Ranks</Link>
      </div>
    </div>
  );
}
