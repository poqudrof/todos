"use client";

import { useEffect, useRef, useState } from "react";
import { personColor } from "../lib/themes.js";

export const EVENT_EMOJIS = [
  "🎉",
  "🧳",
  "🏖️",
  "⛺",
  "🎄",
  "🎂",
  "🍼",
  "🏔️",
  "🚗",
  "✈️",
  "🏡",
  "🎁",
  "🌸",
  "☀️",
  "🎃",
  "💍",
  "🎓",
  "🍕",
  "🧺",
  "⚽",
  "🎶",
  "🐣",
  "🚲",
  "⛵",
];
export const PERSON_EMOJIS = [
  "👩",
  "👨",
  "👶",
  "🧒",
  "👧",
  "👦",
  "👵",
  "👴",
  "👪",
  "🐶",
  "🐱",
  "🦁",
  "🐻",
  "🐰",
  "🦊",
  "🐼",
  "🐸",
  "🦄",
  "🐯",
  "🐨",
  "🌟",
  "🚀",
  "🎨",
  "🧸",
];

// Text shown as plain text, turned into an input on click.
export function Editable({
  value,
  onSave,
  label,
  className = "",
  multiline = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    const text = draft.trim();
    if (text && text !== value) onSave(text);
  };

  if (editing) {
    return (
      <input
        className={`editable-input ${className}`}
        value={draft}
        aria-label={label}
        autoFocus
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className={`editable ${multiline ? "multiline" : ""} ${className}`}
      title={label}
      aria-label={`${label} : ${value}`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {value}
    </button>
  );
}

// A small grid of emojis opening under a button.
export function EmojiPicker({
  value,
  choices,
  onPick,
  label,
  children,
  allowNone = true,
}) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!box.current?.contains(e.target)) setOpen(false);
    };
    const escape = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <span className="picker" ref={box}>
      <button
        type="button"
        className="picker-button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {children}
      </button>
      {open && (
        <span className="picker-grid" role="listbox" aria-label={label}>
          {choices.map((emoji) => (
            <button
              type="button"
              key={emoji}
              role="option"
              aria-selected={emoji === value}
              className={emoji === value ? "on" : ""}
              onClick={() => {
                onPick(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
          {allowNone && (
            <button
              type="button"
              className="none"
              onClick={() => {
                onPick("");
                setOpen(false);
              }}
            >
              Aucun
            </button>
          )}
        </span>
      )}
    </span>
  );
}

export function Avatar({ name, emoji, everyone, size = 44 }) {
  const color = everyone ? "var(--accent)" : personColor(name);
  return (
    <span
      className={`avatar ${emoji ? "has-emoji" : ""}`}
      style={{
        "--avatar": color,
        width: size,
        height: size,
        fontSize: size * 0.5,
      }}
      aria-hidden="true"
    >
      {emoji ||
        (everyone ? "🌟" : (name || "?").trim().charAt(0).toUpperCase())}
    </span>
  );
}

// Triangle flags hanging on a string.
export function Garland({ colors, count = 15 }) {
  const flags = Array.from({ length: count }, (_, i) => {
    const x = i / (count - 1);
    const sag = 4 * x * (1 - x);
    const slope = (1 - 2 * x) * -14;
    return {
      left: `${x * 100}%`,
      top: `${sag * 30}px`,
      rotate: slope,
      color: colors[i % colors.length],
    };
  });
  return (
    <div className="garland" aria-hidden="true">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none">
        <path
          d="M0 2 Q50 62 100 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {flags.map((flag, i) => (
        <span
          key={i}
          className="flag"
          style={{
            left: flag.left,
            top: flag.top,
            background: flag.color,
            transform: `translateX(-50%) rotate(${flag.rotate}deg)`,
            animationDelay: `${(i % 5) * -0.7}s`,
          }}
        />
      ))}
    </div>
  );
}

const CONFETTI_COLORS = [
  "#ff6b6b",
  "#fcc419",
  "#51cf66",
  "#339af0",
  "#cc5de8",
  "#ff922b",
];

export function Confetti({ burst }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!burst) return;
    setPieces(
      Array.from({ length: 22 }, (_, i) => ({
        id: `${burst}-${i}`,
        dx: Math.round((Math.random() - 0.5) * 260),
        dy: Math.round(-60 - Math.random() * 140),
        rot: Math.round(Math.random() * 720 - 360),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.12,
      })),
    );
    const timer = setTimeout(() => setPieces([]), 1400);
    return () => clearTimeout(timer);
  }, [burst]);
  return (
    <span className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
            "--rot": `${p.rot}deg`,
            background: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </span>
  );
}

export function formatDate(date) {
  if (!date) return "";
  const day = new Date(`${date}T12:00:00`);
  if (Number.isNaN(day.getTime())) return "";
  return day.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// "Aujourd'hui", "Demain", "Dans 5 jours"… or null once the day is past.
export function countdown(date) {
  if (!date) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const days = Math.round((new Date(`${date}T12:00:00`) - today) / 86400000);
  if (Number.isNaN(days) || days < 0) return null;
  if (days === 0) return "C'est aujourd'hui !";
  if (days === 1) return "C'est demain !";
  return `J-${days}`;
}
