import { ConflictException } from '@nestjs/common';
import * as passwordHashUtil from '../../../common/utils/password-hash.util';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import {
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

  const userCreate = jest.fn<Promise<CreatedStudent>, [UserCreateArgs]>();
  const prismaService = {
    user: {
      create: userCreate,
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

  it('returns student module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'student',
      status: 'ready',
    });
  });
});
