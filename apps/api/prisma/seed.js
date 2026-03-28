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

const ALL_PERMISSIONS = Object.values(PermissionAction);
const DAY_SEQUENCE = Object.values(DayOfWeek);
const SESSION_STATUS_SEQUENCE = [
  SessionStatus.SCHEDULED,
  SessionStatus.COMPLETED,
  SessionStatus.CANCELLED,
];
const PAYMENT_STATUS_SEQUENCE = [
  PaymentStatus.PAID,
  PaymentStatus.PARTIALLY_PAID,
  PaymentStatus.UNPAID,
];
const NOTIFICATION_TYPE_SEQUENCE = Object.values(NotificationType);
const NOTIFICATION_STATUS_SEQUENCE = [
  NotificationStatus.PENDING,
  NotificationStatus.SENT,
  NotificationStatus.FAILED,
];
const DEDUCTION_TYPE_SEQUENCE = Object.values(DeductionType);

const PRIMARY_YEARS = [
  SchoolYear.FIRST_YEAR,
  SchoolYear.SECOND_YEAR,
  SchoolYear.THIRD_YEAR,
  SchoolYear.FOURTH_YEAR,
  SchoolYear.FIFTH_YEAR,
  SchoolYear.SIXTH_YEAR,
];
const SECONDARY_YEARS = [
  SchoolYear.FIRST_YEAR,
  SchoolYear.SECOND_YEAR,
  SchoolYear.THIRD_YEAR,
];

const CENTER_BLUEPRINTS = [
  {
    code: 'north',
    centerName: 'Atlas Learning Hub',
    subdomain: 'atlas-learning-hub',
    ownerFirstName: 'Karim',
    ownerLastName: 'Bennani',
    email: 'owner.atlas@academix.com',
    phone: '+212600100010',
  },
  {
    code: 'south',
    centerName: 'Nour Education Studio',
    subdomain: 'nour-education-studio',
    ownerFirstName: 'Salma',
    ownerLastName: 'El Idrissi',
    email: 'owner.nour@academix.com',
    phone: '+212600200010',
  },
];

