"use client";

import { useEffect, useRef, useState } from "react";

export const DOC_EMOJIS = [
  "🧳",
  "🏖️",
  "⛺",
  "🎄",
  "🎂",
  "🎉",
  "🍼",
  "🏡",
  "🛒",
  "☀️",
  "🌙",
  "📚",
  "🧹",
  "🍽️",
  "🎒",
  "🚗",
  "✈️",
  "🎁",
  "🌸",
  "🎃",
  "⚽",
  "🎨",
  "🐣",
  "📝",
];
export const LIST_EMOJIS = [
  "👩",
  "👨",
  "👶",
  "🧒",
  "👧",
  "👦",
  "👵",
  "👴",
  "👨‍👩‍👧‍👦",
  "🐶",
  "🐱",
  "🦁",
  "🐻",
  "🐰",
  "🦊",
  "🐼",
  "🐸",
  "🦄",
  "🌟",
  "🚀",
  "🧸",
  "🥕",
  "🧀",
  "🍝",
  "🥖",
  "🧴",
  "🎈",
  "🍰",
  "🎯",
  "✉️",
  "🧺",
  "🛏️",
];

// Text shown as plain text, turned into an input on click.
export function Editable({
  value,
  onSave,
  label,
  placeholder = "",
  className = "",
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    const text = draft.trim();
    if (text !== value && (text || placeholder)) onSave(text);
  };

  if (editing) {
    return (
      <input
        className={`editable-input ${className}`}
        value={draft}
        aria-label={label}
        placeholder={placeholder}
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
      className={`editable ${value ? "" : "empty"} ${className}`}
      title={label}
      aria-label={`${label} : ${value || placeholder}`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {value || placeholder}
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

  const pick = (emoji) => {
    onPick(emoji);
    setOpen(false);
  };

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
              onClick={() => pick(emoji)}
            >
              {emoji}
            </button>
          ))}
          {allowNone && (
            <button type="button" className="none" onClick={() => pick("")}>
              Aucun
            </button>
          )}
        </span>
      )}
    </span>
  );
}

export function Avatar({ name, emoji, color, size = 40 }) {
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
      {emoji || (name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

// Triangle flags hanging on a string, like on the PDF.
export function Garland({ colors, count = 15 }) {
  if (!colors) return <div className="garland plain" aria-hidden="true" />;
  const flags = Array.from({ length: count }, (_, i) => {
    const x = (i + 0.5) / count;
    return {
      left: `${x * 100}%`,
      top: `${2 + 4 * x * (1 - x) * 30}px`,
      rotate: (1 - 2 * x) * -14,
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
          strokeWidth="1.2"
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

export function themeStyle(theme) {
  return {
    "--bg": theme.bg,
    "--dot": theme.dot,
    "--accent": theme.accent,
    "--soft": theme.soft,
  };
}
