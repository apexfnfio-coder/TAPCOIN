"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/Providers";

const ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/games", label: "Game Modules" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/competitions", label: "Competitions" },
  { href: "/admin/runs", label: "Score Review" },
  { href: "/admin/config", label: "Settings" },
  { href: "/admin/security", label: "Security / Audit" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { me, meLoading, openWalletModal } = useApp();
  const pathname = usePathname();

  if (meLoading) return <div className="container" style={{ paddingTop: 60 }}><div className="skeleton" style={{ height: 120 }} /></div>;

  if (!me || me.role !== "admin") {
    const isConnected = !!me?.walletAddress;
    return (
      <div className="container" style={{ paddingTop: 60, maxWidth: 500 }}>
        <div className="panel panel-pad" style={{ textAlign: "center" }}>
          <div className="eyebrow">SECURITY GATE</div>
          <h2 className="card-title" style={{ marginTop: 6, marginBottom: 8 }}>ADMIN CONSOLE</h2>
          <p className="sub" style={{ margin: "0 0 18px" }}>
            This management area is restricted to authorized administrator wallets.
          </p>
          {!isConnected ? (
            <button className="btn btn-gold btn-lg" onClick={openWalletModal} style={{ width: "100%" }}>
              Connect Admin Wallet
            </button>
          ) : (
            <div className="wallet-notice" style={{ marginTop: 8 }}>
              Connected as <b>{me.walletAddress ? `${me.walletAddress.slice(0, 4)}...${me.walletAddress.slice(-4)}` : "Guest"}</b> (Unauthorized).
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
                Please reconnect using an authorized admin wallet.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 26, maxWidth: 1240 }}>
      <h1 className="display display-md" style={{ marginBottom: 18 }}>ADMIN <span className="gold-text">CONSOLE</span></h1>
      <div className="admin-layout">
        <aside className="panel admin-side">
          {ITEMS.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={i.exact ? (pathname === i.href ? "active" : "") : pathname.startsWith(i.href) ? "active" : ""}
            >
              {i.label}
            </Link>
          ))}
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
