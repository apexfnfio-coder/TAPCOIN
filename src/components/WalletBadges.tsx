"use client";

import { useApp } from "./Providers";
import { PhantomIcon, SolflareIcon } from "./WalletIcons";

export function WalletBadges() {
  const { openWalletModal } = useApp();
  
  // Supported Solana wallets with authentic high-res PNG image assets (Phantom & Solflare)
  const wallets = [
    { 
      id: "phantom",
      name: "Phantom", 
      color: "#AB9FF2", 
      bg: "rgba(171, 159, 242, 0.12)", 
      border: "rgba(171, 159, 242, 0.35)",
      img: "/assets/logos/phantom.png",
      Icon: PhantomIcon
    },
    { 
      id: "solflare",
      name: "Solflare", 
      color: "#FC7227", 
      bg: "rgba(252, 114, 39, 0.12)", 
      border: "rgba(252, 114, 39, 0.35)",
      img: "/assets/logos/solflare.png",
      Icon: SolflareIcon
    },
    { 
      id: "jupiter",
      name: "Jupiter", 
      color: "#18c495", 
      bg: "rgba(24, 196, 149, 0.12)", 
      border: "rgba(24, 196, 149, 0.35)",
      img: "/assets/logos/jupiter.png",
      Icon: SolflareIcon
    },
  ];

  return (
    <div className="wallet-supported-badges" role="region" aria-label="Supported Solana Wallets">
      <span className="wallet-supported-label">Supported Solana Wallets:</span>
      <div className="wallet-pill-row">
        {wallets.map(({ id, name, color, bg, border, img }) => (
          <button
            key={id}
            type="button"
            className="wallet-pill"
            style={{
              borderColor: border,
              backgroundColor: bg,
              color,
            }}
            onClick={openWalletModal}
            title={`Connect with official ${name} wallet`}
            aria-label={`Connect with ${name} wallet`}
          >
            <span className="wallet-pill-icon" aria-hidden="true">
              <img src={img} alt={name} width={18} height={18} className="wallet-badge-img" style={{ objectFit: "contain", verticalAlign: "middle" }} />
            </span>
            <span className="wallet-pill-name">{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}