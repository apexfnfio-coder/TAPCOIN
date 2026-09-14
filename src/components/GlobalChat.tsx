"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useApp } from "./Providers";
import { sound } from "@/lib/sound";

interface ChatMessage {
  id: string;
  sender: string;
  badge?: string;
  badgeColor?: string;
  avatar: string;
  text: string;
  wallet?: string;
  createdAt: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  score: number;
  level: number;
  trees: number;
}

interface GlobalChatProps {
  docked?: boolean;
}

export function GlobalChat({ docked = false }: GlobalChatProps) {
  const { me, openWalletModal } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "ranks">("chat");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const chatMessagesWrapRef = useRef<HTMLDivElement>(null);

  const walletConnected = Boolean(me && !me.isGuest && me.walletAddress);

  // Safely scroll inner chat messages without scrolling the parent browser viewport
  useEffect(() => {
    if ((isOpen || docked) && chatMessagesWrapRef.current) {
      chatMessagesWrapRef.current.scrollTop = chatMessagesWrapRef.current.scrollHeight;
    }
  }, [messages, isOpen, docked]);

  // Fetch real messages from database API
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error("[GlobalChat] Failed to load messages:", err);
    }
  }, []);

  // Fetch top leaderboard entries for the telemetry tab
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard?limit=5");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.data?.entries)) {
          setLeaderboard(data.data.entries);
        }
      }
    } catch (err) {
      console.error("[GlobalChat] Failed to load leaderboard:", err);
    }
  }, []);

  // Polling strategy: 3.5s when active/docked vs 15s when closed floating drawer
  useEffect(() => {
    fetchMessages();
    if (docked) {
      fetchLeaderboard();
    }
    const pollInterval = isOpen ? 3500 : 15000;
    const effectiveInterval = docked ? 3500 : pollInterval;
    const timer = setInterval(() => {
      fetchMessages();
      if (docked && activeTab === "ranks") {
        fetchLeaderboard();
      }
    }, effectiveInterval);
    return () => clearInterval(timer);
  }, [isOpen, docked, activeTab, fetchMessages, fetchLeaderboard]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !walletConnected || sending) return;

    setSending(true);
    sound.playClick();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (res.ok) {
        setInputText("");
        await fetchMessages();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Failed to send message");
      }
    } catch (err) {
      console.error("[GlobalChat] Send failed:", err);
    } finally {
      setSending(false);
    }
  };

  const sendQuickChip = (text: string) => {
    if (!walletConnected) {
      openWalletModal();
      return;
    }
    setInputText(text);
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "just now";
    }
  };

  // ===== DOCKED DESKTOP ARCADE TELEMETRY MODE =====
  if (docked) {
    return (
      <aside className="arcade-docked-telemetry" aria-label="Arcade Command Station">
        {/* Header & Mode Switcher */}
        <div className="telemetry-header">
          <div className="telemetry-brand">
            <span className="chat-live-pulse" />
            <div className="telemetry-titles">
              <span className="telemetry-tag">ARCADE TELEMETRY</span>
              <span className="telemetry-main-title">COMMAND STATION</span>
            </div>
          </div>

          <div className="telemetry-tabs">
            <button
              type="button"
              className={`telemetry-tab-btn ${activeTab === "chat" ? "is-active" : ""}`}
              onClick={() => {
                sound.playClick();
                setActiveTab("chat");
              }}
            >
              💬 Trollbox
            </button>
            <button
              type="button"
              className={`telemetry-tab-btn ${activeTab === "ranks" ? "is-active" : ""}`}
              onClick={() => {
                sound.playClick();
                setActiveTab("ranks");
                fetchLeaderboard();
              }}
            >
              ♛ Top Apes
            </button>
          </div>
        </div>

        {/* Tab 1: Live Trollbox Feed */}
        {activeTab === "chat" && (
          <div className="telemetry-feed-wrap">
            <div className="telemetry-messages-list" ref={chatMessagesWrapRef}>
              {messages.length === 0 ? (
                <div className="chat-empty-state">
                  <span>No messages yet. Be the first degen to drop alpha!</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isCurrentUser = walletConnected && me?.walletAddress === msg.wallet;
                  return (
                    <div
                      key={msg.id}
                      className={`chat-bubble ${isCurrentUser ? "chat-bubble-user" : ""}`}
                    >
                      <img
                        src={msg.avatar || "/assets/ui/avatar-default.png"}
                        alt=""
                        className="chat-avatar"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/assets/ui/avatar-default.png";
                        }}
                      />
                      <div className="chat-bubble-body">
                        <div className="chat-bubble-meta">
                          <span className="chat-sender">{msg.sender}</span>
                          {msg.badge && (
                            <span
                              className="chat-badge"
                              style={{
                                color: msg.badgeColor,
                                borderColor: msg.badgeColor,
                              }}
                            >
                              {msg.badge}
                            </span>
                          )}
                          <span className="chat-time">{formatTime(msg.createdAt)}</span>
                        </div>
                        <div className="chat-text">{msg.text}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Reaction Chips */}
            <div className="chat-quick-chips">
              <button type="button" className="quick-chip" onClick={() => sendQuickChip("🪓 CHOPPING HARD!")}>
                🪓 Chop
              </button>
              <button type="button" className="quick-chip" onClick={() => sendQuickChip("🚀 LFG $TAP!")}>
                🚀 LFG
              </button>
              <button type="button" className="quick-chip" onClick={() => sendQuickChip("💎 BULLISH!")}>
                💎 Bullish
              </button>
              <button type="button" className="quick-chip" onClick={() => sendQuickChip("⚠️ DODGE RED!")}>
                ⚠️ Dodge
              </button>
            </div>

            {/* Input Box or Wallet Lock Notice */}
            {!walletConnected ? (
              <div className="chat-guest-lock">
                <div className="chat-lock-msg">
                  <span className="chat-lock-icon">🔒</span>
                  <span>Connect wallet to join the trollbox</span>
                </div>
                <button
                  type="button"
                  className="btn btn-gold btn-sm chat-connect-btn"
                  onClick={openWalletModal}
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <form className="chat-input-row" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Drop live alpha..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  maxLength={200}
                  disabled={sending}
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!inputText.trim() || sending}
                >
                  {sending ? "..." : "Send"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Live Leaderboard Pulse */}
        {activeTab === "ranks" && (
          <div className="telemetry-ranks-wrap">
            <div className="telemetry-ranks-list">
              {leaderboard.length === 0 ? (
                <div className="chat-empty-state">
                  <span>Loading top apes...</span>
                </div>
              ) : (
                leaderboard.map((entry) => (
                  <div key={entry.userId || entry.rank} className="telemetry-rank-row">
                    <div className="rank-badge-col">
                      <span className={`telemetry-rank-num rank-${entry.rank}`}>
                        {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                      </span>
                    </div>
                    <div className="rank-info-col">
                      <span className="rank-name">{entry.username}</span>
                      <span className="rank-sub">{entry.trees.toLocaleString()} trees • Lvl {entry.level}</span>
                    </div>
                    <div className="rank-score-col">
                      <span className="rank-score-val">{entry.score.toLocaleString()}</span>
                      <span className="rank-score-label">PTS</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="telemetry-ranks-footer">
              <Link href="/leaderboard" className="btn btn-wood btn-sm telemetry-view-all-btn">
                <span>View Full Leaderboard</span>
                <span className="arr">→</span>
              </Link>
            </div>
          </div>
        )}
      </aside>
    );
  }

  // ===== FLOATING MOBILE DRAWER MODE =====
  return (
    <>
      {/* Floating launcher toggle button docked at bottom-right corner */}
      {!isOpen && (
        <button
          type="button"
          className="chat-floating-launcher"
          onClick={() => {
            sound.playClick();
            setIsOpen(true);
          }}
          title="Open Degens Live Trollbox"
          aria-label="Open Degens Live Trollbox"
        >
          <span className="chat-live-pulse" />
          <span className="chat-launcher-text">💬 Trollbox</span>
          <span className="chat-live-tag">LIVE</span>
          {messages.length > 0 && (
            <span className="chat-unread-count">{messages.length}</span>
          )}
        </button>
      )}

      {/* Floating drawer modal / panel */}
      {isOpen && (
        <div
          className="global-chat-panel floating-drawer"
          role="region"
          aria-label="Global Degens Chat"
        >
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-left">
              <span className="chat-live-pulse" />
              <span className="chat-title">DEGENS TROLLBOX</span>
              <span className="chat-online-badge">REAL-TIME</span>
            </div>
            <div className="chat-header-actions">
              <button
                type="button"
                className="chat-close-btn"
                onClick={() => {
                  sound.playClick();
                  setIsOpen(false);
                }}
                title="Close chat drawer"
                aria-label="Close chat drawer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Message List */}
          <div className="chat-messages-wrap" ref={chatMessagesWrapRef}>
            <div className="chat-messages-list">
              {messages.length === 0 ? (
                <div className="chat-empty-state">
                  <span>No messages yet. Be the first degen to drop alpha!</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isCurrentUser =
                    walletConnected && me?.walletAddress === msg.wallet;
                  return (
                    <div
                      key={msg.id}
                      className={`chat-bubble ${
                        isCurrentUser ? "chat-bubble-user" : ""
                      }`}
                    >
                      <img
                        src={msg.avatar || "/assets/ui/avatar-default.png"}
                        alt=""
                        className="chat-avatar"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/assets/ui/avatar-default.png";
                        }}
                      />
                      <div className="chat-bubble-body">
                        <div className="chat-bubble-meta">
                          <span className="chat-sender">{msg.sender}</span>
                          {msg.badge && (
                            <span
                              className="chat-badge"
                              style={{
                                color: msg.badgeColor,
                                borderColor: msg.badgeColor,
                              }}
                            >
                              {msg.badge}
                            </span>
                          )}
                          <span className="chat-time">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <div className="chat-text">{msg.text}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Reaction Chips */}
          <div className="chat-quick-chips">
            <button
              type="button"
              className="quick-chip"
              onClick={() => sendQuickChip("🪓 CHOPPING HARD!")}
            >
              🪓 Chop
            </button>
            <button
              type="button"
              className="quick-chip"
              onClick={() => sendQuickChip("🚀 LFG $TAP!")}
            >
              🚀 LFG
            </button>
            <button
              type="button"
              className="quick-chip"
              onClick={() => sendQuickChip("💎 BULLISH!")}
            >
              💎 Bullish
            </button>
            <button
              type="button"
              className="quick-chip"
              onClick={() => sendQuickChip("⚠️ DODGE RED CANDLES!")}
            >
              ⚠️ Dodge
            </button>
          </div>

          {/* Input Box or Wallet Lock Notice */}
          {!walletConnected ? (
            <div className="chat-guest-lock">
              <div className="chat-lock-msg">
                <span className="chat-lock-icon">🔒</span>
                <span>Connect Solana wallet to participate in the live chat</span>
              </div>
              <button
                type="button"
                className="btn btn-gold btn-sm chat-connect-btn"
                onClick={openWalletModal}
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <form className="chat-input-row" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder="Message global apes..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={200}
                disabled={sending}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!inputText.trim() || sending}
              >
                {sending ? "..." : "Send"}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
