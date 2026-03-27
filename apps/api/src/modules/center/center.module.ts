import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';
import {
  CENTER_AUDIENCE,
  CENTER_ISSUER,
} from './constants/center-auth.constants';
import { CenterController } from './controllers/center.controller';
import { CenterJwtAuthGuard } from './guards/center-jwt-auth.guard';
import { CenterLogoStorageService } from './services/center-logo-storage.service';
import { CenterService } from './services/center.service';
import { CenterJwtStrategy } from './strategies/center-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({
      session: false,
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = (configService.get<string>(
          'centerAuth.jwtExpiresIn',
        ) ?? '1h') as StringValue;

        return {
          secret:
            configService.get<string>('centerAuth.jwtSecret') ?? 'change-me',
          signOptions: {
            expiresIn,
            issuer: CENTER_ISSUER,
            audience: CENTER_AUDIENCE,
          },
        };
      },
    }),
  ],
  controllers: [CenterController],
  providers: [
    CenterService,
    CenterLogoStorageService,
    CenterJwtStrategy,
    CenterJwtAuthGuard,
  ],
  exports: [CenterJwtAuthGuard],
})
export class CenterModule {}
