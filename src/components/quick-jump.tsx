"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, ArrowRight } from "lucide-react";
import type { Account } from "@/lib/data/types";

type QuickJumpItem = {
  id: string;
  label: string;
  type: "tab" | "account" | "category";
  action: () => void;
};

type QuickJumpProps = {
  tabs: readonly string[];
  accounts: Account[];
  categories: string[];
  onNavigate: (tab: string) => void;
  onSelectAccount: (accountId: string) => void;
  onSelectCategory: (category: string) => void;
  onClose: () => void;
};

export function QuickJump({
  tabs,
  accounts,
  categories,
  onNavigate,
  onSelectAccount,
  onSelectCategory,
  onClose,
}: QuickJumpProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on mount (component only mounts when opened)
  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  // Build and filter items
  const items = useMemo(() => {
    const result: QuickJumpItem[] = [];

    // Tab items
    tabs.forEach((tab) => {
      result.push({
        id: `tab-${tab.toLowerCase()}`,
        label: `Go to ${tab}`,
        type: "tab",
        action: () => onNavigate(tab),
      });
    });

    // Account items
    accounts
      .filter((a) => !a.archivedAt)
      .forEach((a) => {
        result.push({
          id: `account-${a.id}`,
          label: `${a.name} account`,
          type: "account",
          action: () => onSelectAccount(a.id),
        });
      });

    // Category items
    categories.forEach((cat) => {
      result.push({
        id: `category-${cat.toLowerCase().replace(/\s+/g, "-")}`,
        label: `${cat} category`,
        type: "category",
        action: () => onSelectCategory(cat),
      });
    });

    // Apply text filter
    if (query.trim()) {
      const q = query.toLowerCase();
      return result.filter((item) => item.label.toLowerCase().includes(q));
    }

    return result;
  }, [tabs, accounts, categories, query, onNavigate, onSelectAccount, onSelectCategory]);

  // Clamp selectedIndex when items change
  const safeIndex = Math.min(selectedIndex, Math.max(0, items.length - 1));

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelectedIndex(0);
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && items.length > 0) {
        e.preventDefault();
        const idx = Math.min(safeIndex, items.length - 1);
        items[idx].action();
        onClose();
      }
    },
    [items, safeIndex, onClose],
  );

  const handleItemClick = useCallback(
    (item: QuickJumpItem) => {
      item.action();
      onClose();
    },
    [onClose],
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || items.length === 0) return;
    const selectedEl = listRef.current.querySelector("[data-selected]");
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [safeIndex, items.length]);

  return createPortal(
    <div
      className="quickjump-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quick navigation"
    >
      <div
        className="quickjump-panel"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input */}
        <div className="quickjump-input-wrapper">
          <Search size={18} aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Go to tab, account, category&hellip;"
            aria-label="Quick jump search"
          />
        </div>

        {/* Results */}
        {items.length > 0 && (
          <div className="quickjump-results" role="listbox">
            {items.slice(0, 20).map((item, index) => (
              <div
                key={item.id}
                className={`quickjump-item ${index === safeIndex ? "selected" : ""}`}
                onClick={() => handleItemClick(item)}
                data-selected={index === safeIndex ? true : undefined}
                role="option"
                aria-selected={index === safeIndex}
              >
                <span className="quickjump-item-icon" aria-hidden>
                  {item.type === "tab" && "T"}
                  {item.type === "account" && "A"}
                  {item.type === "category" && "C"}
                </span>
                <span className="quickjump-item-label">{item.label}</span>
                <ArrowRight size={14} className="quickjump-item-arrow" aria-hidden />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query && items.length === 0 && (
          <div className="quickjump-empty">No results for &ldquo;{query}&rdquo;</div>
        )}

        {/* Footer */}
        <div className="quickjump-footer">
          <span>
            <kbd>&uarr;</kbd> <kbd>&darr;</kbd> navigate
          </span>
          <span>
            <kbd>&crarr;</kbd> select
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
