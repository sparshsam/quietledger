"use client";

type PeriodData = { label: string; income: number; expense: number };

const currencyFormat = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
});

export function IncomeVsExpensesChart({ data }: { data: PeriodData[] }) {
  if (data.length === 0) {
    return (
      <div className="chart-empty" aria-label="No income or expense data">
        <p>No income or expense data yet.</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);

  return (
    <div className="chart" role="img" aria-label="Income vs expenses chart">
      {data.map((d) => {
        const incomePct = (d.income / maxVal) * 100;
        const expensePct = (d.expense / maxVal) * 100;
        return (
          <div className="chart-bar-row" key={d.label}>
            <span className="chart-label">{d.label}</span>
            <div className="chart-group">
              <div className="chart-bar-track chart-bar-track-sm">
                <div
                  className="chart-bar-fill chart-bar-income"
                  style={{ width: `${incomePct}%` }}
                  title={`Income: ${currencyFormat.format(d.income)}`}
                />
              </div>
              <div className="chart-bar-track chart-bar-track-sm">
                <div
                  className="chart-bar-fill chart-bar-expense"
                  style={{ width: `${expensePct}%` }}
                  title={`Expenses: ${currencyFormat.format(d.expense)}`}
                />
              </div>
            </div>
            <span className="chart-value">
              {currencyFormat.format(d.income - d.expense)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
