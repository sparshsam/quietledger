"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type DatePickerProps = {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(`${str}T12:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function monthStartDay(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function DatePicker({ value, onChange, placeholder = "Select date", className = "" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(0);
  const [viewMonth, setViewMonth] = useState(0);
  const [focusedDay, setFocusedDay] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const parsed = parseDate(value);

  // Initialize view to current month or selected month
  useEffect(() => {
    queueMicrotask(() => {
      if (parsed) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      } else {
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
      }
    });
  }, [open]); // reset when opening

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

  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const dim = daysInMonth(viewYear, viewMonth);
  const startDay = monthStartDay(viewYear, viewMonth);
  const days: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= dim; d++) days.push(d);

  function handleSelect(day: number) {
    onChange(formatDate(viewYear, viewMonth, day));
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        setFocusedDay((d) => Math.max(1, (d ?? 1) - 1));
        break;
      case "ArrowRight":
        e.preventDefault();
        setFocusedDay((d) => Math.min(dim, (d ?? 1) + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedDay((d) => Math.max(1, (d ?? 1) - 7));
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedDay((d) => Math.min(dim, (d ?? 1) + 7));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedDay) handleSelect(focusedDay);
        break;
    }
  }, [open, dim, focusedDay]);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-CA", { month: "long", year: "numeric" });

  return (
    <div ref={ref} className={`datepicker-wrapper ${className}`} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="datepicker-trigger"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Date: ${parsed ? formatDisplay(parsed) : placeholder}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{parsed ? formatDisplay(parsed) : placeholder}</span>
      </button>

      {open && (
        <div className="datepicker-popover" role="dialog" aria-label={`Calendar for ${monthLabel}`}>
          {/* Header */}
          <div className="datepicker-header">
            <button type="button" className="datepicker-nav" onClick={prevMonth} aria-label="Previous month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="datepicker-month">{monthLabel}</span>
            <button type="button" className="datepicker-nav" onClick={nextMonth} aria-label="Next month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="datepicker-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w} className="datepicker-weekday">{w}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className="datepicker-grid">
            {days.map((d, i) => {
              if (d === null) return <div key={`e-${i}`} className="datepicker-empty" />;
              const dateStr = formatDate(viewYear, viewMonth, d);
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;
              const isFocused = focusedDay === d;
              return (
                <button
                  key={d}
                  type="button"
                  className={
                    "datepicker-day" +
                    (isSelected ? " selected" : "") +
                    (isToday && !isSelected ? " today" : "") +
                    (isFocused && !isSelected ? " focused" : "")
                  }
                  onClick={() => handleSelect(d)}
                  onMouseEnter={() => setFocusedDay(d)}
                  aria-label={`${new Date(viewYear, viewMonth, d).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`}
                  aria-selected={isSelected}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
