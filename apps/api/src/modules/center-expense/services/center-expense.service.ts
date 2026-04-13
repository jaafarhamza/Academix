import { Injectable } from '@nestjs/common';
import { CenterExpenseStatusResponseDto } from '../dto/center-expense-status-response.dto';

@Injectable()
export class CenterExpenseService {
  getStatus(): CenterExpenseStatusResponseDto {
    return {
      module: 'center-expense',
      status: 'ready',
    };
  }
}
