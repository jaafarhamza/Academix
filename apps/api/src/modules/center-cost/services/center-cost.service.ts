import { Injectable } from '@nestjs/common';
import { CenterCostStatusResponseDto } from '../dto/center-cost-status-response.dto';

@Injectable()
export class CenterCostService {
  getStatus(): CenterCostStatusResponseDto {
    return {
      module: 'center-cost',
      status: 'ready',
    };
  }
}
