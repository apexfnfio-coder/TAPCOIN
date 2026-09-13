"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface MeUser {
  id: string;
  username: string;
  avatar: string;
  walletAddress: string | null;
  isGuest: boolean;
  role: string;
  bestScore: number;
  totalRuns: number;
  totalTrees: number;
  totalGreen: number;
  totalRedHits: number;
  totalPlayMs: number;
  createdAt: string;
}

export interface PublicConfig {
  game: {
    runDurationSec: number; treeHp: number; chopIntervalMs: number;
    pointsPerTree: number; pointsPerGreen: number; redHitPenaltySec: number;
    redHitScorePenalty: number; playerSpeed: number; treeSpacingMin: number;
    treeSpacingMax: number; candleChanceGreen: number; candleChanceRed: number;
    maxDurationSec: number; defaultGameSlug: "tap-chimp"; levelGoalBase: number;
    levelGoalGrowth: number; difficultyGrowth: number; maxLevelDurationSec: number;
  };
  token: {
    symbol: string; name: string; contractAddress: string; cluster: string;
    decimals: number; buyLinks: { label: string; url: string }[]; explorerUrl: string;
    priceUsd: number; priceSource: "local" | "manual" | "api"; minHoldingUsd: number;
  };
  leaderboardEligibility: { enabled: boolean; state: "requires-token" | "open"; text: string };
  links: { twitter: string; telegram: string; discord: string; website: string };
  announcement: string;
  maintenance: boolean;
}

interface Ctx {
  me: MeUser | null;
  meLoading: boolean;
  config: PublicConfig | null;
  refreshMe: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  /** Whether the wallet connect/info modal is currently open. */
  walletModalOpen: boolean;
  /** Open the wallet modal from anywhere in the app (e.g. profile page CTA). */
  openWalletModal: () => void;
  /** Close the wallet modal. */
  closeWalletModal: () => void;
}

const AppCtx = createContext<Ctx>({
  me: null, meLoading: true, config: null,
  refreshMe: async () => {}, refreshConfig: async () => {},
  walletModalOpen: false,
  openWalletModal: () => {},
  closeWalletModal: () => {},
});

export const useApp = () => useContext(AppCtx);

export function Providers({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeUser | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const refreshMe = useCallback(async () => {
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      const j = await r.json();
      setMe(j.data?.user ?? null);
    } catch {
      setMe(null);
    } finally {
      setMeLoading(false);
    }
  }, []);

  const refreshConfig = useCallback(async () => {
    try {
      const r = await fetch("/api/config", { cache: "no-store" });
      const j = await r.json();
      if (j.data?.config) setConfig(j.data.config);
    } catch {
      /* keep previous */
    }
  }, []);

  const openWalletModal = useCallback(() => setWalletModalOpen(true), []);
  const closeWalletModal = useCallback(() => setWalletModalOpen(false), []);

  useEffect(() => {
    refreshMe();
    refreshConfig();
    // realtime config pushes (admin -> user sync)
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/realtime?topics=config");
      es.addEventListener("config", () => refreshConfig());
    } catch {
      /* SSE unsupported — polling not needed for config */
    }
    return () => es?.close();
  }, [refreshMe, refreshConfig]);

  return (
    <AppCtx.Provider value={{
      me, meLoading, config, refreshMe, refreshConfig,
      walletModalOpen, openWalletModal, closeWalletModal,
    }}>
      {children}
    </AppCtx.Provider>
  );
}
