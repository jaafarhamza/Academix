import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';
import {
  USER_AUTH_AUDIENCE,
  USER_AUTH_ISSUER,
} from './constants/user-auth.constants';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { UserJwtStrategy } from './strategies/user-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({
      session: false,
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = (configService.get<string>('userAuth.jwtExpiresIn') ??
          '1h') as StringValue;

        return {
          secret:
            configService.get<string>('userAuth.jwtSecret') ?? 'change-me',
          signOptions: {
            expiresIn,
            issuer: USER_AUTH_ISSUER,
            audience: USER_AUTH_AUDIENCE,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
