"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
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
  const { me, meLoading } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!meLoading && (!me || me.role !== "admin")) {
      router.replace("/");
    }
  }, [me, meLoading, router]);

  if (meLoading) return <div className="container"><div className="spinner" /></div>;
  if (!me || me.role !== "admin") {
    return (
      <div className="container" style={{ paddingTop: 60, maxWidth: 480 }}>
        <div className="panel empty-state">
          <div className="big">Restricted area</div>
          <div>Admin access required.</div>
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
