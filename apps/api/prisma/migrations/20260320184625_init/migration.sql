-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SECRETARY', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "SchoolCycle" AS ENUM ('PRIMARY', 'COLLEGE', 'LYCEE');

-- CreateEnum
CREATE TYPE "SchoolYear" AS ENUM ('1ER', '2EME', '3EME', '4EME', '5EME', '6EME');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIALLY_PAID', 'UNPAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH');

-- CreateEnum
CREATE TYPE "DeductionType" AS ENUM ('PERCENTAGE_OF_TOTAL', 'PERCENTAGE_PER_STUDENT', 'FIXED_PER_STUDENT');

-- CreateEnum
CREATE TYPE "DeductionScope" AS ENUM ('GLOBAL', 'PER_TEACHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CLASS_REMINDER', 'PAYMENT_CONFIRMATION', 'SCHEDULE_ALERT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('MANAGE_USERS', 'MANAGE_SCHEDULE', 'MANAGE_PAYMENTS', 'MANAGE_ROOMS', 'MANAGE_SUBJECTS', 'MANAGE_GROUPS', 'VIEW_REPORTS', 'MANAGE_COSTS', 'MANAGE_EXPENSES', 'SEND_NOTIFICATIONS');

-- CreateTable
CREATE TABLE "super_admins" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centers" (
    "id" UUID NOT NULL,
    "super_admin_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "center_name" VARCHAR(140) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "logo_url" TEXT,
    "subdomain" VARCHAR(63) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "cin" VARCHAR(32),
    "parent_phone" VARCHAR(32),
    "school_name" VARCHAR(140),
    "school_cycle" "SchoolCycle",
    "school_year" "SchoolYear",
    "hourly_rate" DECIMAL(10,2),
    "max_hours_per_week" DECIMAL(5,2),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_subjects" (
    "id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,

    CONSTRAINT "teacher_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_groups" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "teacher_subject_id" UUID NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "school_cycle" "SchoolCycle" NOT NULL,
    "school_year" "SchoolYear" NOT NULL,

    CONSTRAINT "student_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "student_group_id" UUID NOT NULL,
    "enrollment_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "floor" INTEGER NOT NULL,
    "room_name" VARCHAR(80) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_sessions" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "student_id" UUID,
    "student_group_id" UUID,
    "room_id" UUID NOT NULL,
    "day" "DayOfWeek" NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "course_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "student_group_id" UUID,
    "course_session_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "rest" DECIMAL(12,2) NOT NULL,
    "payment_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "PaymentStatus" NOT NULL,
    "receipt_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_costs" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "teacher_id" UUID,
    "name" VARCHAR(140) NOT NULL,
    "deduction_type" "DeductionType" NOT NULL,
    "scope" "DeductionScope" NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "center_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_expenses" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "center_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "permission" "PermissionAction" NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipient_phone" VARCHAR(32) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE INDEX "super_admins_is_active_idx" ON "super_admins"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "centers_email_key" ON "centers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "centers_subdomain_key" ON "centers"("subdomain");

-- CreateIndex
CREATE INDEX "centers_super_admin_id_idx" ON "centers"("super_admin_id");

-- CreateIndex
CREATE INDEX "centers_is_active_idx" ON "centers"("is_active");

-- CreateIndex
CREATE INDEX "users_center_id_role_idx" ON "users"("center_id", "role");

-- CreateIndex
CREATE INDEX "users_center_id_is_active_idx" ON "users"("center_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_center_id_email_key" ON "users"("center_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_center_id_cin_key" ON "users"("center_id", "cin");

-- CreateIndex
CREATE INDEX "subjects_center_id_idx" ON "subjects"("center_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_center_id_name_key" ON "subjects"("center_id", "name");

-- CreateIndex
CREATE INDEX "teacher_subjects_teacher_id_idx" ON "teacher_subjects"("teacher_id");

-- CreateIndex
CREATE INDEX "teacher_subjects_subject_id_idx" ON "teacher_subjects"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_subjects_teacher_id_subject_id_key" ON "teacher_subjects"("teacher_id", "subject_id");

-- CreateIndex
CREATE INDEX "student_groups_center_id_idx" ON "student_groups"("center_id");

-- CreateIndex
CREATE INDEX "student_groups_teacher_subject_id_idx" ON "student_groups"("teacher_subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_groups_center_name_cycle_year_key" ON "student_groups"("center_id", "name", "school_cycle", "school_year");

-- CreateIndex
CREATE INDEX "enrollments_student_id_is_active_idx" ON "enrollments"("student_id", "is_active");

-- CreateIndex
CREATE INDEX "enrollments_student_group_id_is_active_idx" ON "enrollments"("student_group_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_student_id_student_group_id_key" ON "enrollments"("student_id", "student_group_id");

-- CreateIndex
CREATE INDEX "rooms_center_id_is_available_idx" ON "rooms"("center_id", "is_available");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_center_id_floor_room_name_key" ON "rooms"("center_id", "floor", "room_name");

-- CreateIndex
CREATE INDEX "course_sessions_center_id_day_idx" ON "course_sessions"("center_id", "day");

-- CreateIndex
CREATE INDEX "course_sessions_center_teacher_day_time_idx" ON "course_sessions"("center_id", "teacher_id", "day", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "course_sessions_center_room_day_time_idx" ON "course_sessions"("center_id", "room_id", "day", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "course_sessions_center_group_day_time_idx" ON "course_sessions"("center_id", "student_group_id", "day", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "payments_center_id_payment_date_idx" ON "payments"("center_id", "payment_date");

-- CreateIndex
CREATE INDEX "payments_center_status_payment_date_idx" ON "payments"("center_id", "status", "payment_date");

-- CreateIndex
CREATE INDEX "payments_student_id_payment_date_idx" ON "payments"("student_id", "payment_date");

-- CreateIndex
CREATE INDEX "payments_teacher_id_payment_date_idx" ON "payments"("teacher_id", "payment_date");

-- CreateIndex
CREATE INDEX "payments_student_group_id_idx" ON "payments"("student_group_id");

-- CreateIndex
CREATE INDEX "payments_course_session_id_idx" ON "payments"("course_session_id");

-- CreateIndex
CREATE INDEX "center_costs_center_id_is_active_idx" ON "center_costs"("center_id", "is_active");

-- CreateIndex
CREATE INDEX "center_costs_center_scope_is_active_idx" ON "center_costs"("center_id", "scope", "is_active");

-- CreateIndex
CREATE INDEX "center_costs_teacher_id_idx" ON "center_costs"("teacher_id");

-- CreateIndex
CREATE INDEX "center_expenses_center_id_date_idx" ON "center_expenses"("center_id", "date");

-- CreateIndex
CREATE INDEX "center_expenses_user_id_date_idx" ON "center_expenses"("user_id", "date");

-- CreateIndex
CREATE INDEX "role_permissions_center_id_role_idx" ON "role_permissions"("center_id", "role");

-- CreateIndex
CREATE INDEX "role_permissions_center_id_permission_idx" ON "role_permissions"("center_id", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_center_role_permission_key" ON "role_permissions"("center_id", "role", "permission");

-- CreateIndex
CREATE INDEX "notifications_center_status_scheduled_idx" ON "notifications"("center_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_status_scheduled_idx" ON "notifications"("recipient_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "notifications_center_type_created_idx" ON "notifications"("center_id", "type", "created_at");

-- AddForeignKey
ALTER TABLE "centers" ADD CONSTRAINT "centers_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_groups" ADD CONSTRAINT "student_groups_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_groups" ADD CONSTRAINT "student_groups_teacher_subject_id_fkey" FOREIGN KEY ("teacher_subject_id") REFERENCES "teacher_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_group_id_fkey" FOREIGN KEY ("student_group_id") REFERENCES "student_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_student_group_id_fkey" FOREIGN KEY ("student_group_id") REFERENCES "student_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_group_id_fkey" FOREIGN KEY ("student_group_id") REFERENCES "student_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "course_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_costs" ADD CONSTRAINT "center_costs_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_costs" ADD CONSTRAINT "center_costs_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_expenses" ADD CONSTRAINT "center_expenses_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_expenses" ADD CONSTRAINT "center_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
