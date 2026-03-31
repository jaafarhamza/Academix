import { Injectable } from '@nestjs/common';
import { EnrollmentStatusResponseDto } from '../dto/enrollment-status-response.dto';

@Injectable()
export class EnrollmentService {
  getStatus(): EnrollmentStatusResponseDto {
    return {
      module: 'enrollment',
      status: 'ready',
    };
  }
}
