import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthStatusResponseDto } from '../dto/auth-status-response.dto';
import { UserLoginDto } from '../dto/user-login.dto';
import { UserLoginResponseDto } from '../dto/user-login-response.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() payload: UserLoginDto): Promise<UserLoginResponseDto> {
    return this.authService.login(payload);
  }

  @Get('status')
  getStatus(): AuthStatusResponseDto {
    return this.authService.getStatus();
  }
}
