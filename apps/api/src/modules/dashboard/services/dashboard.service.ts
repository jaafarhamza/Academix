import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { FinancialDashboardResponseDto } from '../dto/financial-dashboard-response.dto';
import {
  FinancialDashboardPeriod,
  QueryFinancialDashboardDto,
} from '../dto/query-financial-dashboard.dto';

type DecimalLike = number | string | { toNumber(): number };

type ResolvedDateRange = {
  period: FinancialDashboardPeriod;
  start: Date;
  endExclusive: Date;
  from: string;
  to: string;
};

type SeriesAccumulator = {
  date: string;
  collected: number;
  expected: number;
  outstanding: number;
  paymentsCount: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  async getFinancial(
    centerId: string,
    query: QueryFinancialDashboardDto,
    now = new Date(),
  ): Promise<FinancialDashboardResponseDto> {
    const range = this.resolveDateRange(query, now);
    const payments = await this.prismaService.payment.findMany({
      where: {
        centerId,
        paymentDate: {
          gte: range.start,
          lt: range.endExclusive,
        },
      },
      orderBy: [{ paymentDate: 'asc' }, { id: 'asc' }],
      select: {
        amount: true,
        rest: true,
        paymentDate: true,
      },
    });

    const seriesByDate = this.initializeDailySeries(range);
    let totalCollected = 0;
    let totalExpected = 0;
    let totalOutstanding = 0;
    let totalPaymentsCount = 0;

    for (const payment of payments) {
      const expected = this.toNumber(payment.amount);
      const outstanding = this.toNumber(payment.rest);
      const collected = this.fromCents(
        this.toCents(expected) - this.toCents(outstanding),
      );
      const dateKey = this.formatDateKey(payment.paymentDate);
      const bucket = seriesByDate.get(dateKey);

      totalExpected = this.fromCents(
        this.toCents(totalExpected) + this.toCents(expected),
      );
      totalCollected = this.fromCents(
        this.toCents(totalCollected) + this.toCents(collected),
      );
      totalOutstanding = this.fromCents(
        this.toCents(totalOutstanding) + this.toCents(outstanding),
      );
      totalPaymentsCount += 1;

      if (!bucket) {
        continue;
      }

      bucket.expected = this.fromCents(
        this.toCents(bucket.expected) + this.toCents(expected),
      );
      bucket.collected = this.fromCents(
        this.toCents(bucket.collected) + this.toCents(collected),
      );
      bucket.outstanding = this.fromCents(
        this.toCents(bucket.outstanding) + this.toCents(outstanding),
      );
      bucket.paymentsCount += 1;
    }

    const collectionRate =
      totalExpected > 0
        ? Number(((totalCollected / totalExpected) * 100).toFixed(2))
        : 0;

    return {
      period: range.period,
      range: {
        from: range.from,
        to: range.to,
      },
      totals: {
        collected: totalCollected,
        expected: totalExpected,
        outstanding: totalOutstanding,
        paymentsCount: totalPaymentsCount,
        collectionRate,
      },
      series: [...seriesByDate.values()],
    };
  }

  private resolveDateRange(
    query: QueryFinancialDashboardDto,
    now: Date,
  ): ResolvedDateRange {
    const period = query.period ?? FinancialDashboardPeriod.THIS_MONTH;

    if (period === FinancialDashboardPeriod.CUSTOM) {
      if (!query.from || !query.to) {
        throw new BadRequestException(
          'from and to are required when period is CUSTOM',
        );
      }

      const start = this.parseDateOnly(query.from);
      const end = this.parseDateOnly(query.to);
      if (start.getTime() > end.getTime()) {
        throw new BadRequestException(
          'from must be earlier than or equal to to',
        );
      }

      return {
        period,
        start,
        endExclusive: this.addDays(end, 1),
        from: query.from,
        to: query.to,
      };
    }

    const utcNow = this.startOfUtcDay(now);
    const currentMonthStart = new Date(
      Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1),
    );

    if (period === FinancialDashboardPeriod.LAST_MONTH) {
      const lastMonthStart = new Date(
        Date.UTC(
          currentMonthStart.getUTCFullYear(),
          currentMonthStart.getUTCMonth() - 1,
          1,
        ),
      );

      return {
        period,
        start: lastMonthStart,
        endExclusive: currentMonthStart,
        from: this.formatDateKey(lastMonthStart),
        to: this.formatDateKey(this.addDays(currentMonthStart, -1)),
      };
    }

    const nextMonthStart = new Date(
      Date.UTC(
        currentMonthStart.getUTCFullYear(),
        currentMonthStart.getUTCMonth() + 1,
        1,
      ),
    );

    return {
      period,
      start: currentMonthStart,
      endExclusive: nextMonthStart,
      from: this.formatDateKey(currentMonthStart),
      to: this.formatDateKey(this.addDays(nextMonthStart, -1)),
    };
  }

  private initializeDailySeries(
    range: ResolvedDateRange,
  ): Map<string, SeriesAccumulator> {
    const series = new Map<string, SeriesAccumulator>();
    let cursor = new Date(range.start);

    while (cursor.getTime() < range.endExclusive.getTime()) {
      const dateKey = this.formatDateKey(cursor);
      series.set(dateKey, {
        date: dateKey,
        collected: 0,
        expected: 0,
        outstanding: 0,
        paymentsCount: 0,
      });
      cursor = this.addDays(cursor, 1);
    }

    return series;
  }

  private parseDateOnly(value: string): Date {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date range');
    }

    return parsed;
  }

  private addDays(date: Date, days: number): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + days,
      ),
    );
  }

  private startOfUtcDay(value: Date): Date {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  private formatDateKey(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private toNumber(value: DecimalLike): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return Number(value);
    }

    return value.toNumber();
  }

  private toCents(value: number): number {
    return Math.round(value * 100);
  }

  private fromCents(value: number): number {
    return Number((value / 100).toFixed(2));
  }
}
