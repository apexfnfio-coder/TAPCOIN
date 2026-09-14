"use client";

import React, { useEffect, useState } from "react";

const INITIAL_EVENTS = [
  { id: "1", type: "score", text: "🔥 @SolanaApe just logged 3,420 pts on Level 4!", time: "12s ago" },
  { id: "2", type: "swap", text: "💰 14.5 SOL swapped for $TAP via Jupiter", time: "28s ago" },
  { id: "3", type: "record", text: "🏆 @ChimpKing broke all-time high score: 6,850 pts", time: "1m ago" },
  { id: "4", type: "chop", text: "🌲 142,850+ total trees chopped globally this week", time: "2m ago" },
  { id: "5", type: "weapon", text: "⚡ @ApeDegen equipped Gilded Sol Hatchet", time: "3m ago" },
];

const EVENT_POOL = [
  { type: "score", text: "🔥 @BananaChad cleared Level 5 with 4,110 pts!" },
  { type: "swap", text: "💰 8.2 SOL swapped for $TAP on Raydium" },
  { type: "score", text: "🎯 @DegenWhale hit a 12x Combo Streak!" },
  { type: "chop", text: "🪓 @FloorSweeper chopped 28 trees in 45s!" },
  { type: "record", text: "👑 @SolMaxi entered Top 3 on Daily Leaderboard" },
  { type: "weapon", text: "⚡ @CyberApe unlocked Cyber Laser Cleaver!" },
  { type: "swap", text: "💰 22.0 SOL swapped for $TAP via Jupiter" },
];

export function LiveTicker() {
  const [events, setEvents] = useState(INITIAL_EVENTS);

  useEffect(() => {
    const timer = setInterval(() => {
      const randomEvent = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
      const newEntry = {
        id: String(Date.now()),
        type: randomEvent.type,
        text: randomEvent.text,
        time: "just now",
      };
      setEvents((prev) => [newEntry, ...prev.slice(0, 7)]);
    }, 9000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="arcade-live-ticker" role="region" aria-label="Live Activity Ticker">
      <div className="ticker-badge">
        <span className="dot pulse" />
        <span className="ticker-badge-text">LIVE ARCADE FEED</span>
      </div>
      <div className="ticker-track-wrap">
        <div className="ticker-track">
          {events.map((ev) => (
            <div key={ev.id} className="ticker-item">
              <span className="ticker-item-text">{ev.text}</span>
              <span className="ticker-item-time">{ev.time}</span>
              <span className="ticker-separator">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
