import { BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { FinancialDashboardPeriod } from '../dto/query-financial-dashboard.dto';

describe('DashboardService', () => {
  const findMany = jest.fn();
  const prismaService = {
    payment: {
      findMany,
    },
  };

  let service: DashboardService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-12T10:00:00.000Z'));
    jest.clearAllMocks();
    service = new DashboardService(prismaService as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns collected vs expected totals and a daily series for this month', async () => {
    findMany.mockResolvedValueOnce([
      {
        amount: 400,
        rest: 0,
        paymentDate: new Date('2026-04-02T12:00:00.000Z'),
      },
      {
        amount: 500,
        rest: 200,
        paymentDate: new Date('2026-04-02T15:00:00.000Z'),
      },
      {
        amount: 300,
        rest: 300,
        paymentDate: new Date('2026-04-07T10:00:00.000Z'),
      },
    ]);

    const result = await service.getFinancial('center-1', {
      period: FinancialDashboardPeriod.THIS_MONTH,
    });

    expect(result.period).toBe(FinancialDashboardPeriod.THIS_MONTH);
    expect(result.range).toEqual({
      from: '2026-04-01',
      to: '2026-04-30',
    });
    expect(result.totals).toEqual({
      collected: 700,
      expected: 1200,
      outstanding: 500,
      paymentsCount: 3,
      collectionRate: 58.33,
    });
    expect(result.series).toHaveLength(30);
    expect(result.series[1]).toEqual({
      date: '2026-04-02',
      collected: 700,
      expected: 900,
      outstanding: 200,
      paymentsCount: 2,
    });
    expect(result.series[6]).toEqual({
      date: '2026-04-07',
      collected: 0,
      expected: 300,
      outstanding: 300,
      paymentsCount: 1,
    });
  });

  it('supports custom ranges with an inclusive end date', async () => {
    findMany.mockResolvedValueOnce([
      {
        amount: 250,
        rest: 50,
        paymentDate: new Date('2026-03-05T08:00:00.000Z'),
      },
    ]);

    const result = await service.getFinancial('center-1', {
      period: FinancialDashboardPeriod.CUSTOM,
      from: '2026-03-01',
      to: '2026-03-07',
    });

    expect(result.series).toHaveLength(7);
    expect(result.totals.collected).toBe(200);
    expect(result.totals.expected).toBe(250);
    expect(result.totals.outstanding).toBe(50);
  });

  it('rejects custom ranges when from or to is missing', async () => {
    await expect(
      service.getFinancial('center-1', {
        period: FinancialDashboardPeriod.CUSTOM,
        from: '2026-03-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects custom ranges when from is later than to', async () => {
    await expect(
      service.getFinancial('center-1', {
        period: FinancialDashboardPeriod.CUSTOM,
        from: '2026-03-10',
        to: '2026-03-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
