import { FinancialDashboardPeriod } from './query-financial-dashboard.dto';

export class FinancialDashboardSeriesPointDto {
  date!: string;
  collected!: number;
  expected!: number;
  outstanding!: number;
  paymentsCount!: number;
}

export class FinancialDashboardTotalsDto {
  collected!: number;
  expected!: number;
  outstanding!: number;
  paymentsCount!: number;
  collectionRate!: number;
}

export class FinancialDashboardResponseDto {
  period!: FinancialDashboardPeriod;
  range!: {
    from: string;
    to: string;
  };
  totals!: FinancialDashboardTotalsDto;
  series!: FinancialDashboardSeriesPointDto[];
}
