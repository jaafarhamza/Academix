import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentMethod, PaymentStatus } from '../../../generated/prisma/enums';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  const userFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const studentGroupFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const courseSessionFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const enrollmentFindFirst = jest.fn<Promise<unknown>, [unknown]>();
  const paymentCreate = jest.fn<Promise<unknown>, [unknown]>();
  const paymentFindMany = jest.fn<Promise<unknown>, [unknown]>();
  const emitAsync = jest.fn<Promise<unknown>, [string, unknown]>();

  const prismaService = {
    user: {
      findFirst: userFindFirst,
    },
    studentGroup: {
      findFirst: studentGroupFindFirst,
    },
    courseSession: {
      findFirst: courseSessionFindFirst,
    },
    enrollment: {
      findFirst: enrollmentFindFirst,
    },
    payment: {
      create: paymentCreate,
      findMany: paymentFindMany,
    },
  };

  const eventEmitter = {
    emitAsync,
  };

  let service: PaymentService;

  beforeEach(() => {
    jest.resetAllMocks();
    emitAsync.mockResolvedValue([]);
    service = new PaymentService(
      prismaService as unknown as PrismaService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  it('creates a partially paid payment and emits payment.created', async () => {
    userFindFirst
      .mockResolvedValueOnce({ id: 'student-1' })
      .mockResolvedValueOnce({ id: 'teacher-1' });
    studentGroupFindFirst.mockResolvedValueOnce({ id: 'group-1' });
    enrollmentFindFirst.mockResolvedValueOnce({ id: 'enrollment-1' });
    courseSessionFindFirst.mockResolvedValueOnce({
      id: 'session-1',
      teacherId: 'teacher-1',
      studentId: null,
      studentGroupId: 'group-1',
    });
    paymentCreate.mockResolvedValueOnce({
      id: 'payment-1',
      centerId: 'center-1',
      studentId: 'student-1',
      teacherId: 'teacher-1',
      studentGroupId: 'group-1',
      courseSessionId: 'session-1',
      amount: 400,
      rest: 100,
      paymentDate: new Date('2026-04-06T12:00:00.000Z'),
      method: PaymentMethod.CASH,
      status: PaymentStatus.PARTIALLY_PAID,
      receiptUrl: null,
      notes: 'April payment',
      createdAt: new Date('2026-04-06T12:00:00.000Z'),
      student: {
        firstName: 'Imane',
        lastName: 'Alaoui',
      },
      teacher: {
        firstName: 'Yara',
        lastName: 'Tahiri',
      },
      studentGroup: {
        name: 'Group 01',
      },
    });

    const result = await service.create('center-1', {
      student_id: 'student-1',
      teacher_id: 'teacher-1',
      student_group_id: 'group-1',
      course_session_id: 'session-1',
      amount: 400,
      paid_amount: 300,
      payment_date: '2026-04-06T12:00:00.000Z',
      notes: 'April payment',
    });

    expect(result).toEqual({
      id: 'payment-1',
      center_id: 'center-1',
      student_id: 'student-1',
      studentName: 'Imane Alaoui',
      teacher_id: 'teacher-1',
      teacherName: 'Yara Tahiri',
      student_group_id: 'group-1',
      studentGroupName: 'Group 01',
      course_session_id: 'session-1',
      amount: 400,
      rest: 100,
      paidAmount: 300,
      paymentDate: '2026-04-06T12:00:00.000Z',
      method: PaymentMethod.CASH,
      status: PaymentStatus.PARTIALLY_PAID,
      receiptUrl: null,
      notes: 'April payment',
      createdAt: '2026-04-06T12:00:00.000Z',
    });

    expect(paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          centerId: 'center-1',
          studentId: 'student-1',
          teacherId: 'teacher-1',
          studentGroupId: 'group-1',
          courseSessionId: 'session-1',
          amount: 400,
          rest: 100,
          paymentDate: new Date('2026-04-06T12:00:00.000Z'),
          method: PaymentMethod.CASH,
          status: PaymentStatus.PARTIALLY_PAID,
          notes: 'April payment',
        },
      }),
    );

    expect(emitAsync).toHaveBeenCalledWith(
      'payment.created',
      expect.objectContaining({
        payment_id: 'payment-1',
        status: PaymentStatus.PARTIALLY_PAID,
        paid_amount: 300,
      }),
    );
  });

  it('creates an unpaid payment when paid_amount is zero', async () => {
    userFindFirst
      .mockResolvedValueOnce({ id: 'student-1' })
      .mockResolvedValueOnce({ id: 'teacher-1' });
    paymentCreate.mockResolvedValueOnce({
      id: 'payment-2',
      centerId: 'center-1',
      studentId: 'student-1',
      teacherId: 'teacher-1',
      studentGroupId: null,
      courseSessionId: null,
      amount: 250,
      rest: 250,
      paymentDate: new Date('2026-04-06T12:00:00.000Z'),
      method: PaymentMethod.CASH,
      status: PaymentStatus.UNPAID,
      receiptUrl: null,
      notes: null,
      createdAt: new Date('2026-04-06T12:00:00.000Z'),
      student: {
        firstName: 'Imane',
        lastName: 'Alaoui',
      },
      teacher: {
        firstName: 'Yara',
        lastName: 'Tahiri',
      },
      studentGroup: null,
    });

    const result = await service.create('center-1', {
      student_id: 'student-1',
      teacher_id: 'teacher-1',
      amount: 250,
      paid_amount: 0,
    });

    expect(result.status).toBe(PaymentStatus.UNPAID);
    expect(result.rest).toBe(250);
    expect(result.paidAmount).toBe(0);
  });

  it('rejects payments where paid_amount exceeds amount', async () => {
    await expect(
      service.create('center-1', {
        student_id: 'student-1',
        teacher_id: 'teacher-1',
        amount: 200,
        paid_amount: 250,
      }),
    ).rejects.toThrow(
      new BadRequestException('paid_amount cannot exceed amount'),
    );
  });

  it('rejects payments for students outside the center scope', async () => {
    userFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'teacher-1' });

    await expect(
      service.create('center-1', {
        student_id: 'student-1',
        teacher_id: 'teacher-1',
        amount: 200,
      }),
    ).rejects.toThrow(new NotFoundException('Student not found'));
  });

  it('rejects group payments when the student is not actively enrolled', async () => {
    userFindFirst
      .mockResolvedValueOnce({ id: 'student-1' })
      .mockResolvedValueOnce({ id: 'teacher-1' });
    studentGroupFindFirst.mockResolvedValueOnce({ id: 'group-1' });
    enrollmentFindFirst.mockResolvedValueOnce(null);

    await expect(
      service.create('center-1', {
        student_id: 'student-1',
        teacher_id: 'teacher-1',
        student_group_id: 'group-1',
        amount: 200,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Student is not actively enrolled in the specified group',
      ),
    );
  });

  it('rejects payments when linked session does not match the teacher', async () => {
    userFindFirst
      .mockResolvedValueOnce({ id: 'student-1' })
      .mockResolvedValueOnce({ id: 'teacher-1' });
    courseSessionFindFirst.mockResolvedValueOnce({
      id: 'session-1',
      teacherId: 'teacher-2',
      studentId: 'student-1',
      studentGroupId: null,
    });

    await expect(
      service.create('center-1', {
        student_id: 'student-1',
        teacher_id: 'teacher-1',
        course_session_id: 'session-1',
        amount: 200,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'teacher_id must match the linked course session teacher',
      ),
    );
  });

  it('lists payments with filters and pagination', async () => {
    paymentFindMany.mockResolvedValueOnce([
      {
        id: 'payment-1',
        centerId: 'center-1',
        studentId: 'student-1',
        teacherId: 'teacher-1',
        studentGroupId: 'group-1',
        courseSessionId: null,
        amount: 400,
        rest: 0,
        paymentDate: new Date('2026-04-06T12:00:00.000Z'),
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        receiptUrl: 'https://cdn.example.com/receipt-1.pdf',
        notes: null,
        createdAt: new Date('2026-04-06T12:00:00.000Z'),
        student: {
          firstName: 'Imane',
          lastName: 'Alaoui',
        },
        teacher: {
          firstName: 'Yara',
          lastName: 'Tahiri',
        },
        studentGroup: {
          name: 'Group 01',
        },
      },
    ]);

    const result = await service.findAll('center-1', {
      student_id: 'student-1',
      teacher_id: 'teacher-1',
      student_group_id: 'group-1',
      status: PaymentStatus.PAID,
      payment_from: '2026-04-01T00:00:00.000Z',
      payment_to: '2026-04-30T23:59:59.999Z',
      page: 2,
      limit: 10,
    });

    expect(result).toHaveLength(1);
    expect(paymentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          centerId: 'center-1',
          studentId: 'student-1',
          teacherId: 'teacher-1',
          studentGroupId: 'group-1',
          status: PaymentStatus.PAID,
          paymentDate: {
            gte: new Date('2026-04-01T00:00:00.000Z'),
            lte: new Date('2026-04-30T23:59:59.999Z'),
          },
        },
        orderBy: [{ paymentDate: 'desc' }, { id: 'asc' }],
        skip: 10,
        take: 10,
      }),
    );
  });

  it('returns payment module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'payment',
      status: 'ready',
    });
  });
});
