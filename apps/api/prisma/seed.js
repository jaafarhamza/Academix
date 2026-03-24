require('dotenv/config');

const { randomBytes, scrypt: scryptCallback } = require('node:crypto');
const { promisify } = require('node:util');
const { PrismaPg } = require('@prisma/adapter-pg');

const {
  PrismaClient,
  UserRole,
  SchoolCycle,
  SchoolYear,
  DayOfWeek,
  SessionStatus,
  PaymentStatus,
  PaymentMethod,
  DeductionType,
  DeductionScope,
  NotificationType,
  NotificationStatus,
  PermissionAction,
} = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run seed script.');
}

const scrypt = promisify(scryptCallback);

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 1 << 17,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const timeUtc = (hours, minutes) =>
  new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));

const dateUtc = (isoDate) => new Date(`${isoDate}T00:00:00.000Z`);

const ALL_PERMISSIONS = Object.values(PermissionAction);

const USER_ROLES_FOR_PERMISSION_SEED = [
  UserRole.ADMIN,
  UserRole.SECRETARY,
  UserRole.TEACHER,
  UserRole.STUDENT,
];

const DEFAULT_GRANTED_PERMISSIONS_BY_ROLE = {
  [UserRole.ADMIN]: new Set(ALL_PERMISSIONS),
  [UserRole.SECRETARY]: new Set([
    PermissionAction.MANAGE_USERS,
    PermissionAction.MANAGE_SCHEDULE,
    PermissionAction.MANAGE_PAYMENTS,
    PermissionAction.MANAGE_GROUPS,
    PermissionAction.SEND_NOTIFICATIONS,
  ]),
  [UserRole.TEACHER]: new Set([PermissionAction.VIEW_REPORTS]),
  [UserRole.STUDENT]: new Set([PermissionAction.VIEW_REPORTS]),
};

const buildDefaultRolePermissionMatrix = (centerId) => {
  const rows = [];

  for (const role of USER_ROLES_FOR_PERMISSION_SEED) {
    const grantedPermissions =
      DEFAULT_GRANTED_PERMISSIONS_BY_ROLE[role] ?? new Set();

    for (const permission of ALL_PERMISSIONS) {
      rows.push({
        centerId,
        role,
        permission,
        isGranted: grantedPermissions.has(permission),
      });
    }
  }

  return rows;
};

const hashPassword = async (plainPassword) => {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(
    plainPassword,
    salt,
    SCRYPT_KEY_LENGTH,
    SCRYPT_OPTIONS,
  );
  return `${SCRYPT_PREFIX}$${salt}$${derivedKey.toString('hex')}`;
};

