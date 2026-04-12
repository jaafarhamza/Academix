export type FinancialDashboardPeriod = "THIS_MONTH" | "LAST_MONTH" | "CUSTOM";

export type FinancialDashboardSeriesPoint = {
  date: string;
  collected: number;
  expected: number;
  outstanding: number;
  paymentsCount: number;
};

export type FinancialDashboardTotals = {
  collected: number;
  expected: number;
  outstanding: number;
  paymentsCount: number;
  collectionRate: number;
};

export type FinancialDashboard = {
  period: FinancialDashboardPeriod;
  range: {
    from: string;
    to: string;
  };
  totals: FinancialDashboardTotals;
  series: FinancialDashboardSeriesPoint[];
};

export type FinancialDashboardQuery = Partial<{
  period: FinancialDashboardPeriod;
  from: string;
  to: string;
}>;
