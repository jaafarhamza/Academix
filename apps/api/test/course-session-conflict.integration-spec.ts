import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DayOfWeek,
  PermissionAction,
  SchoolCycle,
  SchoolYear,
  SessionStatus,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { hashPassword } from '../src/common/utils/password-hash.util';
import { PrismaService } from '../src/database/prisma/prisma.service';

const toTime = (value: string): Date => new Date(`1970-01-01T${value}:00.000Z`);

jest.setTimeout(20_000);

type ConflictItem = {
  type: string;
  message: string;
};

const toConflictItems = (body: unknown): ConflictItem[] => {
  if (!body || typeof body !== 'object') {
    return [];
  }

  const direct = body as {
    conflicts?: unknown;
    message?: unknown;
  };

  if (Array.isArray(direct.conflicts)) {
    return direct.conflicts as ConflictItem[];
  }

  if (direct.message && typeof direct.message === 'object') {
    const nested = direct.message as {
      conflicts?: unknown;
    };

    if (Array.isArray(nested.conflicts)) {
      return nested.conflicts as ConflictItem[];
    }
  }

  return [];
};

describe('CourseSession conflict integration', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const suffix = Date.now().toString(36);

  const state: {
    superAdminId?: string;
    centerId?: string;
    adminId?: string;
    studentId?: string;
    studentEnrolledId?: string;
    teacherAId?: string;
    teacherBId?: string;
    subjectAId?: string;
    subjectBId?: string;
    teacherSubjectAId?: string;
    teacherSubjectBId?: string;
    groupAId?: string;
    groupBId?: string;
    roomAId?: string;
    roomBId?: string;
    rolePermissionId?: string;
    enrollmentId?: string;
    accessToken?: string;
    sessionIds: string[];
  } = {
    sessionIds: [],
  };

  const requiredId = (value: string | undefined, fieldName: string): string => {
    if (!value) {
      throw new Error(`${fieldName} is not initialized`);
    }

    return value;
  };

  const bearer = (): string => {
    const token = state.accessToken;
    if (!token) {
      throw new Error('accessToken is not initialized');
    }

    return `Bearer ${token}`;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = app.get(PrismaService);

    const superAdmin = await prismaService.superAdmin.create({
      data: {
        firstName: 'Integration',
        lastName: 'SchedulerOwner',
        email: `integration.sessions.superadmin.${suffix}@academix.com`,
        phone: '+212600980001',
        passwordHash: await hashPassword('Academix.Sessions.Super.2026'),
        isActive: true,
      },
      select: { id: true },
    });
    state.superAdminId = superAdmin.id;

    const center = await prismaService.center.create({
      data: {
        superAdminId: superAdmin.id,
        firstName: 'Integration',
        lastName: 'Center',
        centerName: `Integration Session Center ${suffix}`,
        email: `integration.sessions.center.${suffix}@academix.com`,
        passwordHash: await hashPassword('Academix.Sessions.Center.2026'),
        phone: '+212600980011',
        subdomain: `integration-sessions-center-${suffix}`,
        isActive: true,
      },
      select: { id: true },
    });
    state.centerId = center.id;

    const admin = await prismaService.user.create({
      data: {
        centerId: center.id,
        firstName: 'Center',
        lastName: 'Admin',
        email: `integration.sessions.admin.${suffix}@academix.com`,
        passwordHash: await hashPassword('Academix.Sessions.Admin.2026'),
        phone: '+212600980021',
        role: UserRole.ADMIN,
        isActive: true,
        cin: `SESSION-ADMIN-${suffix}`.slice(0, 20),
      },
      select: { id: true, email: true },
    });
    state.adminId = admin.id;

    const student = await prismaService.user.create({
      data: {
        centerId: center.id,
        firstName: 'Student',
        lastName: 'One',
        email: `integration.sessions.student.${suffix}@academix.com`,
        passwordHash: await hashPassword('Academix.Sessions.Student.2026'),
        phone: '+212600980022',
        role: UserRole.STUDENT,
        isActive: true,
      },
      select: { id: true },
    });
    state.studentId = student.id;

    const studentEnrolled = await prismaService.user.create({
      data: {
        centerId: center.id,
        firstName: 'Student',
        lastName: 'Enrolled',
        email: `integration.sessions.student.enrolled.${suffix}@academix.com`,
        passwordHash: await hashPassword(
          'Academix.Sessions.Student.Enrolled.2026',
        ),
        phone: '+212600980023',
        role: UserRole.STUDENT,
        isActive: true,
      },
      select: { id: true },
    });
    state.studentEnrolledId = studentEnrolled.id;

    const rolePermission = await prismaService.rolePermission.create({
      data: {
        centerId: center.id,
        role: UserRole.ADMIN,
        permission: PermissionAction.MANAGE_SCHEDULE,
        isGranted: true,
      },
      select: { id: true },
    });
    state.rolePermissionId = rolePermission.id;

    const teacherA = await prismaService.user.create({
      data: {
        centerId: center.id,
        firstName: 'Teacher',
        lastName: 'One',
        email: `integration.sessions.teacher.a.${suffix}@academix.com`,
        passwordHash: await hashPassword('Academix.Sessions.TeacherA.2026'),
        phone: '+212600980031',
        role: UserRole.TEACHER,
        isActive: true,
        cin: `SESSION-TA-${suffix}`.slice(0, 20),
      },
      select: { id: true },
    });
    state.teacherAId = teacherA.id;

    const teacherB = await prismaService.user.create({
      data: {
        centerId: center.id,
        firstName: 'Teacher',
        lastName: 'Two',
        email: `integration.sessions.teacher.b.${suffix}@academix.com`,
        passwordHash: await hashPassword('Academix.Sessions.TeacherB.2026'),
        phone: '+212600980041',
        role: UserRole.TEACHER,
        isActive: true,
        cin: `SESSION-TB-${suffix}`.slice(0, 20),
      },
      select: { id: true },
    });
    state.teacherBId = teacherB.id;

    const subjectA = await prismaService.subject.create({
      data: {
        centerId: center.id,
        name: `Session Subject A ${suffix}`,
        description: 'Integration subject for teacher A',
      },
      select: { id: true },
    });
    state.subjectAId = subjectA.id;

    const subjectB = await prismaService.subject.create({
      data: {
        centerId: center.id,
        name: `Session Subject B ${suffix}`,
        description: 'Integration subject for teacher B',
      },
      select: { id: true },
    });
    state.subjectBId = subjectB.id;

    const teacherSubjectA = await prismaService.teacherSubject.create({
      data: {
        teacherId: teacherA.id,
        subjectId: subjectA.id,
      },
      select: { id: true },
    });
    state.teacherSubjectAId = teacherSubjectA.id;

    const teacherSubjectB = await prismaService.teacherSubject.create({
      data: {
        teacherId: teacherB.id,
        subjectId: subjectB.id,
      },
      select: { id: true },
    });
    state.teacherSubjectBId = teacherSubjectB.id;

    const groupA = await prismaService.studentGroup.create({
      data: {
        centerId: center.id,
        teacherSubjectId: teacherSubjectA.id,
        name: `Session Group A ${suffix}`,
        schoolCycle: SchoolCycle.PRIMARY,
        schoolYear: SchoolYear.FIRST_YEAR,
      },
      select: { id: true },
    });
    state.groupAId = groupA.id;

    const groupB = await prismaService.studentGroup.create({
      data: {
        centerId: center.id,
        teacherSubjectId: teacherSubjectB.id,
        name: `Session Group B ${suffix}`,
        schoolCycle: SchoolCycle.PRIMARY,
        schoolYear: SchoolYear.SECOND_YEAR,
      },
      select: { id: true },
    });
    state.groupBId = groupB.id;

    const enrollment = await prismaService.enrollment.create({
      data: {
        studentId: studentEnrolled.id,
        studentGroupId: groupA.id,
        enrollmentDate: new Date('2026-04-01'),
        isActive: true,
      },
      select: { id: true },
    });
    state.enrollmentId = enrollment.id;

    const roomA = await prismaService.room.create({
      data: {
        centerId: center.id,
        floor: 1,
        roomName: `RS-A-${suffix}`.slice(0, 20),
        isAvailable: true,
      },
      select: { id: true },
    });
    state.roomAId = roomA.id;

    const roomB = await prismaService.room.create({
      data: {
        centerId: center.id,
        floor: 2,
        roomName: `RS-B-${suffix}`.slice(0, 20),
        isAvailable: true,
      },
      select: { id: true },
    });
    state.roomBId = roomB.id;

    const baselineSession = await prismaService.courseSession.create({
      data: {
        centerId: center.id,
        teacherId: teacherA.id,
        subjectId: subjectA.id,
        studentGroupId: groupA.id,
        roomId: roomA.id,
        day: DayOfWeek.MONDAY,
        startTime: toTime('10:00'),
        endTime: toTime('12:00'),
        status: SessionStatus.SCHEDULED,
      },
      select: { id: true },
    });
    state.sessionIds.push(baselineSession.id);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        center_id: center.id,
        email: admin.email,
        password: 'Academix.Sessions.Admin.2026',
      })
      .expect(200);

    state.accessToken = (
      loginResponse.body as { accessToken?: string }
    ).accessToken;
  });

  afterAll(async () => {
    if (!prismaService) {
      if (app) {
        await app.close();
      }
      return;
    }

    if (state.sessionIds.length > 0) {
      await prismaService.courseSession.deleteMany({
        where: {
          id: {
            in: state.sessionIds,
          },
        },
      });
    }

    if (state.enrollmentId) {
      await prismaService.enrollment.delete({
        where: { id: state.enrollmentId },
      });
    }

    if (state.groupAId || state.groupBId) {
      await prismaService.studentGroup.deleteMany({
        where: {
          id: {
            in: [state.groupAId, state.groupBId].filter(
              (value): value is string => Boolean(value),
            ),
          },
        },
      });
    }

    if (state.teacherSubjectAId || state.teacherSubjectBId) {
      await prismaService.teacherSubject.deleteMany({
        where: {
          id: {
            in: [state.teacherSubjectAId, state.teacherSubjectBId].filter(
              (value): value is string => Boolean(value),
            ),
          },
        },
      });
    }

    if (state.subjectAId || state.subjectBId) {
      await prismaService.subject.deleteMany({
        where: {
          id: {
            in: [state.subjectAId, state.subjectBId].filter(
              (value): value is string => Boolean(value),
            ),
          },
        },
      });
    }

    if (state.roomAId || state.roomBId) {
      await prismaService.room.deleteMany({
        where: {
          id: {
            in: [state.roomAId, state.roomBId].filter(
              (value): value is string => Boolean(value),
            ),
          },
        },
      });
    }

    if (
      state.adminId ||
      state.studentId ||
      state.studentEnrolledId ||
      state.teacherAId ||
      state.teacherBId
    ) {
      await prismaService.user.deleteMany({
        where: {
          id: {
            in: [
              state.adminId,
              state.studentId,
              state.studentEnrolledId,
              state.teacherAId,
              state.teacherBId,
            ].filter((value): value is string => Boolean(value)),
          },
        },
      });
    }

    if (state.rolePermissionId) {
      await prismaService.rolePermission.delete({
        where: { id: state.rolePermissionId },
      });
    }

    if (state.centerId) {
      await prismaService.center.delete({
        where: { id: state.centerId },
      });
    }

    if (state.superAdminId) {
      await prismaService.superAdmin.delete({
        where: { id: state.superAdminId },
      });
    }

    await app.close();
  });

  it('creates a non-overlapping session successfully via POST /sessions', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherAId, 'teacherAId'),
        subject_id: requiredId(state.subjectAId, 'subjectAId'),
        student_group_id: requiredId(state.groupAId, 'groupAId'),
        room_id: requiredId(state.roomAId, 'roomAId'),
        day: DayOfWeek.MONDAY,
        start_time: '08:00',
        end_time: '09:00',
      })
      .expect(201);

    const created = response.body as { id: string; center_id: string };
    state.sessionIds.push(created.id);

    expect(created.id).toEqual(expect.any(String));
    expect(created.center_id).toBe(requiredId(state.centerId, 'centerId'));
  });

  it('creates a private session successfully via POST /sessions', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_id: requiredId(state.studentId, 'studentId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.MONDAY,
        start_time: '12:30',
        end_time: '13:30',
      })
      .expect(201);

    const created = response.body as {
      id: string;
      center_id: string;
      student_id: string | null;
      student_group_id: string | null;
    };
    state.sessionIds.push(created.id);

    expect(created.id).toEqual(expect.any(String));
    expect(created.center_id).toBe(requiredId(state.centerId, 'centerId'));
    expect(created.student_id).toBe(requiredId(state.studentId, 'studentId'));
    expect(created.student_group_id).toBeNull();
  });

  it('rejects private session when student_id does not belong to an active student', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_id: requiredId(state.adminId, 'adminId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.WEDNESDAY,
        start_time: '16:00',
        end_time: '17:00',
      })
      .expect(404);

    expect(JSON.stringify(response.body)).toContain('Student not found');
  });

  it('rejects private session when student is overlapping another private session', async () => {
    const firstPrivateResponse = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherAId, 'teacherAId'),
        subject_id: requiredId(state.subjectAId, 'subjectAId'),
        student_id: requiredId(state.studentId, 'studentId'),
        room_id: requiredId(state.roomAId, 'roomAId'),
        day: DayOfWeek.TUESDAY,
        start_time: '14:00',
        end_time: '15:00',
      })
      .expect(201);

    const firstPrivate = firstPrivateResponse.body as { id: string };
    state.sessionIds.push(firstPrivate.id);

    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_id: requiredId(state.studentId, 'studentId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.TUESDAY,
        start_time: '14:30',
        end_time: '15:30',
      })
      .expect(409);

    const conflicts = toConflictItems(response.body);
    expect(conflicts).toEqual([
      {
        type: 'STUDENT_TIME_OVERLAP',
        message: 'Student is not available for the selected day/time',
      },
    ]);
  });

  it('rejects create when student_id and student_group_id are both missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherAId, 'teacherAId'),
        subject_id: requiredId(state.subjectAId, 'subjectAId'),
        room_id: requiredId(state.roomAId, 'roomAId'),
        day: DayOfWeek.MONDAY,
        start_time: '12:30',
        end_time: '13:30',
      })
      .expect(400);

    expect(JSON.stringify(response.body)).toContain(
      'Exactly one of student_id or student_group_id must be provided',
    );
  });

  it('rejects create when student_id and student_group_id are both provided', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherAId, 'teacherAId'),
        subject_id: requiredId(state.subjectAId, 'subjectAId'),
        student_id: requiredId(state.adminId, 'adminId'),
        student_group_id: requiredId(state.groupAId, 'groupAId'),
        room_id: requiredId(state.roomAId, 'roomAId'),
        day: DayOfWeek.MONDAY,
        start_time: '12:30',
        end_time: '13:30',
      })
      .expect(400);

    expect(JSON.stringify(response.body)).toContain(
      'Exactly one of student_id or student_group_id must be provided',
    );
  });

  it('cancels an existing session via PATCH /sessions/:id/cancel', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_group_id: requiredId(state.groupBId, 'groupBId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.WEDNESDAY,
        start_time: '08:00',
        end_time: '09:00',
      })
      .expect(201);

    const created = createResponse.body as { id: string };
    state.sessionIds.push(created.id);

    await request(app.getHttpServer())
      .patch(`/sessions/${created.id}/cancel`)
      .set('Authorization', bearer())
      .expect(204);

    const session = await prismaService.courseSession.findUnique({
      where: { id: created.id },
      select: {
        id: true,
        status: true,
      },
    });

    expect(session).toMatchObject({
      id: created.id,
      status: SessionStatus.CANCELLED,
    });
  });

  it('supports idempotent cancellation for already cancelled sessions', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_group_id: requiredId(state.groupBId, 'groupBId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.THURSDAY,
        start_time: '08:00',
        end_time: '09:00',
      })
      .expect(201);

    const created = createResponse.body as { id: string };
    state.sessionIds.push(created.id);

    await request(app.getHttpServer())
      .patch(`/sessions/${created.id}/cancel`)
      .set('Authorization', bearer())
      .expect(204);

    await request(app.getHttpServer())
      .patch(`/sessions/${created.id}/cancel`)
      .set('Authorization', bearer())
      .expect(204);
  });

  it('returns 404 when cancelling a session that does not exist in center scope', async () => {
    const response = await request(app.getHttpServer())
      .patch('/sessions/9f7798f1-1e5c-4f2d-89d7-bf8d592cc06f/cancel')
      .set('Authorization', bearer())
      .expect(404);

    expect(JSON.stringify(response.body)).toContain('Session not found');
  });

  it('reschedules an existing session via PATCH /sessions/:id/reschedule', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_group_id: requiredId(state.groupBId, 'groupBId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.THURSDAY,
        start_time: '13:00',
        end_time: '14:00',
      })
      .expect(201);

    const created = createResponse.body as {
      id: string;
    };
    state.sessionIds.push(created.id);

    const response = await request(app.getHttpServer())
      .patch(`/sessions/${created.id}/reschedule`)
      .set('Authorization', bearer())
      .send({
        day: DayOfWeek.FRIDAY,
        start_time: '14:00',
        end_time: '15:00',
      })
      .expect(200);

    const rescheduled = response.body as {
      id: string;
      day: DayOfWeek;
      startTime: string;
      endTime: string;
      status: SessionStatus;
    };
    expect(rescheduled).toMatchObject({
      id: created.id,
      day: DayOfWeek.FRIDAY,
      startTime: '14:00',
      endTime: '15:00',
      status: SessionStatus.SCHEDULED,
    });
  });

  it('supports rescheduling to the same slot by excluding current session id from conflict checks', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_group_id: requiredId(state.groupBId, 'groupBId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.SATURDAY,
        start_time: '09:00',
        end_time: '10:00',
      })
      .expect(201);

    const created = createResponse.body as { id: string };
    state.sessionIds.push(created.id);

    await request(app.getHttpServer())
      .patch(`/sessions/${created.id}/reschedule`)
      .set('Authorization', bearer())
      .send({
        day: DayOfWeek.SATURDAY,
        start_time: '09:00',
        end_time: '10:00',
      })
      .expect(200);
  });

  it('rejects reschedule when new slot creates a teacher conflict', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherAId, 'teacherAId'),
        subject_id: requiredId(state.subjectAId, 'subjectAId'),
        student_group_id: requiredId(state.groupAId, 'groupAId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.THURSDAY,
        start_time: '13:00',
        end_time: '14:00',
      })
      .expect(201);

    const created = createResponse.body as { id: string };
    state.sessionIds.push(created.id);

    const response = await request(app.getHttpServer())
      .patch(`/sessions/${created.id}/reschedule`)
      .set('Authorization', bearer())
      .send({
        day: DayOfWeek.MONDAY,
        start_time: '10:30',
        end_time: '11:00',
      })
      .expect(409);

    const conflicts = toConflictItems(response.body);
    expect(conflicts).toEqual([
      {
        type: 'TEACHER_TIME_OVERLAP',
        message: 'Teacher is not available for the selected day/time',
      },
    ]);
  });

  it('rejects reschedule when new slot creates a room conflict', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_group_id: requiredId(state.groupBId, 'groupBId'),
        room_id: requiredId(state.roomAId, 'roomAId'),
        day: DayOfWeek.THURSDAY,
        start_time: '13:00',
        end_time: '14:00',
      })
      .expect(201);

    const created = createResponse.body as { id: string };
    state.sessionIds.push(created.id);

    const response = await request(app.getHttpServer())
      .patch(`/sessions/${created.id}/reschedule`)
      .set('Authorization', bearer())
      .send({
        day: DayOfWeek.MONDAY,
        start_time: '10:30',
        end_time: '11:00',
      })
      .expect(409);

    const conflicts = toConflictItems(response.body);
    expect(conflicts).toEqual([
      {
        type: 'ROOM_TIME_OVERLAP',
        message: 'Room is already booked for the selected day/time',
      },
    ]);
  });

  it('rejects private reschedule when student is overlapping a group session', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_id: requiredId(state.studentEnrolledId, 'studentEnrolledId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.THURSDAY,
        start_time: '15:00',
        end_time: '16:00',
      })
      .expect(201);

    const created = createResponse.body as { id: string };
    state.sessionIds.push(created.id);

    const response = await request(app.getHttpServer())
      .patch(`/sessions/${created.id}/reschedule`)
      .set('Authorization', bearer())
      .send({
        day: DayOfWeek.MONDAY,
        start_time: '10:30',
        end_time: '11:00',
      })
      .expect(409);

    const conflicts = toConflictItems(response.body);
    expect(conflicts).toEqual([
      {
        type: 'STUDENT_TIME_OVERLAP',
        message: 'Student is not available for the selected day/time',
      },
    ]);
  });

  it('rejects reschedule when session is already cancelled', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_group_id: requiredId(state.groupBId, 'groupBId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.SUNDAY,
        start_time: '11:00',
        end_time: '12:00',
      })
      .expect(201);

    const created = createResponse.body as { id: string };
    state.sessionIds.push(created.id);

    await request(app.getHttpServer())
      .patch(`/sessions/${created.id}/cancel`)
      .set('Authorization', bearer())
      .expect(204);

    const response = await request(app.getHttpServer())
      .patch(`/sessions/${created.id}/reschedule`)
      .set('Authorization', bearer())
      .send({
        day: DayOfWeek.FRIDAY,
        start_time: '12:00',
        end_time: '13:00',
      })
      .expect(409);

    expect(JSON.stringify(response.body)).toContain(
      'Only scheduled sessions can be rescheduled',
    );
  });

  it('returns 404 when rescheduling unknown session', async () => {
    const response = await request(app.getHttpServer())
      .patch('/sessions/186adf2d-6f98-4fe8-b32e-4e4b58ec6199/reschedule')
      .set('Authorization', bearer())
      .send({
        day: DayOfWeek.FRIDAY,
        start_time: '12:00',
        end_time: '13:00',
      })
      .expect(404);

    expect(JSON.stringify(response.body)).toContain('Session not found');
  });

  it('rejects teacher overlap with a clear teacher conflict payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherAId, 'teacherAId'),
        subject_id: requiredId(state.subjectAId, 'subjectAId'),
        student_group_id: requiredId(state.groupAId, 'groupAId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.MONDAY,
        start_time: '10:30',
        end_time: '11:30',
      })
      .expect(409);

    const conflicts = toConflictItems(response.body);
    expect(conflicts).toEqual([
      {
        type: 'TEACHER_TIME_OVERLAP',
        message: 'Teacher is not available for the selected day/time',
      },
    ]);
  });

  it('rejects private session when teacher is overlapping', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherAId, 'teacherAId'),
        subject_id: requiredId(state.subjectAId, 'subjectAId'),
        student_id: requiredId(state.studentId, 'studentId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.MONDAY,
        start_time: '10:30',
        end_time: '11:30',
      })
      .expect(409);

    const conflicts = toConflictItems(response.body);
    expect(conflicts).toEqual([
      {
        type: 'TEACHER_TIME_OVERLAP',
        message: 'Teacher is not available for the selected day/time',
      },
    ]);
  });

  it('rejects room overlap with a clear room conflict payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_group_id: requiredId(state.groupBId, 'groupBId'),
        room_id: requiredId(state.roomAId, 'roomAId'),
        day: DayOfWeek.MONDAY,
        start_time: '10:30',
        end_time: '11:30',
      })
      .expect(409);

    const conflicts = toConflictItems(response.body);
    expect(conflicts).toEqual([
      {
        type: 'ROOM_TIME_OVERLAP',
        message: 'Room is already booked for the selected day/time',
      },
    ]);
  });

  it('rejects private session when room is overlapping', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_id: requiredId(state.studentId, 'studentId'),
        room_id: requiredId(state.roomAId, 'roomAId'),
        day: DayOfWeek.MONDAY,
        start_time: '10:30',
        end_time: '11:30',
      })
      .expect(409);

    const conflicts = toConflictItems(response.body);
    expect(conflicts).toEqual([
      {
        type: 'ROOM_TIME_OVERLAP',
        message: 'Room is already booked for the selected day/time',
      },
    ]);
  });

  it('rejects private session when student is already in overlapping group session', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherBId, 'teacherBId'),
        subject_id: requiredId(state.subjectBId, 'subjectBId'),
        student_id: requiredId(state.studentEnrolledId, 'studentEnrolledId'),
        room_id: requiredId(state.roomBId, 'roomBId'),
        day: DayOfWeek.MONDAY,
        start_time: '10:30',
        end_time: '11:30',
      })
      .expect(409);

    const conflicts = toConflictItems(response.body);
    expect(conflicts).toEqual([
      {
        type: 'STUDENT_TIME_OVERLAP',
        message: 'Student is not available for the selected day/time',
      },
    ]);
  });

  it('rejects combined teacher + room overlap with both conflict entries', async () => {
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', bearer())
      .send({
        teacher_id: requiredId(state.teacherAId, 'teacherAId'),
        subject_id: requiredId(state.subjectAId, 'subjectAId'),
        student_group_id: requiredId(state.groupAId, 'groupAId'),
        room_id: requiredId(state.roomAId, 'roomAId'),
        day: DayOfWeek.MONDAY,
        start_time: '10:45',
        end_time: '11:15',
      })
      .expect(409);

    const conflicts = toConflictItems(response.body);
    expect(conflicts).toEqual(
      expect.arrayContaining([
        {
          type: 'TEACHER_TIME_OVERLAP',
          message: 'Teacher is not available for the selected day/time',
        },
        {
          type: 'ROOM_TIME_OVERLAP',
          message: 'Room is already booked for the selected day/time',
        },
      ]),
    );
    expect(conflicts).toHaveLength(2);
  });
});
