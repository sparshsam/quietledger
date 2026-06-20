"use client";

type TrendData = { month: string; income: number; expense: number; net: number };

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-CA", { month: "short" }).format(
    new Date(`${month}-01T12:00:00`),
  );
}

export function MonthlyTrendChart({ data }: { data: TrendData[] }) {
  if (data.length < 2) {
    return (
      <div className="chart-empty" aria-label="Monthly trend data">
        <p>Need at least 2 months of data for a trend.</p>
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const svgWidth = 280;
  const svgHeight = 120;
  const pad = { top: 8, right: 8, bottom: 20, left: 8 };
  const chartW = svgWidth - pad.left - pad.right;
  const chartH = svgHeight - pad.top - pad.bottom;
  const stepX = chartW / (data.length - 1 || 1);

  const incomePath = data
    .map((d, i) =>
      `${i === 0 ? "M" : "L"} ${pad.left + i * stepX} ${pad.top + chartH - (d.income / maxVal) * chartH}`
    )
    .join(" ");

  const expensePath = data
    .map((d, i) =>
      `${i === 0 ? "M" : "L"} ${pad.left + i * stepX} ${pad.top + chartH - (d.expense / maxVal) * chartH}`
    )
    .join(" ");

  return (
    <div role="img" aria-label="Monthly trend chart showing income and expenses over time">
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        <path d={incomePath} fill="none" stroke="var(--sage-dark)" strokeWidth={2} />
        <path d={expensePath} fill="none" stroke="var(--amber-dark)" strokeWidth={2} />
        {data.map((d, i) => (
          <text
            key={d.month}
            x={pad.left + i * stepX}
            y={svgHeight - 4}
            textAnchor="middle"
            fontSize={9}
            fill="var(--muted-dark)"
          >
            {monthLabel(d.month)}
          </text>
        ))}
      </svg>
      <div className="chart-legend">
        <span><i className="legend-income" /> Income</span>
        <span><i className="legend-expense" /> Expenses</span>
      </div>
    </div>
  );
}
