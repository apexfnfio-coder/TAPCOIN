import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const count = await db.chatMessage.count();
  if (count === 0) {
    await db.chatMessage.createMany({
      data: [
        {
          userId: "seed-1",
          username: "SolChop.sol",
          wallet: "8F2b...7x9Q",
          text: "Welcome to the $TAP Trollbox! Slice green candles, jump the dumps 🪓",
          badge: "WHALE",
          badgeColor: "#ffd25e",
          avatar: "/assets/ui/avatar-default.png",
        },
        {
          userId: "seed-2",
          username: "ApeDegen420",
          wallet: "4xKm...21pL",
          text: "Spacebar to leap over the red candles cleanly! Infinite chart climb is wild 🚀",
          badge: "PRO",
          badgeColor: "#22c55e",
          avatar: "/assets/ui/avatar-default.png",
        },
        {
          userId: "seed-3",
          username: "JupiterTrader",
          wallet: "Jup9...a8Kp",
          text: "Holders get direct access to leaderboard rewards! LFG $TAP 💎",
          badge: "VERIFIED",
          badgeColor: "#ab9ff2",
          avatar: "/assets/ui/avatar-default.png",
        },
      ],
    });
    console.log("Seeded initial community chat messages.");
  } else {
    console.log("Chat messages already exist:", count);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
