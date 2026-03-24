import { Controller, Get } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { HealthResponseDto } from '../dto/health-response.dto';
import { HealthService } from '../services/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  getHealth(): HealthResponseDto {
    return this.healthService.getHealth();
  }
}
