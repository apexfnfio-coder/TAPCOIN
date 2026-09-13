"use client";

import { useApp } from "./Providers";

export function Footer() {
  const { config } = useApp();
  const links = config?.links;
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>$TAP — Chop. Collect. Compete. · Small tap today, a bigger tomorrow.</span>
        <span style={{ display: "flex", gap: 18 }}>
          {links?.website && <a href={links.website} target="_blank" rel="noreferrer">Website</a>}
          {links?.twitter && <a href={links.twitter} target="_blank" rel="noreferrer">X / Twitter</a>}
          {links?.telegram && <a href={links.telegram} target="_blank" rel="noreferrer">Telegram</a>}
          {links?.discord && <a href={links.discord} target="_blank" rel="noreferrer">Discord</a>}
        </span>
      </div>
    </footer>
  );
}
