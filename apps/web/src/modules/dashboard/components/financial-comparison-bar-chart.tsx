"use client";

import type { FinancialDashboardSeriesPoint } from "../types/dashboard.types";

type FinancialComparisonBarChartProps = {
  title: string;
  subtitle: string;
  points: FinancialDashboardSeriesPoint[];
};

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "MAD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function parseDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function formatDateLabel(date: string) {
  const parsedDate = parseDate(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return dateFormatter.format(parsedDate);
}

function formatMonthLabel(date: string) {
  const parsedDate = parseDate(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return monthFormatter.format(parsedDate);
}

function formatDayNumber(date: string) {
  const parsedDate = parseDate(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return `${parsedDate.getDate()}`;
}

function getYAxisTicks(maxValue: number) {
  if (maxValue <= 0) {
    return [0, 1];
  }

  return [0, 0.25, 0.5, 0.75, 1].map((step) => maxValue * step);
}

export function FinancialComparisonBarChart({
  title,
  subtitle,
  points,
}: FinancialComparisonBarChartProps) {
  const svgWidth = 960;
  const svgHeight = 360;
  const chartMargin = {
    top: 24,
    right: 18,
    bottom: 58,
    left: 60,
  };

  const plotWidth = svgWidth - chartMargin.left - chartMargin.right;
  const plotHeight = svgHeight - chartMargin.top - chartMargin.bottom;
  const maxValue = Math.max(
    0,
    ...points.flatMap((point) => [point.collected, point.expected]),
  );
  const safeMaxValue = maxValue <= 0 ? 1 : maxValue;
  const yAxisTicks = getYAxisTicks(maxValue);
  const groupWidth = points.length > 0 ? plotWidth / points.length : plotWidth;
  const innerGroupWidth = Math.min(groupWidth * 0.76, 48);
  const barGap = Math.max(4, innerGroupWidth * 0.12);
  const barWidth = Math.max(6, (innerGroupWidth - barGap) / 2);

  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: "var(--color-chart-1)" }}
            />
            <span>Expected</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: "var(--color-chart-5)" }}
            />
            <span>Collected</span>
          </div>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed px-3 py-6 text-xs text-muted-foreground">
          No chart data is available for the selected period.
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-180">
              <svg
                aria-labelledby="financial-comparison-chart-title financial-comparison-chart-description"
                className="h-auto w-full"
                role="img"
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              >
                <title id="financial-comparison-chart-title">{title}</title>
                <desc id="financial-comparison-chart-description">
                  Grouped bar chart comparing expected and collected payment
                  amounts for each day in the selected period.
                </desc>

                {yAxisTicks.map((tickValue) => {
                  const y =
                    chartMargin.top +
                    plotHeight -
                    (tickValue / safeMaxValue) * plotHeight;

                  return (
                    <g key={tickValue}>
                      <line
                        stroke="color-mix(in oklab, var(--border) 88%, transparent)"
                        strokeDasharray="4 6"
                        strokeWidth="1"
                        x1={chartMargin.left}
                        x2={chartMargin.left + plotWidth}
                        y1={y}
                        y2={y}
                      />
                      <text
                        fill="var(--color-muted-foreground)"
                        fontSize="10"
                        textAnchor="end"
                        x={chartMargin.left - 10}
                        y={y + 4}
                      >
                        {formatCurrency(tickValue)}
                      </text>
                    </g>
                  );
                })}

                <line
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  x1={chartMargin.left}
                  x2={chartMargin.left + plotWidth}
                  y1={chartMargin.top + plotHeight}
                  y2={chartMargin.top + plotHeight}
                />

                {points.map((point, index) => {
                  const expectedHeight = (point.expected / safeMaxValue) * plotHeight;
                  const collectedHeight =
                    (point.collected / safeMaxValue) * plotHeight;
                  const groupCenter =
                    chartMargin.left + groupWidth * index + groupWidth / 2;
                  const groupStart = groupCenter - innerGroupWidth / 2;
                  const expectedX = groupStart;
                  const collectedX = groupStart + barWidth + barGap;
                  const expectedY =
                    chartMargin.top + plotHeight - expectedHeight;
                  const collectedY =
                    chartMargin.top + plotHeight - collectedHeight;

                  return (
                    <g key={point.date}>
                      <rect
                        fill="var(--color-chart-1)"
                        fillOpacity="0.5"
                        height={Math.max(expectedHeight, 2)}
                        rx="6"
                        ry="6"
                        width={barWidth}
                        x={expectedX}
                        y={Math.min(expectedY, chartMargin.top + plotHeight - 2)}
                      >
                        <title>
                          {`${formatDateLabel(point.date)} expected: ${formatCurrency(
                            point.expected,
                          )}`}
                        </title>
                      </rect>
                      <rect
                        fill="var(--color-chart-5)"
                        fillOpacity="0.88"
                        height={Math.max(collectedHeight, 2)}
                        rx="6"
                        ry="6"
                        width={barWidth}
                        x={collectedX}
                        y={Math.min(collectedY, chartMargin.top + plotHeight - 2)}
                      >
                        <title>
                          {`${formatDateLabel(point.date)} collected: ${formatCurrency(
                            point.collected,
                          )}`}
                        </title>
                      </rect>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-180 rounded-lg border bg-card/40 p-3">
              <div
                className="grid items-center gap-y-2 text-xs"
                style={{
                  gridTemplateColumns: `96px repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))`,
                }}
              >
                <div className="font-bold text-foreground">
                  {points.length > 0 ? formatMonthLabel(points[0].date) : "Month"}
                </div>
                {points.map((point) => (
                  <div
                    key={`${point.date}-day`}
                    className="font-medium text-muted-foreground"
                  >
                    {formatDayNumber(point.date)}
                  </div>
                ))}

                <div className="font-medium text-foreground">Payment</div>
                {points.map((point) => (
                  <div
                    key={`${point.date}-payments`}
                    className="text-muted-foreground"
                  >
                    {point.paymentsCount}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Expected</th>
                  <th className="px-2 py-2 font-medium">Collected</th>
                  <th className="px-2 py-2 font-medium">Outstanding</th>
                  <th className="px-2 py-2 font-medium">Payments</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.date} className="border-b last:border-b-0">
                    <td className="px-2 py-3 font-medium">
                      {formatDateLabel(point.date)}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {formatCurrency(point.expected)}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {formatCurrency(point.collected)}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {formatCurrency(point.outstanding)}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {point.paymentsCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
