"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "./Providers";
import { WalletButton } from "./WalletButton";

const PRIMARY = [
  { href: "/", label: "Home" },
  { href: "/competitions", label: "Compete" },
  { href: "/play", label: "Play" },
  { href: "/leaderboard", label: "Ranks" },
  { href: "/profile", label: "Profile" },
];

const DESKTOP_SECONDARY = [
  { href: "/how-to-play", label: "How to Play" },
  { href: "/buy", label: "Buy $TAP" },
];

export function Nav() {
  const pathname = usePathname();
  const { me, config } = useApp();
  const [open, setOpen] = useState(false);

  const isGame = pathname === "/play";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {config?.maintenance ? (
        <div className="announce maintenance">Maintenance mode — gameplay temporarily disabled</div>
      ) : config?.announcement ? (
        <div className="announce">{config.announcement}</div>
      ) : null}

      <nav className={`nav ${isGame ? "nav-game" : ""}`} aria-label="Primary navigation">
        <div className="nav-inner">
          <Link href="/" className="nav-logo" onClick={() => setOpen(false)} aria-label="$TAP home">
            <img src="/assets/ui/logo.png" alt="$TAP" />
          </Link>

          <div className="nav-links nav-links-desktop">
            {PRIMARY.map((l) => (
              <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""} aria-current={isActive(l.href) ? "page" : undefined} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            {DESKTOP_SECONDARY.map((l) => (
              <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            {me?.role === "admin" && (
              <Link href="/admin" className={isActive("/admin") ? "active" : ""} onClick={() => setOpen(false)}>
                Admin
              </Link>
            )}
          </div>

          <div className="nav-right">
            <WalletButton />
            <button
              className="nav-burger"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {PRIMARY.map((l) => (
          <Link key={l.href} href={l.href} className={`${isActive(l.href) ? "active " : ""}${l.href === "/play" ? "mobile-nav-play" : ""}`} aria-current={isActive(l.href) ? "page" : undefined}>
            <span className="mobile-nav-icon" aria-hidden="true">
              {l.href === "/" ? "⌂" : l.href === "/play" ? "▶" : l.href === "/competitions" ? "◆" : l.href === "/leaderboard" ? "♛" : "●"}
            </span>
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>

      {open && (
        <div className="mobile-menu-sheet" role="dialog" aria-label="Menu">
          <div className="mobile-menu-head">
            <span className="card-title">More</span>
            <button className="modal-x" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
          </div>
          <Link href="/how-to-play" onClick={() => setOpen(false)}>How to Play</Link>
          <Link href="/buy" onClick={() => setOpen(false)}>Buy $TAP</Link>
          {me?.role === "admin" && <Link href="/admin" onClick={() => setOpen(false)}>Admin Dashboard</Link>}
        </div>
      )}
    </>
  );
}
