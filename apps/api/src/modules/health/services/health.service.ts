import { Injectable } from '@nestjs/common';
import { HealthResponseDto } from '../dto/health-response.dto';

@Injectable()
export class HealthService {
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }
}
