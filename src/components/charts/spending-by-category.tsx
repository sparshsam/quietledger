"use client";

type SpendingData = { category: string; total: number };

const currencyFormat = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
});

export function SpendingByCategoryChart({ data }: { data: SpendingData[] }) {
  const expenses = data.filter((d) => d.total < 0);
  if (expenses.length === 0) {
    return (
      <div className="chart-empty" aria-label="No spending data available">
        <p>No spending by category yet.</p>
      </div>
    );
  }

  const maxAbs = Math.max(...expenses.map((d) => Math.abs(d.total)), 1);

  return (
    <div className="chart" role="img" aria-label="Spending by category chart">
      {expenses.map((d) => {
        const pct = (Math.abs(d.total) / maxAbs) * 100;
        return (
          <div className="chart-bar-row" key={d.category}>
            <span className="chart-label">{d.category}</span>
            <div className="chart-bar-track">
              <div
                className="chart-bar-fill chart-bar-expense"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="chart-value">{currencyFormat.format(d.total)}</span>
          </div>
        );
      })}
    </div>
  );
}