async function main() {
  console.log('Seeding database...');

  const rawPasswords = {
    superAdmin: process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'Academix.SuperAdmin.2026',
    centerAdmin:
      process.env.SEED_CENTER_ADMIN_PASSWORD ?? 'Academix.CenterAdmin.2026',
    adminUser: process.env.SEED_ADMIN_USER_PASSWORD ?? 'Academix.AdminUser.2026',
    secretary: process.env.SEED_SECRETARY_PASSWORD ?? 'Academix.Secretary.2026',
    teacherMath:
      process.env.SEED_TEACHER_MATH_PASSWORD ?? 'Academix.TeacherMath.2026',
    teacherPhysics:
      process.env.SEED_TEACHER_PHYSICS_PASSWORD ??
      'Academix.TeacherPhysics.2026',
    studentA: process.env.SEED_STUDENT_A_PASSWORD ?? 'Academix.StudentA.2026',
    studentB: process.env.SEED_STUDENT_B_PASSWORD ?? 'Academix.StudentB.2026',
  };

  const passwordHashes = {
    superAdmin: await hashPassword(rawPasswords.superAdmin),
    centerAdmin: await hashPassword(rawPasswords.centerAdmin),
    adminUser: await hashPassword(rawPasswords.adminUser),
    secretary: await hashPassword(rawPasswords.secretary),
    teacherMath: await hashPassword(rawPasswords.teacherMath),
    teacherPhysics: await hashPassword(rawPasswords.teacherPhysics),
    studentA: await hashPassword(rawPasswords.studentA),
    studentB: await hashPassword(rawPasswords.studentB),
  };

  console.log('Seed auth defaults (dev only):');
  console.log(`- superadmin@academix.com / ${rawPasswords.superAdmin}`);
  console.log(`- admin@academix-demo.com / ${rawPasswords.centerAdmin}`);

  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'superadmin@academix.com' },
    update: {
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+212600000001',
      passwordHash: passwordHashes.superAdmin,
      isActive: true,
    },
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@academix.com',
      phone: '+212600000001',
      passwordHash: passwordHashes.superAdmin,
      isActive: true,
    },
  });

  const center = await prisma.center.upsert({
    where: { subdomain: 'academix-demo' },
    update: {
      superAdminId: superAdmin.id,
      firstName: 'Center',
      lastName: 'Owner',
      centerName: 'Academix Demo Center',
      email: 'admin@academix-demo.com',
      phone: '+212600000010',
      logoUrl: 'https://example.com/assets/academix-center-logo.png',
      passwordHash: passwordHashes.centerAdmin,
      isActive: true,
    },
    create: {
      superAdminId: superAdmin.id,
      firstName: 'Center',
      lastName: 'Owner',
      centerName: 'Academix Demo Center',
      email: 'admin@academix-demo.com',
      phone: '+212600000010',
      logoUrl: 'https://example.com/assets/academix-center-logo.png',
      passwordHash: passwordHashes.centerAdmin,
      subdomain: 'academix-demo',
      isActive: true,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: {
      centerId_email: {
        centerId: center.id,
        email: 'admin@academix-demo.com',
      },
    },
    update: {
      firstName: 'Center',
      lastName: 'Admin',
      phone: '+212600000011',
      passwordHash: passwordHashes.adminUser,
      role: UserRole.ADMIN,
      cin: 'CIN-ADMIN-001',
      isActive: true,
    },
    create: {
      centerId: center.id,
      firstName: 'Center',
      lastName: 'Admin',
      email: 'admin@academix-demo.com',
      passwordHash: passwordHashes.adminUser,
      phone: '+212600000011',
      role: UserRole.ADMIN,
      cin: 'CIN-ADMIN-001',
      isActive: true,
    },
  });

  const secretaryUser = await prisma.user.upsert({
    where: {
      centerId_email: {
        centerId: center.id,
        email: 'secretary@academix-demo.com',
      },
    },
    update: {
      firstName: 'Sara',
      lastName: 'Secretary',
      phone: '+212600000012',
      passwordHash: passwordHashes.secretary,
      role: UserRole.SECRETARY,
      cin: 'CIN-SEC-001',
      isActive: true,
    },
    create: {
      centerId: center.id,
      firstName: 'Sara',
      lastName: 'Secretary',
      email: 'secretary@academix-demo.com',
      passwordHash: passwordHashes.secretary,
      phone: '+212600000012',
      role: UserRole.SECRETARY,
      cin: 'CIN-SEC-001',
      isActive: true,
    },
  });

  const teacherMath = await prisma.user.upsert({
    where: {
      centerId_email: {
        centerId: center.id,
        email: 'teacher.math@academix-demo.com',
      },
    },
    update: {
      firstName: 'Youssef',
      lastName: 'Math',
      phone: '+212600000021',
      passwordHash: passwordHashes.teacherMath,
      role: UserRole.TEACHER,
      cin: 'CIN-TEA-001',
      hourlyRate: '180.00',
      maxHoursPerWeek: '20.00',
      isActive: true,
    },
    create: {
      centerId: center.id,
      firstName: 'Youssef',
      lastName: 'Math',
      email: 'teacher.math@academix-demo.com',
      passwordHash: passwordHashes.teacherMath,
      phone: '+212600000021',
      role: UserRole.TEACHER,
      cin: 'CIN-TEA-001',
      hourlyRate: '180.00',
      maxHoursPerWeek: '20.00',
      isActive: true,
    },
  });

  const teacherPhysics = await prisma.user.upsert({
    where: {
      centerId_email: {
        centerId: center.id,
        email: 'teacher.physics@academix-demo.com',
      },
    },
    update: {
      firstName: 'Nadia',
      lastName: 'Physics',
      phone: '+212600000022',
      passwordHash: passwordHashes.teacherPhysics,
      role: UserRole.TEACHER,
      cin: 'CIN-TEA-002',
      hourlyRate: '200.00',
      maxHoursPerWeek: '18.00',
      isActive: true,
    },
    create: {
      centerId: center.id,
      firstName: 'Nadia',
      lastName: 'Physics',
      email: 'teacher.physics@academix-demo.com',
      passwordHash: passwordHashes.teacherPhysics,
      phone: '+212600000022',
      role: UserRole.TEACHER,
      cin: 'CIN-TEA-002',
      hourlyRate: '200.00',
      maxHoursPerWeek: '18.00',
      isActive: true,
    },
  });

  const studentA = await prisma.user.upsert({
    where: {
      centerId_email: {
        centerId: center.id,
        email: 'student.a@academix-demo.com',
      },
    },
    update: {
      firstName: 'Imane',
      lastName: 'Student',
      phone: '+212600000031',
      passwordHash: passwordHashes.studentA,
      role: UserRole.STUDENT,
      parentPhone: '+212600000901',
      schoolName: 'Ibn Sina School',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.SECOND_YEAR,
      isActive: true,
    },
    create: {
      centerId: center.id,
      firstName: 'Imane',
      lastName: 'Student',
      email: 'student.a@academix-demo.com',
      passwordHash: passwordHashes.studentA,
      phone: '+212600000031',
      role: UserRole.STUDENT,
      parentPhone: '+212600000901',
      schoolName: 'Ibn Sina School',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.SECOND_YEAR,
      isActive: true,
    },
  });

  const studentB = await prisma.user.upsert({
    where: {
      centerId_email: {
        centerId: center.id,
        email: 'student.b@academix-demo.com',
      },
    },
    update: {
      firstName: 'Adam',
      lastName: 'Student',
      phone: '+212600000032',
      passwordHash: passwordHashes.studentB,
      role: UserRole.STUDENT,
      parentPhone: '+212600000902',
      schoolName: 'Al Khawarizmi School',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.SECOND_YEAR,
      isActive: true,
    },
    create: {
      centerId: center.id,
      firstName: 'Adam',
      lastName: 'Student',
      email: 'student.b@academix-demo.com',
      passwordHash: passwordHashes.studentB,
      phone: '+212600000032',
      role: UserRole.STUDENT,
      parentPhone: '+212600000902',
      schoolName: 'Al Khawarizmi School',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.SECOND_YEAR,
      isActive: true,
    },
  });

  const mathSubject = await prisma.subject.upsert({
    where: {
      centerId_name: {
        centerId: center.id,
        name: 'Mathematics',
      },
    },
    update: {
      description: 'Mathematics support sessions for middle school students.',
    },
    create: {
      centerId: center.id,
      name: 'Mathematics',
      description: 'Mathematics support sessions for middle school students.',
    },
  });

  const physicsSubject = await prisma.subject.upsert({
    where: {
      centerId_name: {
        centerId: center.id,
        name: 'Physics',
      },
    },
    update: {
      description: 'Physics fundamentals with exercises and exam prep.',
    },
    create: {
      centerId: center.id,
      name: 'Physics',
      description: 'Physics fundamentals with exercises and exam prep.',
    },
  });

  const teacherMathSubject = await prisma.teacherSubject.upsert({
    where: {
      teacherId_subjectId: {
        teacherId: teacherMath.id,
        subjectId: mathSubject.id,
      },
    },
    update: {},
    create: {
      teacherId: teacherMath.id,
      subjectId: mathSubject.id,
    },
  });

  const teacherPhysicsSubject = await prisma.teacherSubject.upsert({
    where: {
      teacherId_subjectId: {
        teacherId: teacherPhysics.id,
        subjectId: physicsSubject.id,
      },
    },
    update: {},
    create: {
      teacherId: teacherPhysics.id,
      subjectId: physicsSubject.id,
    },
  });

  const scienceGroup = await prisma.studentGroup.upsert({
    where: {
      centerId_name_schoolCycle_schoolYear: {
        centerId: center.id,
        name: 'Group COLLEGE 2 - A',
        schoolCycle: SchoolCycle.COLLEGE,
        schoolYear: SchoolYear.SECOND_YEAR,
      },
    },
    update: {
      teacherSubjectId: teacherMathSubject.id,
    },
    create: {
      centerId: center.id,
      teacherSubjectId: teacherMathSubject.id,
      name: 'Group COLLEGE 2 - A',
      schoolCycle: SchoolCycle.COLLEGE,
      schoolYear: SchoolYear.SECOND_YEAR,
    },
  });

  await prisma.enrollment.upsert({
    where: {
      studentId_studentGroupId: {
        studentId: studentA.id,
        studentGroupId: scienceGroup.id,
      },
    },
    update: {
      isActive: true,
      enrollmentDate: dateUtc('2026-03-01'),
    },
    create: {
      studentId: studentA.id,
      studentGroupId: scienceGroup.id,
      enrollmentDate: dateUtc('2026-03-01'),
      isActive: true,
    },
  });

  await prisma.enrollment.upsert({
    where: {
      studentId_studentGroupId: {
        studentId: studentB.id,
        studentGroupId: scienceGroup.id,
      },
    },
    update: {
      isActive: true,
      enrollmentDate: dateUtc('2026-03-02'),
    },
    create: {
      studentId: studentB.id,
      studentGroupId: scienceGroup.id,
      enrollmentDate: dateUtc('2026-03-02'),
      isActive: true,
    },
  });

  const roomA = await prisma.room.upsert({
    where: {
      centerId_floor_roomName: {
        centerId: center.id,
        floor: 1,
        roomName: 'Room A1',
      },
    },
    update: {
      isAvailable: true,
    },
    create: {
      centerId: center.id,
      floor: 1,
      roomName: 'Room A1',
      isAvailable: true,
    },
  });

  const roomB = await prisma.room.upsert({
    where: {
      centerId_floor_roomName: {
        centerId: center.id,
        floor: 1,
        roomName: 'Room B1',
      },
    },
    update: {
      isAvailable: true,
    },
    create: {
      centerId: center.id,
      floor: 1,
      roomName: 'Room B1',
      isAvailable: true,
    },
  });

  const groupSessionId = '11111111-1111-1111-1111-111111111001';
  const individualSessionId = '11111111-1111-1111-1111-111111111002';
  const groupPaymentId = '11111111-1111-1111-1111-111111111101';
  const individualPaymentId = '11111111-1111-1111-1111-111111111102';
  const globalCostId = '11111111-1111-1111-1111-111111111201';
  const teacherCostId = '11111111-1111-1111-1111-111111111202';
  const expenseId = '11111111-1111-1111-1111-111111111301';
  const notificationAId = '11111111-1111-1111-1111-111111111401';
  const notificationBId = '11111111-1111-1111-1111-111111111402';

  const groupSession = await prisma.courseSession.upsert({
    where: { id: groupSessionId },
    update: {
      centerId: center.id,
      teacherId: teacherMath.id,
      subjectId: mathSubject.id,
      studentId: null,
      studentGroupId: scienceGroup.id,
      roomId: roomA.id,
      day: DayOfWeek.MONDAY,
      startTime: timeUtc(9, 0),
      endTime: timeUtc(10, 30),
      status: SessionStatus.SCHEDULED,
    },
    create: {
      id: groupSessionId,
      centerId: center.id,
      teacherId: teacherMath.id,
      subjectId: mathSubject.id,
      studentGroupId: scienceGroup.id,
      roomId: roomA.id,
      day: DayOfWeek.MONDAY,
      startTime: timeUtc(9, 0),
      endTime: timeUtc(10, 30),
      status: SessionStatus.SCHEDULED,
    },
  });

  const individualSession = await prisma.courseSession.upsert({
    where: { id: individualSessionId },
    update: {
      centerId: center.id,
      teacherId: teacherPhysics.id,
      subjectId: physicsSubject.id,
      studentId: studentA.id,
      studentGroupId: null,
      roomId: roomB.id,
      day: DayOfWeek.WEDNESDAY,
      startTime: timeUtc(14, 0),
      endTime: timeUtc(15, 0),
      status: SessionStatus.SCHEDULED,
    },
    create: {
      id: individualSessionId,
      centerId: center.id,
      teacherId: teacherPhysics.id,
      subjectId: physicsSubject.id,
      studentId: studentA.id,
      roomId: roomB.id,
      day: DayOfWeek.WEDNESDAY,
      startTime: timeUtc(14, 0),
      endTime: timeUtc(15, 0),
      status: SessionStatus.SCHEDULED,
    },
  });

  await prisma.payment.upsert({
    where: { id: groupPaymentId },
    update: {
      centerId: center.id,
      studentId: studentA.id,
      teacherId: teacherMath.id,
      studentGroupId: scienceGroup.id,
      courseSessionId: groupSession.id,
      amount: '450.00',
      rest: '50.00',
      status: PaymentStatus.PARTIALLY_PAID,
      method: PaymentMethod.CASH,
      notes: 'Group monthly payment - partially settled.',
    },
    create: {
      id: groupPaymentId,
      centerId: center.id,
      studentId: studentA.id,
      teacherId: teacherMath.id,
      studentGroupId: scienceGroup.id,
      courseSessionId: groupSession.id,
      amount: '450.00',
      rest: '50.00',
      status: PaymentStatus.PARTIALLY_PAID,
      method: PaymentMethod.CASH,
      notes: 'Group monthly payment - partially settled.',
    },
  });

  await prisma.payment.upsert({
    where: { id: individualPaymentId },
    update: {
      centerId: center.id,
      studentId: studentB.id,
      teacherId: teacherPhysics.id,
      studentGroupId: null,
      courseSessionId: individualSession.id,
      amount: '200.00',
      rest: '0.00',
      status: PaymentStatus.PAID,
      method: PaymentMethod.CASH,
      notes: 'Individual session payment - fully paid.',
    },
    create: {
      id: individualPaymentId,
      centerId: center.id,
      studentId: studentB.id,
      teacherId: teacherPhysics.id,
      courseSessionId: individualSession.id,
      amount: '200.00',
      rest: '0.00',
      status: PaymentStatus.PAID,
      method: PaymentMethod.CASH,
      notes: 'Individual session payment - fully paid.',
    },
  });

  await prisma.centerCost.upsert({
    where: { id: globalCostId },
    update: {
      centerId: center.id,
      teacherId: null,
      name: 'Platform maintenance',
      deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: '3.5000',
      isActive: true,
    },
    create: {
      id: globalCostId,
      centerId: center.id,
      name: 'Platform maintenance',
      deductionType: DeductionType.PERCENTAGE_OF_TOTAL,
      scope: DeductionScope.GLOBAL,
      value: '3.5000',
      isActive: true,
    },
  });

  await prisma.centerCost.upsert({
    where: { id: teacherCostId },
    update: {
      centerId: center.id,
      teacherId: teacherMath.id,
      name: 'Teacher insurance',
      deductionType: DeductionType.FIXED_PER_STUDENT,
      scope: DeductionScope.PER_TEACHER,
      value: '25.0000',
      isActive: true,
    },
    create: {
      id: teacherCostId,
      centerId: center.id,
      teacherId: teacherMath.id,
      name: 'Teacher insurance',
      deductionType: DeductionType.FIXED_PER_STUDENT,
      scope: DeductionScope.PER_TEACHER,
      value: '25.0000',
      isActive: true,
    },
  });

  await prisma.centerExpense.upsert({
    where: { id: expenseId },
    update: {
      centerId: center.id,
      userId: secretaryUser.id,
      amount: '1200.00',
      description: 'Projector replacement for Room A1.',
      date: dateUtc('2026-03-05'),
    },
    create: {
      id: expenseId,
      centerId: center.id,
      userId: secretaryUser.id,
      amount: '1200.00',
      description: 'Projector replacement for Room A1.',
      date: dateUtc('2026-03-05'),
    },
  });

  const rolePermissionRows = buildDefaultRolePermissionMatrix(center.id);
  await prisma.$transaction(
    rolePermissionRows.map((row) =>
      prisma.rolePermission.upsert({
        where: {
          centerId_role_permission: {
            centerId: row.centerId,
            role: row.role,
            permission: row.permission,
          },
        },
        update: {
          isGranted: row.isGranted,
        },
        create: row,
      }),
    ),
  );

  await prisma.notification.upsert({
    where: { id: notificationAId },
    update: {
      centerId: center.id,
      recipientId: studentA.id,
      type: NotificationType.CLASS_REMINDER,
      recipientPhone: studentA.phone,
      message: 'Reminder: Mathematics class starts tomorrow at 09:00.',
      status: NotificationStatus.PENDING,
      scheduledAt: new Date('2026-03-21T08:00:00.000Z'),
      sentAt: null,
    },
    create: {
      id: notificationAId,
      centerId: center.id,
      recipientId: studentA.id,
      type: NotificationType.CLASS_REMINDER,
      recipientPhone: studentA.phone,
      message: 'Reminder: Mathematics class starts tomorrow at 09:00.',
      status: NotificationStatus.PENDING,
      scheduledAt: new Date('2026-03-21T08:00:00.000Z'),
    },
  });

  await prisma.notification.upsert({
    where: { id: notificationBId },
    update: {
      centerId: center.id,
      recipientId: studentB.id,
      type: NotificationType.PAYMENT_CONFIRMATION,
      recipientPhone: studentB.phone,
      message: 'Your payment for the individual physics session has been received.',
      status: NotificationStatus.SENT,
      scheduledAt: new Date('2026-03-20T12:00:00.000Z'),
      sentAt: new Date('2026-03-20T12:01:00.000Z'),
    },
    create: {
      id: notificationBId,
      centerId: center.id,
      recipientId: studentB.id,
      type: NotificationType.PAYMENT_CONFIRMATION,
      recipientPhone: studentB.phone,
      message: 'Your payment for the individual physics session has been received.',
      status: NotificationStatus.SENT,
      scheduledAt: new Date('2026-03-20T12:00:00.000Z'),
      sentAt: new Date('2026-03-20T12:01:00.000Z'),
    },
  });

  const summary = await Promise.all([
    prisma.superAdmin.count(),
    prisma.center.count(),
    prisma.user.count(),
    prisma.subject.count(),
    prisma.studentGroup.count(),
    prisma.courseSession.count(),
    prisma.payment.count(),
    prisma.rolePermission.count(),
    prisma.notification.count(),
  ]);

  console.log('Seed completed successfully.');
  console.log(
    [
      `superAdmins=${summary[0]}`,
      `centers=${summary[1]}`,
      `users=${summary[2]}`,
      `subjects=${summary[3]}`,
      `studentGroups=${summary[4]}`,
      `courseSessions=${summary[5]}`,
      `payments=${summary[6]}`,
      `rolePermissions=${summary[7]}`,
      `notifications=${summary[8]}`,
    ].join(' | '),
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
