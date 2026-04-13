import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import * as passwordHashUtil from '../../../common/utils/password-hash.util';
import {
  DayOfWeek,
  DeductionType,
  SessionStatus,
  UserRole,
} from '../../../generated/prisma/enums';
import { TeacherHoursPeriod } from '../dto/teacher-hours-query.dto';
import { TeacherService } from './teacher.service';

describe('TeacherService', () => {
  type UserCreateArgs = {
    data: {
      centerId: string;
      firstName: string;
      lastName: string;
      email: string;
      passwordHash: string;
      phone: string;
      role: UserRole;
      cin: string;
      hourlyRate: number | null;
      maxHoursPerWeek: number | null;
    };
    select: Record<string, boolean>;
  };

  type CreatedTeacher = {
    id: string;
    centerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    cin: string | null;
    isActive: boolean;
    createdAt: Date;
  };

  const userCreate = jest.fn<Promise<CreatedTeacher>, [UserCreateArgs]>();
  type UserFindManyArgs = {
    where: Record<string, unknown>;
    orderBy: Array<Record<string, 'asc' | 'desc'>>;
    skip: number;
    take: number;
    select: Record<string, boolean>;
  };
  const userFindMany = jest.fn<Promise<CreatedTeacher[]>, [UserFindManyArgs]>();
  type UserFindFirstArgs = {
    where: Record<string, unknown>;
    select: Record<string, unknown>;
  };
  type TeacherDetail = {
    id: string;
    centerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    cin: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    hourlyRate: { toNumber(): number } | number | null;
    maxHoursPerWeek: { toNumber(): number } | number | null;
    teacherSubjects: Array<{
      subject: {
        id: string;
        name: string;
      };
    }>;
    teachingSessions: Array<{
      day: DayOfWeek;
      startTime: Date;
      endTime: Date;
      status: SessionStatus;
    }>;
  };
  const userFindFirst = jest.fn<
    Promise<TeacherDetail | null>,
    [UserFindFirstArgs]
  >();
  type PaymentFindManyArgs = {
    where: Record<string, unknown>;
    select: Record<string, boolean>;
  };
  type TeacherPaymentRecord = {
    studentId: string;
    amount: number | { toNumber(): number };
    rest: number | { toNumber(): number };
  };
  const paymentFindMany = jest.fn<
    Promise<TeacherPaymentRecord[]>,
    [PaymentFindManyArgs]
  >();
  type CenterExpenseFindManyArgs = {
    where: Record<string, unknown>;
    select: Record<string, boolean>;
  };
  type TeacherExpenseRecord = {
    amount: number | { toNumber(): number };
  };
  const centerExpenseFindMany = jest.fn<
    Promise<TeacherExpenseRecord[]>,
    [CenterExpenseFindManyArgs]
  >();
  type UserUpdateArgs = {
    where: {
      id: string;
    };
    data: Record<string, unknown>;
    select?: Record<string, unknown>;
  };
  const userUpdate = jest.fn<Promise<TeacherDetail>, [UserUpdateArgs]>();
  const prismaService = {
    user: {
      create: userCreate,
      findMany: userFindMany,
      findFirst: userFindFirst,
      update: userUpdate,
    },
    payment: {
      findMany: paymentFindMany,
    },
    centerExpense: {
      findMany: centerExpenseFindMany,
    },
  };
  const resolveApplicableCost = jest.fn();
  const centerCostService = {
    resolveApplicableCost,
  };

  let service: TeacherService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TeacherService(
      prismaService as unknown as PrismaService,
      centerCostService as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates teacher with center_id from JWT context and hashes password', async () => {
    userCreate.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'teacher@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-26T12:00:00.000Z'),
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        firstName: 'Fatima',
        lastName: 'Zahraoui',
        email: 'teacher@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000030',
        cin: 'BE-12345',
        hourlyRate: 150,
        maxHoursPerWeek: 24,
      },
    );

    expect(result).toMatchObject({
      id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
    });
    const createArgs = userCreate.mock.calls[0]?.[0];
    expect(createArgs).toBeDefined();
    if (!createArgs) {
      throw new Error('Expected user.create to be called');
    }

    expect(createArgs.data.centerId).toBe(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
    );
    expect(createArgs.data.passwordHash).toBe('scrypt$hash');
    expect(createArgs.data.role).toBe(UserRole.TEACHER);
    expect(createArgs.data.cin).toBe('BE-12345');
  });

  it('throws ConflictException when teacher email already exists for center', async () => {
    userCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['centerId', 'email'] },
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        firstName: 'Fatima',
        lastName: 'Zahraoui',
        email: 'teacher@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000030',
        cin: 'BE-12345',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when teacher CIN already exists for center', async () => {
    userCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['centerId', 'cin'] },
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        firstName: 'Fatima',
        lastName: 'Zahraoui',
        email: 'teacher@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000030',
        cin: 'BE-12345',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists teachers for current center with default pagination', async () => {
    userFindMany.mockResolvedValueOnce([
      {
        id: 'teacher-1',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        firstName: 'Fatima',
        lastName: 'Zahraoui',
        email: 'fatima@academix-demo.com',
        phone: '+212600000030',
        role: UserRole.TEACHER,
        cin: 'BE-12345',
        isActive: true,
        createdAt: new Date('2026-03-26T12:00:00.000Z'),
      },
    ]);

    const result = await service.findAll(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.center_id).toBe('2cc4267d-f618-478f-aa2f-9699ecbe332f');

    const args = userFindMany.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    if (!args) {
      throw new Error('Expected user.findMany to be called');
    }

    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
    expect(args.where).toEqual(
      expect.objectContaining({
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        role: UserRole.TEACHER,
      }),
    );
  });

  it('applies filters and pagination when listing teachers', async () => {
    userFindMany.mockResolvedValueOnce([]);

    await service.findAll('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
      search: 'fatima',
      isActive: true,
      page: 2,
      limit: 5,
    });

    const args = userFindMany.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    if (!args) {
      throw new Error('Expected user.findMany to be called');
    }

    expect(args.skip).toBe(5);
    expect(args.take).toBe(5);
    expect(args.where).toEqual(
      expect.objectContaining({
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        role: UserRole.TEACHER,
        isActive: true,
      }),
    );
    const whereWithOr = args.where as {
      OR?: Array<{
        firstName?: {
          contains: string;
          mode: string;
        };
      }>;
    };

    const firstOrClause = whereWithOr.OR?.[0];
    expect(firstOrClause).toBeDefined();
    if (!firstOrClause?.firstName) {
      throw new Error('Expected firstName search clause');
    }

    expect(firstOrClause.firstName.contains).toBe('fatima');
    expect(firstOrClause.firstName.mode).toBe('insensitive');
  });

  it('returns teacher details with computed weekly and monthly hours', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: {
        toNumber: () => 150.5,
      },
      maxHoursPerWeek: {
        toNumber: () => 24,
      },
      teacherSubjects: [
        {
          subject: {
            id: 'subject-2',
            name: 'Physics',
          },
        },
        {
          subject: {
            id: 'subject-1',
            name: 'Mathematics',
          },
        },
      ],
      teachingSessions: [
        {
          day: DayOfWeek.MONDAY,
          startTime: new Date('1970-01-01T08:00:00.000Z'),
          endTime: new Date('1970-01-01T10:00:00.000Z'),
          status: SessionStatus.SCHEDULED,
        },
        {
          day: DayOfWeek.WEDNESDAY,
          startTime: new Date('1970-01-01T14:00:00.000Z'),
          endTime: new Date('1970-01-01T15:30:00.000Z'),
          status: SessionStatus.COMPLETED,
        },
      ],
    });

    const result = await service.findOne(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
    );

    expect(result).toMatchObject({
      id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      hourlyRate: 150.5,
      maxHoursPerWeek: 24,
      hoursThisWeek: 3.5,
      hoursThisMonth: 16,
    });
    expect(result.subjects).toEqual([
      {
        id: 'subject-1',
        name: 'Mathematics',
      },
      {
        id: 'subject-2',
        name: 'Physics',
      },
    ]);

    const args = userFindFirst.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    if (!args) {
      throw new Error('Expected user.findFirst to be called');
    }

    expect(args.where).toEqual({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      role: UserRole.TEACHER,
    });
  });

  it('rounds hoursThisWeek to two decimals', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: {
        toNumber: () => 150.5,
      },
      maxHoursPerWeek: {
        toNumber: () => 24,
      },
      teacherSubjects: [],
      teachingSessions: [
        {
          day: DayOfWeek.MONDAY,
          startTime: new Date('1970-01-01T08:00:00.000Z'),
          endTime: new Date('1970-01-01T09:20:00.000Z'),
          status: SessionStatus.SCHEDULED,
        },
        {
          day: DayOfWeek.WEDNESDAY,
          startTime: new Date('1970-01-01T14:00:00.000Z'),
          endTime: new Date('1970-01-01T15:20:00.000Z'),
          status: SessionStatus.SCHEDULED,
        },
      ],
    });

    const result = await service.findOne(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
    );

    expect(result.hoursThisWeek).toBe(2.67);
  });

  it('calculates hoursThisMonth using weekday occurrences in current month', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: {
        toNumber: () => 150.5,
      },
      maxHoursPerWeek: {
        toNumber: () => 24,
      },
      teacherSubjects: [],
      teachingSessions: [
        {
          // April 2026 has 4 Mondays -> 2h * 4 = 8h
          day: DayOfWeek.MONDAY,
          startTime: new Date('1970-01-01T08:00:00.000Z'),
          endTime: new Date('1970-01-01T10:00:00.000Z'),
          status: SessionStatus.SCHEDULED,
        },
        {
          // April 2026 has 5 Wednesdays -> 1.5h * 5 = 7.5h
          day: DayOfWeek.WEDNESDAY,
          startTime: new Date('1970-01-01T14:00:00.000Z'),
          endTime: new Date('1970-01-01T15:30:00.000Z'),
          status: SessionStatus.COMPLETED,
        },
      ],
    });

    const result = await service.findOne(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
    );

    expect(result.hoursThisMonth).toBe(15.5);
  });

  it('rounds hoursThisMonth to two decimals', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-15T12:00:00.000Z'));
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: {
        toNumber: () => 150.5,
      },
      maxHoursPerWeek: {
        toNumber: () => 24,
      },
      teacherSubjects: [],
      teachingSessions: [
        {
          // February 2026 has 4 Sundays -> 1h20m * 4 = 5.333... => 5.33
          day: DayOfWeek.SUNDAY,
          startTime: new Date('1970-01-01T08:00:00.000Z'),
          endTime: new Date('1970-01-01T09:20:00.000Z'),
          status: SessionStatus.SCHEDULED,
        },
      ],
    });

    const result = await service.findOne(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
    );

    expect(result.hoursThisMonth).toBe(5.33);
  });

  it('requests teachingSessions excluding cancelled status for weekly hours', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: {
        toNumber: () => 150.5,
      },
      maxHoursPerWeek: {
        toNumber: () => 24,
      },
      teacherSubjects: [],
      teachingSessions: [],
    });

    await service.findOne('2cc4267d-f618-478f-aa2f-9699ecbe332f', 'teacher-1');

    const args = userFindFirst.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    if (!args) {
      throw new Error('Expected user.findFirst to be called');
    }

    const select = args.select as {
      teachingSessions?: {
        where?: {
          status?: {
            not?: SessionStatus;
          };
        };
      };
    };
    expect(select.teachingSessions?.where?.status?.not).toBe(
      SessionStatus.CANCELLED,
    );
  });

  it('throws NotFoundException when teacher details do not exist in current center', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.findOne('2cc4267d-f618-478f-aa2f-9699ecbe332f', 'teacher-404'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns weekly teacher hours via getHours(period=week)', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: null,
      maxHoursPerWeek: null,
      teacherSubjects: [],
      teachingSessions: [
        {
          day: DayOfWeek.MONDAY,
          startTime: new Date('1970-01-01T08:00:00.000Z'),
          endTime: new Date('1970-01-01T10:00:00.000Z'),
          status: SessionStatus.SCHEDULED,
        },
      ],
    });

    const result = await service.getHours(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      TeacherHoursPeriod.WEEK,
    );

    expect(result).toEqual({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      period: TeacherHoursPeriod.WEEK,
      hours: 2,
    });
  });

  it('returns monthly teacher hours via getHours(period=month)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: null,
      maxHoursPerWeek: null,
      teacherSubjects: [],
      teachingSessions: [
        {
          day: DayOfWeek.MONDAY,
          startTime: new Date('1970-01-01T08:00:00.000Z'),
          endTime: new Date('1970-01-01T10:00:00.000Z'),
          status: SessionStatus.SCHEDULED,
        },
      ],
    });

    const result = await service.getHours(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      TeacherHoursPeriod.MONTH,
    );

    // April 2026 has 4 Mondays
    expect(result).toEqual({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      period: TeacherHoursPeriod.MONTH,
      hours: 8,
    });
  });

  it('throws NotFoundException when teacher hours target does not exist', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.getHours(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        'teacher-404',
        TeacherHoursPeriod.WEEK,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns zero weekly hours when teacher has no active sessions', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teachingSessions: [],
    });

    const result = await service.getHours(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      TeacherHoursPeriod.WEEK,
    );

    expect(result).toEqual({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      period: TeacherHoursPeriod.WEEK,
      hours: 0,
    });
  });

  it('returns zero monthly hours when teacher has no active sessions', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teachingSessions: [],
    });

    const result = await service.getHours(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      TeacherHoursPeriod.MONTH,
    );

    expect(result).toEqual({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      period: TeacherHoursPeriod.MONTH,
      hours: 0,
    });
  });

  it('requests getHours teachingSessions excluding cancelled status', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teachingSessions: [],
    });

    await service.getHours(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      TeacherHoursPeriod.WEEK,
    );

    const args = userFindFirst.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    if (!args) {
      throw new Error('Expected user.findFirst to be called');
    }

    const select = args.select as {
      teachingSessions?: {
        where?: {
          status?: {
            not?: SessionStatus;
          };
        };
      };
    };
    expect(select.teachingSessions?.where?.status?.not).toBe(
      SessionStatus.CANCELLED,
    );
  });

  it('throws BadRequestException when period is unsupported', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teachingSessions: [],
    });

    await expect(
      service.getHours(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        'teacher-1',
        'quarter' as TeacherHoursPeriod,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('computes monthly income from payments, deductions, and expenses', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      isActive: true,
    });
    paymentFindMany.mockResolvedValueOnce([
      {
        studentId: 'student-1',
        amount: { toNumber: () => 300 },
        rest: { toNumber: () => 50 },
      },
      {
        studentId: 'student-2',
        amount: { toNumber: () => 200 },
        rest: { toNumber: () => 0 },
      },
      {
        studentId: 'student-2',
        amount: { toNumber: () => 100 },
        rest: { toNumber: () => 0 },
      },
    ]);
    centerExpenseFindMany.mockResolvedValueOnce([
      {
        amount: { toNumber: () => 75 },
      },
      {
        amount: 25,
      },
    ]);
    resolveApplicableCost
      .mockResolvedValueOnce({
        value: 10,
      })
      .mockResolvedValueOnce({
        value: 5,
      })
      .mockResolvedValueOnce({
        value: 20,
      });

    const result = await service.monthlyIncome(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      '2026-04',
    );

    expect(result).toEqual({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      month: '2026-04',
      collected_payments: 550,
      paid_students: 2,
      deduction_breakdown: {
        percentage_of_total: 55,
        percentage_per_student: 27.5,
        fixed_per_student: 40,
        total: 122.5,
      },
      expenses: 100,
      net_income: 527.5,
    });

    expect(resolveApplicableCost).toHaveBeenNthCalledWith(
      1,
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      DeductionType.PERCENTAGE_OF_TOTAL,
      'teacher-1',
    );
    expect(resolveApplicableCost).toHaveBeenNthCalledWith(
      2,
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      DeductionType.PERCENTAGE_PER_STUDENT,
      'teacher-1',
    );
    expect(resolveApplicableCost).toHaveBeenNthCalledWith(
      3,
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      DeductionType.FIXED_PER_STUDENT,
      'teacher-1',
    );

    const paymentArgs = paymentFindMany.mock.calls[0]?.[0];
    expect(paymentArgs?.where).toEqual({
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      teacherId: 'teacher-1',
      paymentDate: {
        gte: new Date('2026-04-01T00:00:00.000Z'),
        lt: new Date('2026-05-01T00:00:00.000Z'),
      },
    });
    const expenseArgs = centerExpenseFindMany.mock.calls[0]?.[0];
    expect(expenseArgs?.where).toEqual({
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      userId: 'teacher-1',
      date: {
        gte: new Date('2026-04-01T00:00:00.000Z'),
        lt: new Date('2026-05-01T00:00:00.000Z'),
      },
    });
  });

  it('falls back to zero deductions and expenses when no matching data exists', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      isActive: true,
    });
    paymentFindMany.mockResolvedValueOnce([
      {
        studentId: 'student-1',
        amount: 250,
        rest: 0,
      },
    ]);
    centerExpenseFindMany.mockResolvedValueOnce([]);
    resolveApplicableCost
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await service.monthlyIncome(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      '2026-05',
    );

    expect(result).toEqual({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      month: '2026-05',
      collected_payments: 250,
      paid_students: 1,
      deduction_breakdown: {
        percentage_of_total: 0,
        percentage_per_student: 0,
        fixed_per_student: 0,
        total: 0,
      },
      expenses: 0,
      net_income: 250,
    });
  });

  it('applies only percentage-of-total deduction when that is the only active cost rule', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      isActive: true,
    });
    paymentFindMany.mockResolvedValueOnce([
      {
        studentId: 'student-1',
        amount: 400,
        rest: 50,
      },
      {
        studentId: 'student-2',
        amount: 200,
        rest: 0,
      },
    ]);
    centerExpenseFindMany.mockResolvedValueOnce([]);
    resolveApplicableCost
      .mockResolvedValueOnce({
        value: 12.5,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await service.monthlyIncome(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      '2026-06',
    );

    expect(result).toEqual({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      month: '2026-06',
      collected_payments: 550,
      paid_students: 2,
      deduction_breakdown: {
        percentage_of_total: 68.75,
        percentage_per_student: 0,
        fixed_per_student: 0,
        total: 68.75,
      },
      expenses: 0,
      net_income: 481.25,
    });
  });

  it('applies fixed-per-student deduction using distinct paid students only', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      isActive: true,
    });
    paymentFindMany.mockResolvedValueOnce([
      {
        studentId: 'student-1',
        amount: 150,
        rest: 0,
      },
      {
        studentId: 'student-1',
        amount: 120,
        rest: 20,
      },
      {
        studentId: 'student-2',
        amount: 200,
        rest: 50,
      },
    ]);
    centerExpenseFindMany.mockResolvedValueOnce([]);
    resolveApplicableCost
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        value: 30,
      });

    const result = await service.monthlyIncome(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      '2026-07',
    );

    expect(result).toEqual({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      month: '2026-07',
      collected_payments: 400,
      paid_students: 2,
      deduction_breakdown: {
        percentage_of_total: 0,
        percentage_per_student: 0,
        fixed_per_student: 60,
        total: 60,
      },
      expenses: 0,
      net_income: 340,
    });
  });

  it('combines global fallback deductions with teacher expenses and rounds net income', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      isActive: true,
    });
    paymentFindMany.mockResolvedValueOnce([
      {
        studentId: 'student-1',
        amount: { toNumber: () => 333.33 },
        rest: { toNumber: () => 0 },
      },
      {
        studentId: 'student-2',
        amount: { toNumber: () => 166.67 },
        rest: { toNumber: () => 16.67 },
      },
    ]);
    centerExpenseFindMany.mockResolvedValueOnce([
      {
        amount: { toNumber: () => 12.345 },
      },
    ]);
    resolveApplicableCost
      .mockResolvedValueOnce({
        value: 7.5,
        teacher_id: null,
      })
      .mockResolvedValueOnce({
        value: 2.5,
        teacher_id: null,
      })
      .mockResolvedValueOnce({
        value: 10,
        teacher_id: null,
      });

    const result = await service.monthlyIncome(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      '2026-08',
    );

    expect(result).toEqual({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      month: '2026-08',
      collected_payments: 483.33,
      paid_students: 2,
      deduction_breakdown: {
        percentage_of_total: 36.25,
        percentage_per_student: 12.08,
        fixed_per_student: 20,
        total: 68.33,
      },
      expenses: 12.35,
      net_income: 427.35,
    });
  });

  it('returns zero deductions when there are no payments even if cost rules exist', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      isActive: true,
    });
    paymentFindMany.mockResolvedValueOnce([]);
    centerExpenseFindMany.mockResolvedValueOnce([
      {
        amount: 40,
      },
    ]);
    resolveApplicableCost
      .mockResolvedValueOnce({
        value: 20,
      })
      .mockResolvedValueOnce({
        value: 10,
      })
      .mockResolvedValueOnce({
        value: 25,
      });

    const result = await service.monthlyIncome(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      '2026-09',
    );

    expect(result).toEqual({
      teacher_id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      month: '2026-09',
      collected_payments: 0,
      paid_students: 0,
      deduction_breakdown: {
        percentage_of_total: 0,
        percentage_per_student: 0,
        fixed_per_student: 0,
        total: 0,
      },
      expenses: 40,
      net_income: 40,
    });
  });

  it('throws NotFoundException when computing monthly income for a missing teacher', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.monthlyIncome(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        'teacher-404',
        '2026-04',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(paymentFindMany).not.toHaveBeenCalled();
    expect(centerExpenseFindMany).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when monthly income month format is invalid', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      isActive: true,
    });

    await expect(
      service.monthlyIncome(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        'teacher-1',
        '2026/04',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(paymentFindMany).not.toHaveBeenCalled();
    expect(centerExpenseFindMany).not.toHaveBeenCalled();
  });

  it('updates teacher info for current center and returns detail response', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: { toNumber: () => 150 },
      maxHoursPerWeek: { toNumber: () => 24 },
      teacherSubjects: [],
      teachingSessions: [],
    });
    userUpdate.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Updated Fatima',
      lastName: 'Zahraoui',
      email: 'updated@academix-demo.com',
      phone: '+212600000031',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-26T09:00:00.000Z'),
      hourlyRate: null,
      maxHoursPerWeek: { toNumber: () => 30 },
      teacherSubjects: [],
      teachingSessions: [],
    });

    const result = await service.update(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      {
        firstName: 'Updated Fatima',
        email: 'updated@academix-demo.com',
        phone: '+212600000031',
        hourlyRate: null,
        maxHoursPerWeek: 30,
      },
    );

    expect(result).toMatchObject({
      id: 'teacher-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Updated Fatima',
      email: 'updated@academix-demo.com',
      phone: '+212600000031',
      hourlyRate: null,
      maxHoursPerWeek: 30,
    });
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'teacher-1' },
        data: {
          firstName: 'Updated Fatima',
          email: 'updated@academix-demo.com',
          phone: '+212600000031',
          hourlyRate: null,
          maxHoursPerWeek: 30,
        },
      }),
    );
  });

  it('returns current teacher details when patch payload is empty', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: { toNumber: () => 150 },
      maxHoursPerWeek: { toNumber: () => 24 },
      teacherSubjects: [],
      teachingSessions: [],
    });

    const result = await service.update(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
      {},
    );

    expect(result.firstName).toBe('Fatima');
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when updating missing teacher', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.update('2cc4267d-f618-478f-aa2f-9699ecbe332f', 'teacher-404', {
        firstName: 'Updated Fatima',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when updated email already exists in center', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: null,
      maxHoursPerWeek: null,
      teacherSubjects: [],
      teachingSessions: [],
    });
    userUpdate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['centerId', 'email'] },
    });

    await expect(
      service.update('2cc4267d-f618-478f-aa2f-9699ecbe332f', 'teacher-1', {
        email: 'duplicate@academix-demo.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when updated CIN already exists in center', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: null,
      maxHoursPerWeek: null,
      teacherSubjects: [],
      teachingSessions: [],
    });
    userUpdate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['centerId', 'cin'] },
    });

    await expect(
      service.update('2cc4267d-f618-478f-aa2f-9699ecbe332f', 'teacher-1', {
        cin: 'BE-99999',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('soft deactivates an active teacher in current center', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: true,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: null,
      maxHoursPerWeek: null,
      teacherSubjects: [],
      teachingSessions: [],
    });
    userUpdate.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: false,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-26T09:00:00.000Z'),
      hourlyRate: null,
      maxHoursPerWeek: null,
      teacherSubjects: [],
      teachingSessions: [],
    });

    await service.deactivate(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
    );

    const findFirstArgs = userFindFirst.mock.calls[0]?.[0];
    expect(findFirstArgs).toBeDefined();
    if (!findFirstArgs) {
      throw new Error('Expected user.findFirst to be called');
    }

    expect(findFirstArgs.where).toEqual({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      role: UserRole.TEACHER,
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'teacher-1' },
      data: { isActive: false },
    });
  });

  it('does not update when teacher is already inactive', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'teacher-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Fatima',
      lastName: 'Zahraoui',
      email: 'fatima@academix-demo.com',
      phone: '+212600000030',
      role: UserRole.TEACHER,
      cin: 'BE-12345',
      isActive: false,
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:00:00.000Z'),
      hourlyRate: null,
      maxHoursPerWeek: null,
      teacherSubjects: [],
      teachingSessions: [],
    });

    await service.deactivate(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
    );

    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when deactivating missing teacher', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.deactivate('2cc4267d-f618-478f-aa2f-9699ecbe332f', 'teacher-404'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns teacher module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'teacher',
      status: 'ready',
    });
  });
});
