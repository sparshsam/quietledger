"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
};

export function Select({ value, onChange, options, placeholder = "Select...", className = "" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [focusedIdx, setFocusedIdx] = useState(0);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (options[focusedIdx]) {
          onChange(options[focusedIdx].value);
          setOpen(false);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }, [open, options, focusedIdx, onChange]);

  return (
    <div ref={ref} className={`select-wrapper ${className}`} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="select-trigger"
        onClick={() => { setOpen(!open); setFocusedIdx(options.findIndex((o) => o.value === value)); }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {displayLabel}
        <svg className="select-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="select-popover" role="listbox">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              className={"select-option" + (opt.value === value ? " selected" : "") + (idx === focusedIdx ? " focused" : "")}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              onMouseEnter={() => setFocusedIdx(idx)}
            >
              {opt.label}
              {opt.value === value && <span className="select-checkmark">&#10003;</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
