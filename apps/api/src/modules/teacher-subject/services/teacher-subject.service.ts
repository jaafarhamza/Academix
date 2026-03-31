import { Injectable } from '@nestjs/common';
import { TeacherSubjectStatusResponseDto } from '../dto/teacher-subject-status-response.dto';

@Injectable()
export class TeacherSubjectService {
  getStatus(): TeacherSubjectStatusResponseDto {
    return {
      module: 'teacher-subject',
      status: 'ready',
    };
  }
}
