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

const currencyCompact = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
});

const currencyFull = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const INCOME = "#2a7a2a";
const EXPENSE = "#c94444";
const ACCENT = "#7A2F00";
const ZERO_LINE = "#d0d0d0";

const H = 400;
const PAD = { top: 24, right: 16, bottom: 36, left: 16 };
const MIN_GROUP_W = 48;
const BAR_GAP = 4;

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
        <p>Need at least 2 months of data.</p>
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const vw = Math.max(data.length * MIN_GROUP_W + PAD.left + PAD.right, 200);
  const cw = vw - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;
  const gw = cw / data.length;
  const bw = Math.max((gw - BAR_GAP) / 2, 3);
  const zeroY = PAD.top + ch / 2;
  const scale = (ch / 2) / maxVal;

  const summary = data
    .map(
      (d) =>
        `${monthLabel(d.month)}: income ${currencyFull.format(d.income)}, expenses ${currencyFull.format(d.expense)}`,
    )
    .join("; ");

  return (
    <>
      <style>{`
        .all-months-chart-svg { display: block; width: 100%; height: ${H}px; }
        @media (max-width: 767px) { .all-months-chart-svg { height: 250px; } }
        .all-months-chart-group { cursor: pointer; transition: opacity 0.15s; }
        .all-months-chart-group:hover rect { opacity: 0.7 !important; }
        .all-months-chart-group.active rect { opacity: 1 !important; }
        .all-months-chart-group.active:hover rect { opacity: 1 !important; }
      `}</style>
      <svg
        className="all-months-chart-svg"
        role="img"
        aria-label={`All months bar chart: ${summary}`}
        viewBox={`0 0 ${vw} ${H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Zero line */}
        <line
          x1={PAD.left}
          y1={zeroY}
          x2={vw - PAD.right}
          y2={zeroY}
          stroke={ZERO_LINE}
          strokeWidth={1}
        />

        {data.map((d, i) => {
          const gx = PAD.left + i * gw;
          const ih = d.income * scale;
          const eh = d.expense * scale;
          const ny = zeroY - d.net * scale;
          const active = d.month === activeMonth;
          const centerX = gx + gw / 2;

          return (
            <g
              key={d.month}
              className={`all-months-chart-group${active ? " active" : ""}`}
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
                {monthLabel(d.month)} — Income:{currencyCompact.format(d.income)} Expenses:{currencyCompact.format(d.expense)} Net:{currencyCompact.format(d.net)}
              </title>

              {/* Income bar (above zero) */}
              <rect
                x={gx}
                y={zeroY - ih}
                width={bw}
                height={Math.max(ih, 0)}
                fill={INCOME}
                opacity={active ? 1 : 0.3}
                rx={1}
              />

              {/* Expense bar (below zero) */}
              <rect
                x={gx + bw + BAR_GAP}
                y={zeroY}
                width={bw}
                height={Math.max(eh, 0)}
                fill={EXPENSE}
                opacity={active ? 1 : 0.3}
                rx={1}
              />

              {/* Net cashflow diamond marker */}
              <polygon
                points={`${centerX},${ny - 3} ${centerX + 3},${ny} ${centerX},${ny + 3} ${centerX - 3},${ny}`}
                fill={ACCENT}
                opacity={active ? 1 : 0.5}
              />

              {/* Month label */}
              <text
                x={centerX}
                y={H - 4}
                textAnchor="middle"
                fontSize={12}
                fill={active ? ACCENT : "var(--muted-dark, #666)"}
                fontWeight={active ? "bold" : "normal"}
              >
                {monthLabel(d.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </>
  );
}
