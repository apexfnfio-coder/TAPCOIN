"use client";

import { useApp } from "./Providers";

export function Footer() {
  const { config } = useApp();
  const links = config?.links;

  const twitterUrl = links?.twitter || "https://x.com/solanatapcoin";
  const telegramUrl = links?.telegram || "https://t.me/tapcoinSolana";
  const tiktokUrl = links?.tiktok || "https://www.tiktok.com/@tappumpfun";
  const discordUrl = links?.discord || "https://discord.gg";

  return (
    <footer className="footer" role="contentinfo">
      <div className="container footer-inner">
        <div className="footer-left">
          <span className="footer-brand">$TAP CHOP GAME</span>
          <span className="footer-dot">·</span>
          <span className="footer-copy">Chop. Collect. Compete. Built for Solana traders & arcade degens.</span>
        </div>

        <div className="footer-social-row">
          {/* X (Twitter) */}
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="social-btn social-x"
            aria-label="Follow us on X (Twitter)"
            title="Follow on X (Twitter)"
          >
            <img src="/assets/logos/x.png" alt="X (Twitter)" width={16} height={16} style={{ objectFit: "contain", verticalAlign: "middle" }} />
          </a>

          {/* Telegram */}
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="social-btn social-telegram"
            aria-label="Join our Telegram community"
            title="Telegram Community"
          >
            <img src="/assets/logos/telegram.png" alt="Telegram" width={18} height={18} style={{ objectFit: "contain", verticalAlign: "middle" }} />
          </a>

          {/* TikTok */}
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="social-btn social-tiktok"
            aria-label="Follow us on TikTok"
            title="TikTok"
          >
            <img src="/assets/logos/tiktok.png" alt="TikTok" width={18} height={18} style={{ objectFit: "contain", verticalAlign: "middle", borderRadius: 4 }} />
          </a>

          {/* Discord */}
          {discordUrl && discordUrl !== "https://discord.gg" && (
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn social-discord"
              aria-label="Join our Discord server"
              title="Discord Server"
            >
              <img src="/assets/logos/discord.png" alt="Discord" width={18} height={18} style={{ objectFit: "contain", verticalAlign: "middle" }} />
            </a>
          )}

          {/* Solana Explorer */}
          <a
            href="https://solscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="social-btn social-explorer"
            aria-label="View on Solana Explorer"
            title="Solana Explorer"
          >
            <img src="/assets/logos/solana.png" alt="Solana" width={18} height={18} style={{ objectFit: "contain", verticalAlign: "middle" }} />
          </a>
        </div>
      </div>
    </footer>
  );
}
