import { Test, TestingModule } from '@nestjs/testing';
import { DayOfWeek, SessionStatus, UserRole } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password-hash.util';
import { PrismaModule } from '../src/database/prisma/prisma.module';
import { PrismaService } from '../src/database/prisma/prisma.service';

const toTime = (value: string): Date => new Date(`1970-01-01T${value}:00.000Z`);

describe('Room conflict integration', () => {
  let moduleFixture: TestingModule;
  let prismaService: PrismaService;

  const suffix = Date.now().toString(36);
  const state: {
    superAdminId?: string;
    centerId?: string;
    teacherId?: string;
    subjectId?: string;
    roomId?: string;
    createdSessionIds: string[];
  } = {
    createdSessionIds: [],
  };

  const requiredId = (value: string | undefined, fieldName: string): string => {
    if (!value) {
      throw new Error(`${fieldName} is not initialized`);
    }

    return value;
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    prismaService = moduleFixture.get(PrismaService);
    await prismaService.$connect();

    const superAdmin = await prismaService.superAdmin.create({
      data: {
        firstName: 'Integration',
        lastName: 'RoomOwner',
        email: `integration.room.superadmin.${suffix}@academix.com`,
        phone: '+212600990001',
        passwordHash: await hashPassword('Academix.Room.Super.2026'),
        isActive: true,
      },
      select: { id: true },
    });
    state.superAdminId = superAdmin.id;

    const center = await prismaService.center.create({
      data: {
        superAdminId: superAdmin.id,
        firstName: 'Center',
        lastName: 'Room',
        centerName: `Integration Room Center ${suffix}`,
        email: `integration.room.center.${suffix}@academix.com`,
        passwordHash: await hashPassword('Academix.Room.Center.2026'),
        phone: '+212600990011',
        subdomain: `integration-room-center-${suffix}`,
        isActive: true,
      },
      select: { id: true },
    });
    state.centerId = center.id;

    const teacher = await prismaService.user.create({
      data: {
        centerId: center.id,
        firstName: 'Room',
        lastName: 'Teacher',
        email: `integration.room.teacher.${suffix}@academix.com`,
        passwordHash: await hashPassword('Academix.Room.Teacher.2026'),
        phone: '+212600990021',
        role: UserRole.TEACHER,
        cin: `ROOM-CIN-${suffix}`.slice(0, 20),
      },
      select: { id: true },
    });
    state.teacherId = teacher.id;

    const subject = await prismaService.subject.create({
      data: {
        centerId: center.id,
        name: `Room Conflict Subject ${suffix}`,
        description: 'Integration subject for room conflict tests',
      },
      select: { id: true },
    });
    state.subjectId = subject.id;

    const room = await prismaService.room.create({
      data: {
        centerId: center.id,
        floor: 1,
        roomName: `R-${suffix}`.slice(0, 20),
        isAvailable: true,
      },
      select: { id: true },
    });
    state.roomId = room.id;
  });

  afterAll(async () => {
    if (!prismaService) {
      if (moduleFixture) {
        await moduleFixture.close();
      }
      return;
    }

    if (state.createdSessionIds.length > 0) {
      await prismaService.courseSession.deleteMany({
        where: { id: { in: state.createdSessionIds } },
      });
    }

    if (state.roomId) {
      await prismaService.room.delete({ where: { id: state.roomId } });
    }

    if (state.subjectId) {
      await prismaService.subject.delete({ where: { id: state.subjectId } });
    }

    if (state.teacherId) {
      await prismaService.user.delete({ where: { id: state.teacherId } });
    }

    if (state.centerId) {
      await prismaService.center.delete({ where: { id: state.centerId } });
    }

    if (state.superAdminId) {
      await prismaService.superAdmin.delete({
        where: { id: state.superAdminId },
      });
    }

    await prismaService.$disconnect();
    await moduleFixture.close();
  });

  it('blocks overlapping sessions for the same room/day via PostgreSQL exclusion constraint', async () => {
    const firstSession = await prismaService.courseSession.create({
      data: {
        centerId: requiredId(state.centerId, 'centerId'),
        teacherId: requiredId(state.teacherId, 'teacherId'),
        subjectId: requiredId(state.subjectId, 'subjectId'),
        roomId: requiredId(state.roomId, 'roomId'),
        day: DayOfWeek.MONDAY,
        startTime: toTime('14:00'),
        endTime: toTime('16:00'),
        status: SessionStatus.SCHEDULED,
      },
      select: { id: true },
    });
    state.createdSessionIds.push(firstSession.id);

    let conflictError: unknown;
    try {
      await prismaService.courseSession.create({
        data: {
          centerId: requiredId(state.centerId, 'centerId'),
          teacherId: requiredId(state.teacherId, 'teacherId'),
          subjectId: requiredId(state.subjectId, 'subjectId'),
          roomId: requiredId(state.roomId, 'roomId'),
          day: DayOfWeek.MONDAY,
          startTime: toTime('15:00'),
          endTime: toTime('17:00'),
          status: SessionStatus.SCHEDULED,
        },
      });
    } catch (error: unknown) {
      conflictError = error;
    }

    expect(conflictError).toBeDefined();
    const details = JSON.stringify(conflictError);
    expect(details).toContain('course_sessions_room_no_overlap_excl');
  });

  it('allows adjacent sessions and ignores cancelled overlaps', async () => {
    const adjacentSession = await prismaService.courseSession.create({
      data: {
        centerId: requiredId(state.centerId, 'centerId'),
        teacherId: requiredId(state.teacherId, 'teacherId'),
        subjectId: requiredId(state.subjectId, 'subjectId'),
        roomId: requiredId(state.roomId, 'roomId'),
        day: DayOfWeek.MONDAY,
        startTime: toTime('16:00'),
        endTime: toTime('17:00'),
        status: SessionStatus.SCHEDULED,
      },
      select: { id: true },
    });
    state.createdSessionIds.push(adjacentSession.id);

    const cancelledSession = await prismaService.courseSession.create({
      data: {
        centerId: requiredId(state.centerId, 'centerId'),
        teacherId: requiredId(state.teacherId, 'teacherId'),
        subjectId: requiredId(state.subjectId, 'subjectId'),
        roomId: requiredId(state.roomId, 'roomId'),
        day: DayOfWeek.MONDAY,
        startTime: toTime('14:30'),
        endTime: toTime('15:30'),
        status: SessionStatus.CANCELLED,
      },
      select: { id: true, status: true },
    });
    state.createdSessionIds.push(cancelledSession.id);

    expect(cancelledSession.status).toBe(SessionStatus.CANCELLED);
  });
});
