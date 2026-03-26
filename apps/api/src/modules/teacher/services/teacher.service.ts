import { Injectable } from '@nestjs/common';
import { TeacherStatusResponseDto } from '../dto/teacher-status-response.dto';

@Injectable()
export class TeacherService {
  getStatus(): TeacherStatusResponseDto {
    return {
      module: 'teacher',
      status: 'ready',
    };
  }
}
