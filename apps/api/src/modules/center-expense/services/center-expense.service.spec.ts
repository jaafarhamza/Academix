import { NotFoundException } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CenterExpenseService } from './center-expense.service';

describe('CenterExpenseService', () => {
  const centerExpenseCreate = jest.fn();
  const centerExpenseFindMany = jest.fn();
  const centerExpenseFindFirst = jest.fn();
  const centerExpenseUpdate = jest.fn();
  const centerExpenseDelete = jest.fn();
  const userFindFirst = jest.fn();

  const prismaService = {
    centerExpense: {
      create: centerExpenseCreate,
      findMany: centerExpenseFindMany,
      findFirst: centerExpenseFindFirst,
      update: centerExpenseUpdate,
      delete: centerExpenseDelete,
    },
    user: {
      findFirst: userFindFirst,
    },
  };

  let service: CenterExpenseService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CenterExpenseService(
      prismaService as unknown as PrismaService,
    );
  });

  it('creates a center expense inside the current center scope', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'user-1',
      firstName: 'Sarah',
      lastName: 'Malik',
      role: UserRole.SECRETARY,
    });
    centerExpenseCreate.mockResolvedValueOnce({
      id: 'expense-1',
      centerId: 'center-1',
      userId: 'user-1',
      amount: { toNumber: () => 420.5 },
      description: 'Printer repair',
      date: new Date('2026-04-13T00:00:00.000Z'),
      createdAt: new Date('2026-04-13T08:00:00.000Z'),
      user: {
        firstName: 'Sarah',
        lastName: 'Malik',
        role: UserRole.SECRETARY,
      },
    });

    await expect(
      service.create('center-1', {
        user_id: 'user-1',
        amount: 420.5,
        description: 'Printer repair',
        date: '2026-04-13',
      }),
    ).resolves.toEqual({
      id: 'expense-1',
      center_id: 'center-1',
      user_id: 'user-1',
      userName: 'Sarah Malik',
      userRole: UserRole.SECRETARY,
      amount: 420.5,
      description: 'Printer repair',
      date: '2026-04-13',
      created_at: '2026-04-13T08:00:00.000Z',
    });

    expect(userFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
        centerId: 'center-1',
        role: {
          in: [UserRole.TEACHER, UserRole.SECRETARY],
        },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
    expect(centerExpenseCreate).toHaveBeenCalledTimes(1);
    const [createCall] = centerExpenseCreate.mock.calls as [
      [
        {
          data: {
            centerId: string;
            userId: string;
            amount: number;
            description: string;
            date: Date;
          };
          select: unknown;
        },
      ],
    ];
    const [createArgs] = createCall;

    expect(createArgs.data).toEqual({
      centerId: 'center-1',
      userId: 'user-1',
      amount: 420.5,
      description: 'Printer repair',
      date: new Date('2026-04-13T00:00:00.000Z'),
    });
    expect(createArgs.select).toBeDefined();
  });

  it('allows TEACHER users as valid expense references', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      firstName: 'Hamza',
      lastName: 'Benkirane',
      role: UserRole.TEACHER,
    });
    centerExpenseCreate.mockResolvedValueOnce({
      id: 'expense-2',
      centerId: 'center-1',
      userId: 'teacher-1',
      amount: 180,
      description: 'Classroom equipment',
      date: new Date('2026-04-14T00:00:00.000Z'),
      createdAt: new Date('2026-04-14T09:15:00.000Z'),
      user: {
        firstName: 'Hamza',
        lastName: 'Benkirane',
        role: UserRole.TEACHER,
      },
    });

    await expect(
      service.create('center-1', {
        user_id: 'teacher-1',
        amount: 180,
        description: 'Classroom equipment',
        date: '2026-04-14',
      }),
    ).resolves.toEqual({
      id: 'expense-2',
      center_id: 'center-1',
      user_id: 'teacher-1',
      userName: 'Hamza Benkirane',
      userRole: UserRole.TEACHER,
      amount: 180,
      description: 'Classroom equipment',
      date: '2026-04-14',
      created_at: '2026-04-14T09:15:00.000Z',
    });
  });

  it('throws when the expense user does not exist in the current center scope', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.create('center-1', {
        user_id: 'missing-user',
        amount: 100,
        description: 'Stationery',
        date: '2026-04-14',
      }),
    ).rejects.toThrow(new NotFoundException('Expense user not found'));

    expect(centerExpenseCreate).not.toHaveBeenCalled();
  });

  it('rejects users outside the TEACHER and SECRETARY roles', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.create('center-1', {
        user_id: 'student-1',
        amount: 90,
        description: 'Should be rejected',
        date: '2026-04-16',
      }),
    ).rejects.toThrow(new NotFoundException('Expense user not found'));

    expect(userFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'student-1',
        centerId: 'center-1',
        role: {
          in: [UserRole.TEACHER, UserRole.SECRETARY],
        },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
    expect(centerExpenseCreate).not.toHaveBeenCalled();
  });

  it('lists center expenses with default pagination and ordering', async () => {
    centerExpenseFindMany.mockResolvedValueOnce([
      {
        id: 'expense-1',
        centerId: 'center-1',
        userId: 'user-1',
        amount: 95,
        description: 'Internet bill',
        date: new Date('2026-04-15T00:00:00.000Z'),
        createdAt: new Date('2026-04-15T09:30:00.000Z'),
        user: {
          firstName: 'Youssef',
          lastName: 'Alaoui',
          role: UserRole.TEACHER,
        },
      },
    ]);

    await expect(service.findAll('center-1', {})).resolves.toEqual([
      {
        id: 'expense-1',
        center_id: 'center-1',
        user_id: 'user-1',
        userName: 'Youssef Alaoui',
        userRole: UserRole.TEACHER,
        amount: 95,
        description: 'Internet bill',
        date: '2026-04-15',
        created_at: '2026-04-15T09:30:00.000Z',
      },
    ]);

    expect(centerExpenseFindMany).toHaveBeenCalledTimes(1);
    const [findManyCall] = centerExpenseFindMany.mock.calls as [
      [
        {
          where: {
            centerId: string;
          };
          orderBy: Array<Record<string, string>>;
          skip: number;
          take: number;
          select: unknown;
        },
      ],
    ];
    const [findManyArgs] = findManyCall;

    expect(findManyArgs.where).toEqual({
      centerId: 'center-1',
    });
    expect(findManyArgs.orderBy).toEqual([
      { date: 'desc' },
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(findManyArgs.skip).toBe(0);
    expect(findManyArgs.take).toBe(20);
    expect(findManyArgs.select).toBeDefined();
  });

  it('filters center expenses by user_id and month', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'user-1',
      firstName: 'Sarah',
      lastName: 'Malik',
      role: UserRole.SECRETARY,
    });
    centerExpenseFindMany.mockResolvedValueOnce([
      {
        id: 'expense-3',
        centerId: 'center-1',
        userId: 'user-1',
        amount: 150,
        description: 'Filtered expense',
        date: new Date('2026-04-18T00:00:00.000Z'),
        createdAt: new Date('2026-04-18T10:00:00.000Z'),
        user: {
          firstName: 'Sarah',
          lastName: 'Malik',
          role: UserRole.SECRETARY,
        },
      },
    ]);

    await expect(
      service.findAll('center-1', {
        user_id: 'user-1',
        month: '2026-04',
      }),
    ).resolves.toEqual([
      {
        id: 'expense-3',
        center_id: 'center-1',
        user_id: 'user-1',
        userName: 'Sarah Malik',
        userRole: UserRole.SECRETARY,
        amount: 150,
        description: 'Filtered expense',
        date: '2026-04-18',
        created_at: '2026-04-18T10:00:00.000Z',
      },
    ]);

    expect(centerExpenseFindMany).toHaveBeenCalledTimes(1);
    const [filteredFindManyCall] = centerExpenseFindMany.mock.calls as [
      [
        {
          where: {
            centerId: string;
            userId?: string;
            date?: {
              gte: Date;
              lt: Date;
            };
          };
          orderBy: Array<Record<string, string>>;
          skip: number;
          take: number;
          select: unknown;
        },
      ],
    ];
    const [filteredFindManyArgs] = filteredFindManyCall;

    expect(filteredFindManyArgs.where).toEqual({
      centerId: 'center-1',
      userId: 'user-1',
      date: {
        gte: new Date('2026-04-01T00:00:00.000Z'),
        lt: new Date('2026-05-01T00:00:00.000Z'),
      },
    });
  });

  it('updates expense fields inside the current center scope', async () => {
    centerExpenseFindFirst.mockResolvedValueOnce({
      id: 'expense-1',
      centerId: 'center-1',
      userId: 'user-1',
      amount: 120,
      description: 'Old description',
      date: new Date('2026-04-10T00:00:00.000Z'),
      createdAt: new Date('2026-04-10T08:00:00.000Z'),
      user: {
        firstName: 'Sarah',
        lastName: 'Malik',
        role: UserRole.SECRETARY,
      },
    });
    userFindFirst.mockResolvedValueOnce({
      id: 'user-2',
      firstName: 'Hamza',
      lastName: 'Benkirane',
      role: UserRole.TEACHER,
    });
    centerExpenseUpdate.mockResolvedValueOnce({
      id: 'expense-1',
      centerId: 'center-1',
      userId: 'user-2',
      amount: 300,
      description: 'Updated description',
      date: new Date('2026-04-20T00:00:00.000Z'),
      createdAt: new Date('2026-04-10T08:00:00.000Z'),
      user: {
        firstName: 'Hamza',
        lastName: 'Benkirane',
        role: UserRole.TEACHER,
      },
    });

    await expect(
      service.update('center-1', 'expense-1', {
        user_id: 'user-2',
        amount: 300,
        description: 'Updated description',
        date: '2026-04-20',
      }),
    ).resolves.toEqual({
      id: 'expense-1',
      center_id: 'center-1',
      user_id: 'user-2',
      userName: 'Hamza Benkirane',
      userRole: UserRole.TEACHER,
      amount: 300,
      description: 'Updated description',
      date: '2026-04-20',
      created_at: '2026-04-10T08:00:00.000Z',
    });

    expect(centerExpenseUpdate).toHaveBeenCalledTimes(1);
    const [updateCall] = centerExpenseUpdate.mock.calls as [
      [
        {
          where: {
            id: string;
          };
          data: {
            userId: string;
            amount: number;
            description: string;
            date: Date;
          };
          select: unknown;
        },
      ],
    ];
    const [updateArgs] = updateCall;

    expect(updateArgs.where).toEqual({
      id: 'expense-1',
    });
    expect(updateArgs.data).toEqual({
      userId: 'user-2',
      amount: 300,
      description: 'Updated description',
      date: new Date('2026-04-20T00:00:00.000Z'),
    });
    expect(updateArgs.select).toBeDefined();
  });

  it('returns the existing expense when update payload is empty', async () => {
    centerExpenseFindFirst.mockResolvedValueOnce({
      id: 'expense-1',
      centerId: 'center-1',
      userId: 'user-1',
      amount: 120,
      description: 'Existing expense',
      date: new Date('2026-04-10T00:00:00.000Z'),
      createdAt: new Date('2026-04-10T08:00:00.000Z'),
      user: {
        firstName: 'Sarah',
        lastName: 'Malik',
        role: UserRole.SECRETARY,
      },
    });

    await expect(service.update('center-1', 'expense-1', {})).resolves.toEqual({
      id: 'expense-1',
      center_id: 'center-1',
      user_id: 'user-1',
      userName: 'Sarah Malik',
      userRole: UserRole.SECRETARY,
      amount: 120,
      description: 'Existing expense',
      date: '2026-04-10',
      created_at: '2026-04-10T08:00:00.000Z',
    });

    expect(centerExpenseUpdate).not.toHaveBeenCalled();
  });

  it('deletes a center expense inside the current center scope', async () => {
    centerExpenseFindFirst.mockResolvedValueOnce({
      id: 'expense-1',
    });
    centerExpenseDelete.mockResolvedValueOnce(undefined);

    await expect(
      service.remove('center-1', 'expense-1'),
    ).resolves.toBeUndefined();

    expect(centerExpenseDelete).toHaveBeenCalledWith({
      where: {
        id: 'expense-1',
      },
    });
  });

  it('throws when deleting a missing center expense', async () => {
    centerExpenseFindFirst.mockResolvedValueOnce(null);

    await expect(service.remove('center-1', 'missing-expense')).rejects.toThrow(
      new NotFoundException('Center expense not found'),
    );

    expect(centerExpenseDelete).not.toHaveBeenCalled();
  });

  it('returns center-expense module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'center-expense',
      status: 'ready',
    });
  });
});
