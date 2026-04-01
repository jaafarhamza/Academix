import { Injectable } from '@nestjs/common';
import { CourseSessionStatusResponseDto } from '../dto/course-session-status-response.dto';

@Injectable()
export class CourseSessionService {
  getStatus(): CourseSessionStatusResponseDto {
    return {
      module: 'course-session',
      status: 'ready',
    };
  }
}
