"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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

export function GlobalChat() {
  const { me, openWalletModal } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const chatMessagesWrapRef = useRef<HTMLDivElement>(null);

  const walletConnected = Boolean(me && !me.isGuest && me.walletAddress);

  // Safely scroll inner chat messages without scrolling the parent browser viewport
  useEffect(() => {
    if (isOpen && chatMessagesWrapRef.current) {
      chatMessagesWrapRef.current.scrollTop = chatMessagesWrapRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

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

  // Throttle polling: 15s (15000ms) when chat drawer is closed vs 3.5s (3500ms) when open
  useEffect(() => {
    fetchMessages();
    const pollInterval = isOpen ? 3500 : 15000;
    const timer = setInterval(fetchMessages, pollInterval);
    return () => clearInterval(timer);
  }, [isOpen, fetchMessages]);

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
