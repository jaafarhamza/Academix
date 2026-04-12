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

export class FinancialDashboardOutstandingSummaryDto {
  count!: number;
  totalAmount!: number;
}

export class FinancialDashboardBreakdownItemDto {
  id!: string | null;
  name!: string;
  collected!: number;
  expected!: number;
  outstanding!: number;
  paymentsCount!: number;
}

export class FinancialDashboardResponseDto {
  period!: FinancialDashboardPeriod;
  range!: {
    from: string;
    to: string;
  };
  totals!: FinancialDashboardTotalsDto;
  outstandingSummary!: FinancialDashboardOutstandingSummaryDto;
  breakdown!: {
    byGroup: FinancialDashboardBreakdownItemDto[];
    byTeacher: FinancialDashboardBreakdownItemDto[];
  };
  series!: FinancialDashboardSeriesPointDto[];
}
