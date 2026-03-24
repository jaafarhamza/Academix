import { Injectable } from '@nestjs/common';
import { AuthStatusResponseDto } from '../dto/auth-status-response.dto';

@Injectable()
export class AuthService {
  getStatus(): AuthStatusResponseDto {
    return {
      module: 'auth',
      status: 'ready',
    };
  }
}
