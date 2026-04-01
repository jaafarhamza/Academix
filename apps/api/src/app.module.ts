import {
  MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import {
  ThrottlerModule,
  type ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { AppJwtAuthGuard } from './common/guards/app-jwt-auth.guard';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { PrismaModule } from './database/prisma/prisma.module';
import appConfig from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { CenterModule } from './modules/center/center.module';
import { CourseSessionModule } from './modules/course-session/course-session.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { HealthModule } from './modules/health/health.module';
import { RolePermissionModule } from './modules/role-permission/role-permission.module';
import { RoomModule } from './modules/room/room.module';
import { SecretaryModule } from './modules/secretary/secretary.module';
import { StudentModule } from './modules/student/student.module';
import { StudentGroupModule } from './modules/student-group/student-group.module';
import { SubjectModule } from './modules/subject/subject.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { TeacherSubjectModule } from './modules/teacher-subject/teacher-subject.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [appConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => {
        const defaultTtlMs =
          configService.get<number>('throttling.defaultTtlMs') ?? 60_000;
        const defaultLimit =
          configService.get<number>('throttling.defaultLimit') ?? 120;
        const authTtlMs =
          configService.get<number>('throttling.authTtlMs') ?? 60_000;
        const authLimit =
          configService.get<number>('throttling.authLimit') ?? 5;

        return {
          throttlers: [
            {
              ttl: defaultTtlMs,
              limit: defaultLimit,
            },
            {
              name: 'auth',
              ttl: authTtlMs,
              limit: authLimit,
            },
          ],
        };
      },
    }),
    PrismaModule,
    AuthModule,
    CenterModule,
    CourseSessionModule,
    EnrollmentModule,
    HealthModule,
    RolePermissionModule,
    RoomModule,
    SecretaryModule,
    StudentModule,
    StudentGroupModule,
    SubjectModule,
    SuperAdminModule,
    TeacherModule,
    TeacherSubjectModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AppJwtAuthGuard,
    },
    TenantMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
