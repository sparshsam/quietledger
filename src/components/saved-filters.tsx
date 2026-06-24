"use client";

import { Save, X } from "lucide-react";

export type SavedFilter = {
  id: string;
  name: string;
  query: string;
  category?: string;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
};

type SavedFiltersProps = {
  filters: SavedFilter[];
  onApply: (filter: SavedFilter) => void;
  onSave: (filter: SavedFilter) => void;
  onDelete: (id: string) => void;
};

export function SavedFilters({ filters, onApply, onDelete }: SavedFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className="saved-filters-bar">
      <span className="saved-filters-bar-label">Saved</span>
      <div className="saved-filters-bar-list">
        {filters.map((f) => (
          <div key={f.id} className="saved-filters-bar-chip">
            <button
              className="saved-filters-bar-apply"
              onClick={() => onApply(f)}
              title={`Apply filter: ${f.name}`}
            >
              <Save size={12} aria-hidden />
              {f.name}
            </button>
            <button
              className="saved-filters-bar-remove"
              onClick={() => onDelete(f.id)}
              aria-label={`Delete saved filter "${f.name}"`}
            >
              <X size={11} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
