import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';
import {
  SUPER_ADMIN_AUDIENCE,
  SUPER_ADMIN_ISSUER,
} from './constants/super-admin-auth.constants';
import { SuperAdminController } from './controllers/super-admin.controller';
import { SuperAdminJwtAuthGuard } from './guards/super-admin-jwt-auth.guard';
import { SuperAdminJwtStrategy } from './strategies/super-admin-jwt.strategy';
import { SuperAdminService } from './services/super-admin.service';

@Module({
  imports: [
    PassportModule.register({
      session: false,
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = (configService.get<string>(
          'superAdminAuth.jwtExpiresIn',
        ) ?? '1h') as StringValue;

        return {
          secret:
            configService.get<string>('superAdminAuth.jwtSecret') ??
            'change-me',
          signOptions: {
            expiresIn,
            issuer: SUPER_ADMIN_ISSUER,
            audience: SUPER_ADMIN_AUDIENCE,
          },
        };
      },
    }),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, SuperAdminJwtStrategy, SuperAdminJwtAuthGuard],
  exports: [SuperAdminJwtAuthGuard],
})
export class SuperAdminModule {}
