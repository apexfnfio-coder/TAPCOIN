"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "./Providers";
import { WalletButton } from "./WalletButton";
import { strings } from "@/i18n/strings";

// Feature flag: Competitions temporarily suspended per product request (kept intact for future reactivation)
const ENABLE_COMPETITIONS = false;

const ALL_PRIMARY = [
  { href: "/", label: "Home" },
  { href: "/competitions", label: "Compete" },
  { href: "/play", label: "Play" },
  { href: "/leaderboard", label: "Ranks" },
  { href: "/profile", label: "Profile" },
];

const PRIMARY = ALL_PRIMARY.filter((l) => ENABLE_COMPETITIONS || l.href !== "/competitions");

const DESKTOP_SECONDARY = [
  { href: "/how-to-play", label: "How to Play" },
];

export function Nav() {
  const pathname = usePathname();
  const { me, config } = useApp();
  const [open, setOpen] = useState(false);

  const isGame = pathname === "/play";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const buyUrl = config?.token?.buyLinks?.[0]?.url || "https://jup.ag/swap/SOL-TAP";
  const buyLabel = config?.token?.buyLinks?.[0]?.label || "Jupiter";

  return (
    <>
      {config?.maintenance ? (
        <div className="announce maintenance">Maintenance mode — official gameplay temporarily suspended</div>
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
              <Link
                key={l.href}
                href={l.href}
                className={isActive(l.href) ? "active" : ""}
                aria-current={isActive(l.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {DESKTOP_SECONDARY.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={isActive(l.href) ? "active" : ""}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {me?.role === "admin" && (
              <Link
                href="/admin"
                className={isActive("/admin") ? "active" : ""}
                onClick={() => setOpen(false)}
              >
                Admin
              </Link>
            )}
          </div>

          <div className="nav-right">
            <WalletButton />

            {/* Phase 1.5: Distinct Transactional Buy $TAP button */}
            <a
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="buy-tap-nav-btn"
              title={`Buy $TAP on ${buyLabel}`}
              aria-label={`Buy $TAP on ${buyLabel}`}
            >
              <img src="/assets/logos/tap-coin.png" alt="" width={20} height={20} className="buy-coin-img" style={{ verticalAlign: "middle", objectFit: "contain", marginRight: 6 }} />
              <span className="buy-tap-text">BUY $TAP</span>
            </a>

            <button
              type="button"
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

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {PRIMARY.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`${isActive(l.href) ? "active " : ""}${l.href === "/play" ? "mobile-nav-play" : ""}`}
            aria-current={isActive(l.href) ? "page" : undefined}
          >
            <span className="mobile-nav-icon" aria-hidden="true">
              {l.href === "/" ? "⌂" : l.href === "/play" ? "▶" : l.href === "/competitions" ? "◆" : l.href === "/leaderboard" ? "♛" : "👤"}
            </span>
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>

      {/* Mobile drawer sheet */}
      {open && (
        <div className="mobile-menu-sheet" role="dialog" aria-label="Menu">
          <div className="mobile-menu-head">
            <span className="card-title">Menu</span>
            <button type="button" className="modal-x" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
          </div>
          <Link href="/how-to-play" onClick={() => setOpen(false)}>
            📖 How to Play
          </Link>
          <a
            href={buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mobile-buy-tap-link"
          >
            <img src="/assets/logos/tap-coin.png" alt="" width={18} height={18} style={{ verticalAlign: "middle", marginRight: 8, objectFit: "contain" }} />
            Buy $TAP — {buyLabel} ↗
          </a>
          {me?.role === "admin" && (
            <Link href="/admin" onClick={() => setOpen(false)}>
              ⚙️ Admin Dashboard
            </Link>
          )}
        </div>
      )}
    </>
  );
}
