import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../common/decorators/public.decorator';
import { AuthStatusResponseDto } from '../dto/auth-status-response.dto';
import { UserLoginDto } from '../dto/user-login.dto';
import { UserLoginResponseDto } from '../dto/user-login-response.dto';
import { UserRefreshTokenDto } from '../dto/user-refresh-token.dto';
import { UserJwtAuthGuard } from '../guards/user-jwt-auth.guard';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  login(@Body() payload: UserLoginDto): Promise<UserLoginResponseDto> {
    return this.authService.login(payload);
  }

  @Post('refresh')
  @Public()
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  refresh(@Body() payload: UserRefreshTokenDto): Promise<UserLoginResponseDto> {
    return this.authService.refresh(payload);
  }

  @Get('status')
  @UseGuards(UserJwtAuthGuard)
  getStatus(): AuthStatusResponseDto {
    return this.authService.getStatus();
  }
}