const SECRETARY_FIRST_NAMES = [
  'Amina',
  'Sara',
  'Hajar',
  'Nada',
  'Siham',
  'Lina',
  'Yasmine',
  'Khadija',
];
const TEACHER_FIRST_NAMES = [
  'Youssef',
  'Nadia',
  'Hamza',
  'Ilyas',
  'Meryem',
  'Zakaria',
  'Kawtar',
  'Rachid',
];
const STUDENT_FIRST_NAMES = [
  'Imane',
  'Adam',
  'Aya',
  'Marwan',
  'Yara',
  'Omar',
  'Salim',
  'Rania',
  'Hiba',
  'Yassir',
  'Loubna',
  'Anas',
  'Hind',
  'Samir',
  'Nour',
  'Kenza',
];
const LAST_NAMES = [
  'Alaoui',
  'El Fassi',
  'Benkirane',
  'Mansouri',
  'Tahiri',
  'Amrani',
  'Berrada',
  'Chraibi',
  'Skalli',
  'Mouline',
];
const SCHOOL_NAMES = [
  'Ibn Sina School',
  'Al Khawarizmi School',
  'Ibn Battuta Academy',
  'Al Farabi College',
  'Al Andalus School',
  'Ibn Rushd Institute',
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

  for (const role of [
    UserRole.ADMIN,
    UserRole.SECRETARY,
    UserRole.TEACHER,
    UserRole.STUDENT,
  ]) {
    const granted = DEFAULT_GRANTED_PERMISSIONS_BY_ROLE[role] ?? new Set();

    for (const permission of ALL_PERMISSIONS) {
      rows.push({
        centerId,
        role,
        permission,
        isGranted: granted.has(permission),
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

const decimal = (value, fractionDigits = 2) =>
  Number(value).toFixed(fractionDigits);

const pick = (values, index) => values[index % values.length];

const timeUtc = (hours, minutes) =>
  new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));

const dateOnlyFromOffset = (dayOffset) => {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + dayOffset);
  now.setUTCHours(0, 0, 0, 0);
  return now;
};

const dateTimeFromOffset = (dayOffset, hourOffset = 0, minuteOffset = 0) => {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + dayOffset);
  now.setUTCHours(hourOffset, minuteOffset, 0, 0);
  return now;
};

const buildSessionRange = (index) => {
  const startHour = 8 + (index % 8);
  const startMinute = index % 2 === 0 ? 0 : 30;
  const durationMinutes = index % 3 === 0 ? 90 : 60;

  const endTotalMinutes = startHour * 60 + startMinute + durationMinutes;
  const endHour = Math.floor(endTotalMinutes / 60);
  const endMinute = endTotalMinutes % 60;

  return {
    startTime: timeUtc(startHour, startMinute),
    endTime: timeUtc(endHour, endMinute),
  };
};

const buildGroupSchoolProfile = (index) => {
  const cycle = pick(
    [SchoolCycle.PRIMARY, SchoolCycle.COLLEGE, SchoolCycle.LYCEE],
    index,
  );
  const years = cycle === SchoolCycle.PRIMARY ? PRIMARY_YEARS : SECONDARY_YEARS;

  return {
    schoolCycle: cycle,
    schoolYear: years[Math.floor(index / 2) % years.length],
  };
};

const buildStudentSchoolProfile = (index) => {
  const cycle = pick(
    [SchoolCycle.PRIMARY, SchoolCycle.COLLEGE, SchoolCycle.LYCEE],
    index,
  );
  const years = cycle === SchoolCycle.PRIMARY ? PRIMARY_YEARS : SECONDARY_YEARS;

  return {
    schoolCycle: cycle,
    schoolYear: years[index % years.length],
  };
};

const getPaymentRest = (amount, status) => {
  if (status === PaymentStatus.PAID) {
    return decimal(0, 2);
  }

  if (status === PaymentStatus.PARTIALLY_PAID) {
    return decimal(amount * 0.25, 2);
  }

  return decimal(amount, 2);
};

async function wipeDatabase() {
  console.log('Cleaning existing data...');

  await prisma.notification.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.centerExpense.deleteMany();
  await prisma.centerCost.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.courseSession.deleteMany();
  await prisma.room.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.studentGroup.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();
  await prisma.center.deleteMany();
  await prisma.superAdmin.deleteMany();
}

async function seedCenter(center, centerIndex, passwordHashes) {
  console.log(`Seeding center: ${center.centerName}`);
  const centerCode = center.subdomain.replace(/-/g, '_').toUpperCase();

  const adminUser = await prisma.user.create({
    data: {
      centerId: center.id,
      firstName: center.firstName,
      lastName: center.lastName,
      email: `admin.${center.subdomain}@academix.com`,
      passwordHash: passwordHashes.adminUser,
      phone: `+212611${centerIndex}00001`,
      role: UserRole.ADMIN,
      cin: `ADMIN-${centerIndex + 1}-001`,
      isActive: true,
    },
  });

  const secretaries = [];
  for (let index = 0; index < 3; index += 1) {
    secretaries.push(
      await prisma.user.create({
        data: {
          centerId: center.id,
          firstName: pick(SECRETARY_FIRST_NAMES, centerIndex * 3 + index),
          lastName: pick(LAST_NAMES, centerIndex * 11 + index),
          email: `secretary.${index + 1}.${center.subdomain}@academix.com`,
          passwordHash: passwordHashes.secretary,
          phone: `+212622${centerIndex}00${String(index + 1).padStart(2, '0')}`,
          role: UserRole.SECRETARY,
          cin: `SEC-${centerIndex + 1}-${String(index + 1).padStart(3, '0')}`,
          isActive: true,
        },
      }),
    );
  }

  const teachers = [];
  for (let index = 0; index < 5; index += 1) {
    teachers.push(
      await prisma.user.create({
        data: {
          centerId: center.id,
          firstName: pick(TEACHER_FIRST_NAMES, centerIndex * 7 + index),
          lastName: pick(LAST_NAMES, centerIndex * 13 + index),
          email: `teacher.${index + 1}.${center.subdomain}@academix.com`,
          passwordHash: passwordHashes.teacher,
          phone: `+212633${centerIndex}00${String(index + 1).padStart(2, '0')}`,
          role: UserRole.TEACHER,
          cin: `TEA-${centerIndex + 1}-${String(index + 1).padStart(3, '0')}`,
          hourlyRate: decimal(140 + index * 15, 2),
          maxHoursPerWeek: decimal(16 + index * 2, 2),
          isActive: true,
        },
      }),
    );
  }

  const students = [];
  for (let index = 0; index < 12; index += 1) {
    const profile = buildStudentSchoolProfile(index);

    students.push(
      await prisma.user.create({
        data: {
          centerId: center.id,
          firstName: pick(STUDENT_FIRST_NAMES, centerIndex * 17 + index),
          lastName: pick(LAST_NAMES, centerIndex * 19 + index),
          email: `student.${index + 1}.${center.subdomain}@academix.com`,
          passwordHash: passwordHashes.student,
          phone: `+212644${centerIndex}0${String(index + 1).padStart(3, '0')}`,
          role: UserRole.STUDENT,
          parentPhone: `+212655${centerIndex}0${String(index + 1).padStart(3, '0')}`,
          schoolName: pick(SCHOOL_NAMES, centerIndex * 5 + index),
          schoolCycle: profile.schoolCycle,
          schoolYear: profile.schoolYear,
          isActive: true,
        },
      }),
    );
  }

  const subjects = [];
  for (let index = 0; index < 20; index += 1) {
    subjects.push(
      await prisma.subject.create({
        data: {
          centerId: center.id,
          name: `Subject ${String(index + 1).padStart(2, '0')} - ${centerCode}`,
          description: `Structured program #${index + 1} for ${center.centerName}.`,
        },
      }),
    );
  }

  const teacherSubjects = [];
  for (let index = 0; index < 20; index += 1) {
    teacherSubjects.push(
      await prisma.teacherSubject.create({
        data: {
          teacherId: teachers[index % teachers.length].id,
          subjectId: subjects[index].id,
        },
      }),
    );
  }

  const studentGroups = [];
  for (let index = 0; index < 20; index += 1) {
    const profile = buildGroupSchoolProfile(index);

    studentGroups.push(
      await prisma.studentGroup.create({
        data: {
          centerId: center.id,
          teacherSubjectId: teacherSubjects[index].id,
          name: `Group ${String(index + 1).padStart(2, '0')} ${centerCode}`,
          schoolCycle: profile.schoolCycle,
          schoolYear: profile.schoolYear,
        },
      }),
    );
  }

  const groupStudentMap = new Map();
  for (let index = 0; index < studentGroups.length; index += 1) {
    const group = studentGroups[index];
    const firstStudent = students[index % students.length];
    const secondStudent = students[(index + 5) % students.length];

    await prisma.enrollment.create({
      data: {
        studentId: firstStudent.id,
        studentGroupId: group.id,
        enrollmentDate: dateOnlyFromOffset(-(90 - index)),
        isActive: true,
      },
    });

    await prisma.enrollment.create({
      data: {
        studentId: secondStudent.id,
        studentGroupId: group.id,
        enrollmentDate: dateOnlyFromOffset(-(60 - index)),
        isActive: true,
      },
    });

    groupStudentMap.set(group.id, [firstStudent.id, secondStudent.id]);
  }

  const rooms = [];
  for (let index = 0; index < 20; index += 1) {
    const floor = Math.floor(index / 5) + 1;
    const roomNumber = index % 5;
    const roomName = `Room ${String.fromCharCode(65 + roomNumber)}-${floor}`;

    rooms.push(
      await prisma.room.create({
        data: {
          centerId: center.id,
          floor,
          roomName,
          isAvailable: true,
        },
      }),
    );
  }

  const courseSessions = [];
  for (let index = 0; index < 20; index += 1) {
    const teacherSubject = teacherSubjects[index];
    const group = studentGroups[index];
    const room = rooms[index];
    const isIndividualSession = index % 4 === 0;
    const individualStudent = students[(index * 2) % students.length];
    const range = buildSessionRange(index);

    courseSessions.push(
      await prisma.courseSession.create({
        data: {
          centerId: center.id,
          teacherId: teacherSubject.teacherId,
          subjectId: teacherSubject.subjectId,
          studentId: isIndividualSession ? individualStudent.id : null,
          studentGroupId: isIndividualSession ? null : group.id,
          roomId: room.id,
          day: DAY_SEQUENCE[index % DAY_SEQUENCE.length],
          startTime: range.startTime,
          endTime: range.endTime,
          status: SESSION_STATUS_SEQUENCE[index % SESSION_STATUS_SEQUENCE.length],
        },
      }),
    );
  }

  for (let index = 0; index < 20; index += 1) {
    const session = courseSessions[index];
    let studentId = session.studentId;

    if (!studentId && session.studentGroupId) {
      const assignedStudents = groupStudentMap.get(session.studentGroupId) ?? [];
      studentId = assignedStudents[index % assignedStudents.length] ?? students[0].id;
    }

    const amount = 200 + index * 15;
    const status = PAYMENT_STATUS_SEQUENCE[index % PAYMENT_STATUS_SEQUENCE.length];

    await prisma.payment.create({
      data: {
        centerId: center.id,
        studentId,
        teacherId: session.teacherId,
        studentGroupId: session.studentGroupId,
        courseSessionId: session.id,
        amount: decimal(amount, 2),
        rest: getPaymentRest(amount, status),
        paymentDate: dateTimeFromOffset(-index, 12, 0),
        method: PaymentMethod.CASH,
        status,
        receiptUrl: `https://cdn.academix.com/receipts/${center.subdomain}/payment-${index + 1}.pdf`,
        notes: `Payment generated for seeded session #${index + 1}.`,
      },
    });
  }

  for (let index = 0; index < 20; index += 1) {
    const isGlobal = index < 8;
    const deductionType = DEDUCTION_TYPE_SEQUENCE[index % DEDUCTION_TYPE_SEQUENCE.length];

    let value = decimal(2 + index * 0.25, 4);
    if (deductionType === DeductionType.FIXED_PER_STUDENT) {
      value = decimal(20 + index * 1.5, 4);
    }

    await prisma.centerCost.create({
      data: {
        centerId: center.id,
        teacherId: isGlobal ? null : teachers[index % teachers.length].id,
        name: isGlobal
          ? `Global Cost ${index + 1}`
          : `Teacher Cost ${index + 1}`,
        deductionType,
        scope: isGlobal ? DeductionScope.GLOBAL : DeductionScope.PER_TEACHER,
        value,
        isActive: true,
      },
    });
  }

  const expenseOwners = [adminUser, ...secretaries];
  for (let index = 0; index < 20; index += 1) {
    await prisma.centerExpense.create({
      data: {
        centerId: center.id,
        userId: expenseOwners[index % expenseOwners.length].id,
        amount: decimal(120 + (index % 7) * 45, 2),
        description: `Operational expense ${index + 1} for ${center.centerName}.`,
        date: dateOnlyFromOffset(-(index * 2)),
      },
    });
  }

  await prisma.rolePermission.createMany({
    data: buildDefaultRolePermissionMatrix(center.id),
  });

  const notificationRecipients = [adminUser, ...secretaries, ...teachers, ...students];
  for (let index = 0; index < 20; index += 1) {
    const recipient = notificationRecipients[index % notificationRecipients.length];
    const status = NOTIFICATION_STATUS_SEQUENCE[index % NOTIFICATION_STATUS_SEQUENCE.length];
    const scheduledAt = dateTimeFromOffset(index, 9 + (index % 8), 0);

    await prisma.notification.create({
      data: {
        centerId: center.id,
        recipientId: recipient.id,
        recipientPhone: recipient.phone,
        type: NOTIFICATION_TYPE_SEQUENCE[index % NOTIFICATION_TYPE_SEQUENCE.length],
        message: `Notification ${index + 1} for ${recipient.firstName} ${recipient.lastName}.`,
        status,
        scheduledAt,
        sentAt:
          status === NotificationStatus.SENT
            ? dateTimeFromOffset(index, 9 + (index % 8), 5)
            : null,
      },
    });
  }
}

async function main() {
  console.log('Starting deterministic seed for Academix...');

  const rawPasswords = {
    superAdmin: process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'Academix.SuperAdmin.2026',
    centerAdmin:
      process.env.SEED_CENTER_ADMIN_PASSWORD ?? 'Academix.CenterAdmin.2026',
    adminUser: process.env.SEED_ADMIN_USER_PASSWORD ?? 'Academix.AdminUser.2026',
    secretary: process.env.SEED_SECRETARY_PASSWORD ?? 'Academix.Secretary.2026',
    teacher: process.env.SEED_TEACHER_MATH_PASSWORD ?? 'Academix.Teacher.2026',
    student: process.env.SEED_STUDENT_A_PASSWORD ?? 'Academix.Student.2026',
  };

  const passwordHashes = {
    superAdmin: await hashPassword(rawPasswords.superAdmin),
    centerAdmin: await hashPassword(rawPasswords.centerAdmin),
    adminUser: await hashPassword(rawPasswords.adminUser),
    secretary: await hashPassword(rawPasswords.secretary),
    teacher: await hashPassword(rawPasswords.teacher),
    student: await hashPassword(rawPasswords.student),
  };

  await wipeDatabase();

  const superAdmin = await prisma.superAdmin.create({
    data: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@academix.com',
      phone: '+212600000001',
      passwordHash: passwordHashes.superAdmin,
      isActive: true,
    },
  });

  const centers = [];
  for (const blueprint of CENTER_BLUEPRINTS) {
    centers.push(
      await prisma.center.create({
        data: {
          superAdminId: superAdmin.id,
          firstName: blueprint.ownerFirstName,
          lastName: blueprint.ownerLastName,
          centerName: blueprint.centerName,
          email: blueprint.email,
          passwordHash: passwordHashes.centerAdmin,
          phone: blueprint.phone,
          logoUrl: `https://cdn.academix.com/centers/${blueprint.subdomain}/logo.png`,
          subdomain: blueprint.subdomain,
          isActive: true,
        },
      }),
    );
  }

  for (let index = 0; index < centers.length; index += 1) {
    await seedCenter(centers[index], index, passwordHashes);
  }

  const summary = await Promise.all([
    prisma.superAdmin.count(),
    prisma.center.count(),
    prisma.user.count(),
    prisma.subject.count(),
    prisma.teacherSubject.count(),
    prisma.studentGroup.count(),
    prisma.enrollment.count(),
    prisma.room.count(),
    prisma.courseSession.count(),
    prisma.payment.count(),
    prisma.centerCost.count(),
    prisma.centerExpense.count(),
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
      `teacherSubjects=${summary[4]}`,
      `studentGroups=${summary[5]}`,
      `enrollments=${summary[6]}`,
      `rooms=${summary[7]}`,
      `courseSessions=${summary[8]}`,
      `payments=${summary[9]}`,
      `centerCosts=${summary[10]}`,
      `centerExpenses=${summary[11]}`,
      `rolePermissions=${summary[12]}`,
      `notifications=${summary[13]}`,
    ].join(' | '),
  );

  console.log('Login credentials (dev seed):');
  console.log(`- SuperAdmin: superadmin@academix.com / ${rawPasswords.superAdmin}`);
  console.log(`- CenterAdmin #1: ${CENTER_BLUEPRINTS[0].email} / ${rawPasswords.centerAdmin}`);
  console.log(`- CenterAdmin #2: ${CENTER_BLUEPRINTS[1].email} / ${rawPasswords.centerAdmin}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
