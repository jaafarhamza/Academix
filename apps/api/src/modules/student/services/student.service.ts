import { Injectable } from '@nestjs/common';
import { StudentStatusResponseDto } from '../dto/student-status-response.dto';

@Injectable()
export class StudentService {
  getStatus(): StudentStatusResponseDto {
    return {
      module: 'student',
      status: 'ready',
    };
  }
}
