import { Controller, Get } from '@nestjs/common';
import { AuthStatusResponseDto } from '../dto/auth-status-response.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('status')
  getStatus(): AuthStatusResponseDto {
    return this.authService.getStatus();
  }
}
