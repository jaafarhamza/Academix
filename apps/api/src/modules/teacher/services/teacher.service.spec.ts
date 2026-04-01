import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import * as passwordHashUtil from '../../../common/utils/password-hash.util';
import {
  DayOfWeek,
  SessionStatus,
  UserRole,
} from '../../../generated/prisma/enums';
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
  };

  let service: TeacherService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TeacherService(prismaService as unknown as PrismaService);
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

    await service.findOne(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      'teacher-1',
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

  it('throws NotFoundException when teacher details do not exist in current center', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.findOne('2cc4267d-f618-478f-aa2f-9699ecbe332f', 'teacher-404'),
    ).rejects.toBeInstanceOf(NotFoundException);
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
