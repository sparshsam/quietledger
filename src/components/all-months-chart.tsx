"use client";

import { useMemo } from "react";
import type { Transaction } from "@/lib/data/types";
import { monthlyTotals } from "@/lib/finance/grouping";

type AllMonthsChartProps = {
  transactions: Transaction[];
  activeMonth: string;
  onSelectMonth: (month: string) => void;
};

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-CA", { month: "short" }).format(
    new Date(`${month}-01T12:00:00`),
  );
}

const currencyFull = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const currencyCompact = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
});

const INCOME = "#2a7a2a";
const EXPENSE = "#c94444";
const ACCENT = "#7A2F00";
const GRID = "rgba(26, 22, 18, 0.08)";
const ZERO = "rgba(26, 22, 18, 0.15)";

// Fixed viewBox dimensions — chart scales to container width, height follows proportionally
const VB_W = 1200;
const VB_H = 600;
const PAD = { top: 50, right: 60, bottom: 65, left: 60 };
const CHART_W = VB_W - PAD.left - PAD.right; // 1080
const CHART_H = VB_H - PAD.top - PAD.bottom; // 490
const ZERO_Y = PAD.top + CHART_H / 2;
const BAR_PCT = 0.3;   // each bar is 30% of group width
const GAP_PCT = 0.05;  // gap is 5% of group width

export function AllMonthsBarChart({
  transactions,
  activeMonth,
  onSelectMonth,
}: AllMonthsChartProps) {
  const data = useMemo(
    () =>
      monthlyTotals(transactions).map((m) => ({
        ...m,
        net: m.income - m.expense,
      })),
    [transactions],
  );

  if (data.length < 2) {
    return (
      <div className="chart-empty" role="img" aria-label="All months chart">
        <p>Need at least 2 months of data to show a trend.</p>
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense, Math.abs(d.net))));
  const scale = (CHART_H / 2) / maxVal;
  const groupW = CHART_W / data.length;
  const barW = Math.max(groupW * BAR_PCT, 12);  // minimum 12px at viewBox
  const gap = groupW * GAP_PCT;
  const halfBarW = barW / 2;

  // Gridline values (4 horizontal lines)
  const gridSteps = [0.25, 0.5, 0.75, 1];
  const gridLabels = gridSteps.map((s) => currencyCompact.format(Math.round(maxVal * s)));

  const summary = data
    .map((d) => `${monthLabel(d.month)}: income ${currencyFull.format(d.income)}, expenses ${currencyFull.format(d.expense)}`)
    .join("; ");

  return (
    <section className="report-section chart-section">
      <h2 className="section-title" style={{ marginBottom: "var(--space-lg)" }}>
        Income, Expenses &amp; Net Cash Flow
      </h2>

      <div className="chart-full-bleed">
        <svg
          className="chart-svg"
          role="img"
          aria-label={`Financial activity chart: ${summary}`}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Gridlines */}
          {gridSteps.map((s, i) => {
            const y = ZERO_Y - (CHART_H / 2) * s;
            return (
              <g key={`grid-${i}`}>
                <line x1={PAD.left} y1={y} x2={VB_W - PAD.right} y2={y} stroke={GRID} strokeWidth={1} />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--text-tertiary, #9C9382)">
                  {gridLabels[i]}
                </text>
              </g>
            );
          })}

          {/* Zero line */}
          <line x1={PAD.left} y1={ZERO_Y} x2={VB_W - PAD.right} y2={ZERO_Y} stroke={ZERO} strokeWidth={1.5} />

          {/* Bars */}
          {data.map((d, i) => {
            const gx = PAD.left + i * groupW;
            const ih = d.income * scale;
            const eh = d.expense * scale;
            const netY = ZERO_Y - d.net * scale;
            const active = d.month === activeMonth;
            const cx = gx + groupW / 2;
            const incomeX = cx - halfBarW - gap / 2;
            const expenseX = cx + gap / 2;

            return (
              <g
                key={d.month}
                className={`chart-bar-group${active ? " active" : ""}`}
                onClick={() => onSelectMonth(d.month)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectMonth(d.month);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${monthLabel(d.month)}: income ${currencyFull.format(d.income)}, expenses ${currencyFull.format(d.expense)}, net ${currencyFull.format(d.net)}`}
              >
                <title>
                  {monthLabel(d.month)} — Income: {currencyCompact.format(d.income)} Expenses: {currencyCompact.format(d.expense)} Net: {currencyCompact.format(d.net)}
                </title>

                {/* Income bar */}
                <rect
                  x={incomeX}
                  y={ZERO_Y - ih}
                  width={barW}
                  height={Math.max(ih, 0)}
                  fill={INCOME}
                  opacity={active ? 0.9 : 0.35}
                  rx={2}
                />

                {/* Expense bar */}
                <rect
                  x={expenseX}
                  y={ZERO_Y}
                  width={barW}
                  height={Math.max(eh, 0)}
                  fill={EXPENSE}
                  opacity={active ? 0.9 : 0.35}
                  rx={2}
                />

                {/* Net cashflow diamond */}
                {d.net !== 0 && (
                  <polygon
                    points={`${cx},${netY - 5} ${cx + 5},${netY} ${cx},${netY + 5} ${cx - 5},${netY}`}
                    fill={ACCENT}
                    opacity={active ? 1 : 0.6}
                  />
                )}

                {/* Month label */}
                <text
                  x={cx}
                  y={VB_H - 8}
                  textAnchor="middle"
                  fontSize={12}
                  fill={d.month === activeMonth ? ACCENT : "var(--text-tertiary, #9C9382)"}
                  fontWeight={d.month === activeMonth ? "bold" : "normal"}
                >
                  {monthLabel(d.month)}
                </text>
              </g>
            );
          })}

          {/* Legend */}
          <g transform={`translate(${VB_W - 160}, 16)`}>
            <rect x={0} y={0} width={10} height={10} fill={INCOME} rx={1} />
            <text x={16} y={9} fontSize={11} fill="var(--text-secondary, #5C5548)">Income</text>
            <rect x={70} y={0} width={10} height={10} fill={EXPENSE} rx={1} />
            <text x={86} y={9} fontSize={11} fill="var(--text-secondary, #5C5548)">Expenses</text>
          </g>
        </svg>
      </div>
    </section>
  );
}
