import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../../../database/prisma/prisma.service';
import * as passwordHashUtil from '../../../common/utils/password-hash.util';
import { UserRole } from '../../../generated/prisma/enums';
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
  const prismaService = {
    user: {
      create: userCreate,
    },
  };

  let service: TeacherService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TeacherService(prismaService as unknown as PrismaService);
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

  it('returns teacher module readiness status', () => {
    expect(service.getStatus()).toEqual({
      module: 'teacher',
      status: 'ready',
    });
  });
});
