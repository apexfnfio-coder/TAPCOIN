import type { Metadata } from "next";
import { HomeArcadeClient } from "@/components/HomeArcadeClient";

export const metadata: Metadata = {
  title: "$TAP Arcade | Chop Timber. Ride The Pump. Don't Get Rekt.",
  description:
    "The high-octane Solana arcade battle station. Fell timber, ride God Candle surges, dodge brutal bear market dumps, and lock in your airdrop bag.",
  openGraph: {
    title: "$TAP Arcade — Solana Trading Arcade",
    description: "Chop trees, ride God Candle surges, dodge market dumps, and climb the Solana leaderboard.",
    type: "website",
  },
};

export default function HomePage() {
  return <HomeArcadeClient />;
}

