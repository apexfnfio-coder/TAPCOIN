import React from "react";

interface IconProps {
  size?: number;
  className?: string;
}

/** Official Phantom Wallet Logo Image */
export function PhantomIcon({ size = 20, className = "" }: IconProps) {
  return (
    <img
      src="/assets/logos/phantom.png"
      alt="Phantom"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", verticalAlign: "middle" }}
    />
  );
}

/** Official Solflare Wallet Logo Image */
export function SolflareIcon({ size = 20, className = "" }: IconProps) {
  return (
    <img
      src="/assets/logos/solflare.png"
      alt="Solflare"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", verticalAlign: "middle" }}
    />
  );
}

/** Official Jupiter Logo Image */
export function JupiterIcon({ size = 20, className = "" }: IconProps) {
  return (
    <img
      src="/assets/logos/jupiter.png"
      alt="Jupiter"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", verticalAlign: "middle" }}
    />
  );
}
