import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import {
  CENTER_AUDIENCE,
  CENTER_ISSUER,
} from './constants/center-auth.constants';
import { CenterController } from './controllers/center.controller';
import { CenterService } from './services/center.service';

@Module({
  imports: [
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
  providers: [CenterService],
})
export class CenterModule {}
