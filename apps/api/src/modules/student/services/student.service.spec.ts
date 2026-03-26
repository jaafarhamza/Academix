import { ConflictException, NotFoundException } from '@nestjs/common';
import * as passwordHashUtil from '../../../common/utils/password-hash.util';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import {
  PaymentMethod,
  PaymentStatus,
  SchoolCycle,
  SchoolYear,
  UserRole,
} from '../../../generated/prisma/enums';
import { StudentService } from './student.service';

describe('StudentService', () => {
  type UserCreateArgs = {
    data: {
      centerId: string;
      firstName: string;
      lastName: string;
      email: string;
      passwordHash: string;
      phone: string;
      role: UserRole;
      parentPhone: string;
      schoolName: string;
      schoolCycle: SchoolCycle;
      schoolYear: SchoolYear;
    };
    select: Record<string, boolean>;
  };

  type CreatedStudent = {
    id: string;
    centerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    parentPhone: string | null;
    schoolName: string | null;
    schoolCycle: SchoolCycle | null;
    schoolYear: SchoolYear | null;
    isActive: boolean;
    createdAt: Date;
  };
  type StudentDetail = {
    id: string;
    centerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    parentPhone: string | null;
    schoolName: string | null;
    schoolCycle: SchoolCycle | null;
    schoolYear: SchoolYear | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    enrollments: Array<{
      id: string;
      enrollmentDate: Date;
      isActive: boolean;
      studentGroup: {
        id: string;
        name: string;
        schoolCycle: SchoolCycle;
        schoolYear: SchoolYear;
      };
    }>;
    studentPayments: Array<{
      id: string;
      amount: { toNumber(): number } | number;
      rest: { toNumber(): number } | number;
      status: PaymentStatus;
      method: PaymentMethod;
      paymentDate: Date;
      receiptUrl: string | null;
      teacher: {
        id: string;
        firstName: string;
        lastName: string;
      };
      studentGroup: {
        id: string;
        name: string;
      } | null;
    }>;
  };

  const userCreate = jest.fn<Promise<CreatedStudent>, [UserCreateArgs]>();
  type UserFindManyArgs = {
    where: Record<string, unknown>;
    orderBy: Array<Record<string, 'asc' | 'desc'>>;
    skip: number;
    take: number;
    select: Record<string, boolean>;
  };
  const userFindMany = jest.fn<Promise<CreatedStudent[]>, [UserFindManyArgs]>();
  type UserFindFirstArgs = {
    where: Record<string, unknown>;
    select: Record<string, unknown>;
  };
  const userFindFirst = jest.fn<
    Promise<StudentDetail | null>,
    [UserFindFirstArgs]
  >();
  const prismaService = {
    user: {
      create: userCreate,
      findMany: userFindMany,
      findFirst: userFindFirst,
    },
  };

  let service: StudentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StudentService(prismaService as unknown as PrismaService);
  });

  it('creates student with center_id from JWT context and hashes password', async () => {
    userCreate.mockResolvedValueOnce({
      id: 'student-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Imane',
      lastName: 'Student',
      email: 'student.new@academix-demo.com',
      phone: '+212600000031',
      role: UserRole.STUDENT,
      parentPhone: '+212600000901',
      schoolName: 'Ibn Sina School',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.SECOND_YEAR,
      isActive: true,
      createdAt: new Date('2026-03-27T12:00:00.000Z'),
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    const result = await service.create(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {
        firstName: 'Imane',
        lastName: 'Student',
        email: 'student.new@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000031',
        parentPhone: '+212600000901',
        schoolName: 'Ibn Sina School',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.SECOND_YEAR,
      },
    );

    expect(result).toMatchObject({
      id: 'student-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      role: UserRole.STUDENT,
      parentPhone: '+212600000901',
      schoolName: 'Ibn Sina School',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.SECOND_YEAR,
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
    expect(createArgs.data.role).toBe(UserRole.STUDENT);
    expect(createArgs.data.parentPhone).toBe('+212600000901');
    expect(createArgs.data.schoolName).toBe('Ibn Sina School');
    expect(createArgs.data.schoolCycle).toBe(SchoolCycle.COLLEGE);
    expect(createArgs.data.schoolYear).toBe(SchoolYear.SECOND_YEAR);
  });

  it('throws ConflictException when student email already exists for center', async () => {
    userCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['centerId', 'email'] },
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        firstName: 'Imane',
        lastName: 'Student',
        email: 'student.new@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000031',
        parentPhone: '+212600000901',
        schoolName: 'Ibn Sina School',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.SECOND_YEAR,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws generic ConflictException when create hits unknown unique target', async () => {
    userCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['centerId', 'unknownField'] },
    });
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        firstName: 'Imane',
        lastName: 'Student',
        email: 'student.new@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000031',
        parentPhone: '+212600000901',
        schoolName: 'Ibn Sina School',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.SECOND_YEAR,
      }),
    ).rejects.toThrow('Student already exists with the provided unique fields');
  });

  it('rethrows create errors that are not unique-constraint errors', async () => {
    const expectedError = new Error('Database temporarily unavailable');
    userCreate.mockRejectedValueOnce(expectedError);
    jest
      .spyOn(passwordHashUtil, 'hashPassword')
      .mockResolvedValueOnce('scrypt$hash');

    await expect(
      service.create('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
        firstName: 'Imane',
        lastName: 'Student',
        email: 'student.new@academix-demo.com',
        password: 'StrongPass1!',
        phone: '+212600000031',
        parentPhone: '+212600000901',
        schoolName: 'Ibn Sina School',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.SECOND_YEAR,
      }),
    ).rejects.toBe(expectedError);
  });

  it('lists students for current center with default pagination', async () => {
    userFindMany.mockResolvedValueOnce([
      {
        id: 'student-1',
        centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        firstName: 'Imane',
        lastName: 'Student',
        email: 'student.a@academix-demo.com',
        phone: '+212600000031',
        role: UserRole.STUDENT,
        parentPhone: '+212600000901',
        schoolName: 'Ibn Sina School',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.SECOND_YEAR,
        isActive: true,
        createdAt: new Date('2026-03-27T12:00:00.000Z'),
      },
    ]);

    const result = await service.findAll(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.center_id).toBe('2cc4267d-f618-478f-aa2f-9699ecbe332f');
    expect(result[0]?.role).toBe(UserRole.STUDENT);

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
        role: UserRole.STUDENT,
      }),
    );
  });

  it('applies group, level, and search filters when listing students', async () => {
    userFindMany.mockResolvedValueOnce([]);

    await service.findAll('2cc4267d-f618-478f-aa2f-9699ecbe332f', {
      groupId: '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.SECOND_YEAR,
      search: 'imane',
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
        role: UserRole.STUDENT,
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.SECOND_YEAR,
        isActive: true,
      }),
    );
    const whereWithEnrollments = args.where as {
      enrollments?: {
        some?: {
          studentGroupId?: string;
          isActive?: boolean;
        };
      };
      OR?: Array<{
        firstName?: {
          contains: string;
          mode: string;
        };
      }>;
    };

    expect(whereWithEnrollments.enrollments?.some).toEqual({
      studentGroupId: '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      isActive: true,
    });
    const firstOrClause = whereWithEnrollments.OR?.[0];
    expect(firstOrClause).toBeDefined();
    if (!firstOrClause?.firstName) {
      throw new Error('Expected firstName search clause');
    }

    expect(firstOrClause.firstName.contains).toBe('imane');
    expect(firstOrClause.firstName.mode).toBe('insensitive');
  });

  it('returns student details with enrollment and payment information', async () => {
    userFindFirst.mockResolvedValueOnce({
      id: 'student-1',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      firstName: 'Imane',
      lastName: 'Student',
      email: 'student.a@academix-demo.com',
      phone: '+212600000031',
      role: UserRole.STUDENT,
      parentPhone: '+212600000901',
      schoolName: 'Ibn Sina School',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.SECOND_YEAR,
      isActive: true,
      createdAt: new Date('2026-03-27T12:00:00.000Z'),
      updatedAt: new Date('2026-03-27T13:00:00.000Z'),
      enrollments: [
        {
          id: 'enrollment-1',
          enrollmentDate: new Date('2026-03-01'),
          isActive: true,
          studentGroup: {
            id: 'group-1',
            name: 'Group A',
            schoolCycle: SchoolCycle.COLLEGE,
            schoolYear: SchoolYear.SECOND_YEAR,
          },
        },
      ],
      studentPayments: [
        {
          id: 'payment-1',
          amount: { toNumber: () => 500 },
          rest: { toNumber: () => 100 },
          status: PaymentStatus.PARTIALLY_PAID,
          method: PaymentMethod.CASH,
          paymentDate: new Date('2026-03-20T08:00:00.000Z'),
          receiptUrl: 'https://example.com/receipt-1.pdf',
          teacher: {
            id: 'teacher-1',
            firstName: 'Fatima',
            lastName: 'Zahraoui',
          },
          studentGroup: {
            id: 'group-1',
            name: 'Group A',
          },
        },
        {
          id: 'payment-2',
          amount: 300,
          rest: 0,
          status: PaymentStatus.PAID,
          method: PaymentMethod.CASH,
          paymentDate: new Date('2026-03-10T08:00:00.000Z'),
          receiptUrl: null,
          teacher: {
            id: 'teacher-2',
            firstName: 'Sara',
            lastName: 'Benali',
          },
          studentGroup: null,
        },
      ],
    });

    const result = await service.findOne(
      '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
    );

    expect(result.id).toBe('student-1');
    expect(result.enrollments).toEqual([
      {
        id: 'enrollment-1',
        enrollmentDate: new Date('2026-03-01'),
        isActive: true,
        groupId: 'group-1',
        groupName: 'Group A',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.SECOND_YEAR,
      },
    ]);
    expect(result.payments).toEqual([
      {
        id: 'payment-1',
        amount: 500,
        rest: 100,
        paidAmount: 400,
        status: PaymentStatus.PARTIALLY_PAID,
        method: PaymentMethod.CASH,
        paymentDate: new Date('2026-03-20T08:00:00.000Z'),
        receiptUrl: 'https://example.com/receipt-1.pdf',
        teacherId: 'teacher-1',
        teacherName: 'Fatima Zahraoui',
        studentGroupId: 'group-1',
        studentGroupName: 'Group A',
      },
      {
        id: 'payment-2',
        amount: 300,
        rest: 0,
        paidAmount: 300,
        status: PaymentStatus.PAID,
        method: PaymentMethod.CASH,
        paymentDate: new Date('2026-03-10T08:00:00.000Z'),
        receiptUrl: null,
        teacherId: 'teacher-2',
        teacherName: 'Sara Benali',
        studentGroupId: null,
        studentGroupName: null,
      },
    ]);
    expect(result.paymentSummary).toEqual({
      totalPayments: 2,
      totalAmount: 800,
      totalPaid: 700,
      totalRest: 100,
      outstandingBalance: 100,
      lastPaymentDate: new Date('2026-03-20T08:00:00.000Z'),
    });

    const args = userFindFirst.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    if (!args) {
      throw new Error('Expected user.findFirst to be called');
    }

    expect(args.where).toEqual({
      id: '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      centerId: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      role: UserRole.STUDENT,
    });
  });

  it('throws NotFoundException when student details are requested with unknown id', async () => {
    userFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.findOne(
        '2cc4267d-f618-478f-aa2f-9699ecbe332f',
        '4e9c99a0-e35b-4e63-9d9f-9ccddfa26f3e',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns student module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'student',
      status: 'ready',
    });
  });
});
