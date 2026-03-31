import { Injectable } from '@nestjs/common';
import { StudentGroupStatusResponseDto } from '../dto/student-group-status-response.dto';

@Injectable()
export class StudentGroupService {
  getStatus(): StudentGroupStatusResponseDto {
    return {
      module: 'student-group',
      status: 'ready',
    };
  }
}
