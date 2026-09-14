import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const messages = await db.chatMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Reverse descending results so the latest 50 messages display chronologically (oldest at top, newest at bottom)
    const chronological = messages.reverse();

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
    const activeUsers = await db.user.count({
      where: { lastSeenAt: { gte: fiveMinutesAgo } },
    }).catch(() => 0);
    const activeSessions = await db.session.count({
      where: { expiresAt: { gt: new Date() } },
    }).catch(() => 0);
    const onlineCount = Math.max(1, Math.max(activeUsers, activeSessions));

    return NextResponse.json({
      ok: true,
      onlineCount,
      messages: chronological.map((m) => ({
        id: m.id,
        sender: m.username || `${m.wallet.slice(0, 4)}…${m.wallet.slice(-4)}`,
        badge: m.badge,
        badgeColor: m.badgeColor,
        avatar: m.avatar || "/assets/ui/avatar-default.png",
        text: m.text,
        wallet: m.wallet,
        createdAt: m.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("[api/chat] GET error:", err);
    return NextResponse.json({ messages: [], error: err?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.isGuest || !user.walletAddress) {
      return NextResponse.json(
        { error: "Connect your Solana wallet to send messages in the live chat" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body.text || "").trim();

    if (!text || text.length === 0) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    if (text.length > 200) {
      return NextResponse.json({ error: "Message cannot exceed 200 characters" }, { status: 400 });
    }

    // Assign badge based on user standing
    let badge = "VERIFIED";
    let badgeColor = "#ab9ff2";

    if (user.role === "admin") {
      badge = "ADMIN";
      badgeColor = "#ffd25e";
    } else if (user.bestScore >= 3000) {
      badge = "WHALE";
      badgeColor = "#ffd25e";
    } else if (user.bestScore >= 1000) {
      badge = "PRO";
      badgeColor = "#22c55e";
    }

    const sender = user.username || `${user.walletAddress.slice(0, 4)}…${user.walletAddress.slice(-4)}`;

    const msg = await db.chatMessage.create({
      data: {
        userId: user.id,
        username: sender,
        wallet: user.walletAddress,
        text,
        badge,
        badgeColor,
        avatar: user.avatar || "/assets/ui/avatar-default.png",
      },
    });

    // Enforce rolling 50-message limit: prune older messages beyond the latest 50
    try {
      const totalMessages = await db.chatMessage.count();
      if (totalMessages > 50) {
        const excess = await db.chatMessage.findMany({
          orderBy: { createdAt: "desc" },
          skip: 50,
          select: { id: true },
        });
        if (excess.length > 0) {
          await db.chatMessage.deleteMany({
            where: { id: { in: excess.map((e) => e.id) } },
          });
        }
      }
    } catch (pruneErr) {
      console.warn("[api/chat] message pruning warning:", pruneErr);
    }

    return NextResponse.json({
      message: {
        id: msg.id,
        sender: msg.username,
        badge: msg.badge,
        badgeColor: msg.badgeColor,
        avatar: msg.avatar,
        text: msg.text,
        wallet: msg.wallet,
        createdAt: msg.createdAt,
      },
    });
  } catch (err: any) {
    console.error("[api/chat] POST error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
