import { Injectable } from '@nestjs/common';
import { SubjectStatusResponseDto } from '../dto/subject-status-response.dto';

@Injectable()
export class SubjectService {
  getStatus(): SubjectStatusResponseDto {
    return {
      module: 'subject',
      status: 'ready',
    };
  }
}
