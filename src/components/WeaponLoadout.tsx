"use client";

import React, { useState, useEffect } from "react";
import { sound } from "@/lib/sound";

export interface Weapon {
  id: string;
  name: string;
  tier: string;
  badgeColor: string;
  speed: string;
  timberYield: string;
  critRate: string;
  desc: string;
  icon: string;
}

const WEAPONS: Weapon[] = [
  {
    id: "standard-hatchet",
    name: "Standard Steel Hatchet",
    tier: "COMMON",
    badgeColor: "#9ca3af",
    speed: "1.0x Base",
    timberYield: "100%",
    critRate: "5%",
    desc: "Reliable tempered steel axe. Balanced swing recovery and standard woodcutting efficiency.",
    icon: "🪓",
  },
  {
    id: "gilded-sol",
    name: "Gilded Sol Hatchet",
    tier: "RARE",
    badgeColor: "#ffd25e",
    speed: "1.15x Fast",
    timberYield: "115%",
    critRate: "12%",
    desc: "Forged with Solana gold alloy. Slices through heavy oak trunks with golden particle bursts.",
    icon: "🪙",
  },
  {
    id: "cyber-cleaver",
    name: "Cyber Laser Cleaver",
    tier: "EPIC",
    badgeColor: "#38bdf8",
    speed: "1.30x Super",
    timberYield: "130%",
    critRate: "20%",
    desc: "Overclocked high-frequency plasma edge. Vaporizes tree trunks on contact with neon sparks.",
    icon: "⚡",
  },
  {
    id: "diamond-maul",
    name: "Diamond Chimp Maul",
    tier: "LEGENDARY",
    badgeColor: "#a855f7",
    speed: "1.50x Ultra",
    timberYield: "150%",
    critRate: "32%",
    desc: "Forged by legendary Solana degens with diamond hands. Massive impact radius.",
    icon: "💎",
  },
];

export function WeaponLoadout() {
  const [selectedId, setSelectedId] = useState<string>("standard-hatchet");
  const [equippedId, setEquippedId] = useState<string>("standard-hatchet");

  useEffect(() => {
    const saved = localStorage.getItem("tap_equipped_weapon");
    if (saved && WEAPONS.some((w) => w.id === saved)) {
      setEquippedId(saved);
      setSelectedId(saved);
    }
  }, []);

  const handleEquip = (id: string) => {
    sound.playClick();
    setEquippedId(id);
    localStorage.setItem("tap_equipped_weapon", id);
  };

  const selectedWeapon = WEAPONS.find((w) => w.id === selectedId) || WEAPONS[0];
  const isEquipped = equippedId === selectedWeapon.id;

  return (
    <div className="panel panel-pad terminal-card weapon-loadout-panel" role="region" aria-label="Weapon Arsenal">
      <div className="terminal-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="eyebrow">ARSENAL LOADOUT</span>
          <span className="terminal-tag ok-tag">ACTIVE</span>
        </div>
        <span className="weapon-equipped-badge">
          EQUIPPED: <b>{WEAPONS.find((w) => w.id === equippedId)?.name}</b>
        </span>
      </div>

      {/* Weapon Selector Grid */}
      <div className="weapon-grid" style={{ marginTop: 14 }}>
        {WEAPONS.map((weapon) => {
          const isSelected = weapon.id === selectedId;
          const isItemEquipped = weapon.id === equippedId;
          return (
            <button
              key={weapon.id}
              type="button"
              className={`weapon-tile ${isSelected ? "is-selected" : ""} ${isItemEquipped ? "is-equipped" : ""}`}
              onClick={() => {
                sound.playClick();
                setSelectedId(weapon.id);
              }}
            >
              <div className="weapon-tile-header">
                <span className="weapon-tier-chip" style={{ color: weapon.badgeColor, borderColor: weapon.badgeColor }}>
                  {weapon.tier}
                </span>
                {isItemEquipped && <span className="weapon-equipped-indicator">✓</span>}
              </div>
              <div className="weapon-tile-icon">{weapon.icon}</div>
              <div className="weapon-tile-name">{weapon.name}</div>
            </button>
          );
        })}
      </div>

      {/* Selected Weapon Detail Inspect Card */}
      <div className="weapon-inspect-card" style={{ marginTop: 14 }}>
        <div className="inspect-header">
          <div>
            <h4 className="card-title" style={{ margin: 0, color: "var(--cream)" }}>
              {selectedWeapon.name}
            </h4>
            <span className="inspect-tier" style={{ color: selectedWeapon.badgeColor }}>
              Tier {selectedWeapon.tier} Weapon
            </span>
          </div>
          <button
            type="button"
            className={`btn btn-sm ${isEquipped ? "btn-ghost" : "btn-gold glow-cta"}`}
            onClick={() => handleEquip(selectedWeapon.id)}
            disabled={isEquipped}
          >
            {isEquipped ? "✓ Equipped" : "Equip Axe"}
          </button>
        </div>

        <p className="sub" style={{ margin: "10px 0 14px", fontSize: "12.5px", lineHeight: 1.5 }}>
          {selectedWeapon.desc}
        </p>

        {/* Stats breakdown */}
        <div className="weapon-stats-bars">
          <div className="wstat-item">
            <div className="wstat-label">
              <span>Swing Velocity</span>
              <strong>{selectedWeapon.speed}</strong>
            </div>
            <div className="wstat-bar-track">
              <div
                className="wstat-bar-fill"
                style={{
                  width: selectedWeapon.id === "standard-hatchet" ? "50%" : selectedWeapon.id === "gilded-sol" ? "68%" : selectedWeapon.id === "cyber-cleaver" ? "84%" : "100%",
                  background: selectedWeapon.badgeColor,
                }}
              />
            </div>
          </div>

          <div className="wstat-item">
            <div className="wstat-label">
              <span>Timber Yield</span>
              <strong>{selectedWeapon.timberYield}</strong>
            </div>
            <div className="wstat-bar-track">
              <div
                className="wstat-bar-fill"
                style={{
                  width: selectedWeapon.id === "standard-hatchet" ? "55%" : selectedWeapon.id === "gilded-sol" ? "70%" : selectedWeapon.id === "cyber-cleaver" ? "85%" : "100%",
                  background: selectedWeapon.badgeColor,
                }}
              />
            </div>
          </div>

          <div className="wstat-item">
            <div className="wstat-label">
              <span>Critical Chop Chance</span>
              <strong>{selectedWeapon.critRate}</strong>
            </div>
            <div className="wstat-bar-track">
              <div
                className="wstat-bar-fill"
                style={{
                  width: selectedWeapon.id === "standard-hatchet" ? "20%" : selectedWeapon.id === "gilded-sol" ? "45%" : selectedWeapon.id === "cyber-cleaver" ? "70%" : "100%",
                  background: selectedWeapon.badgeColor,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
