import { Injectable } from '@nestjs/common';
import { SecretaryStatusResponseDto } from '../dto/secretary-status-response.dto';

@Injectable()
export class SecretaryService {
  getStatus(): SecretaryStatusResponseDto {
    return {
      module: 'secretary',
      status: 'ready',
    };
  }
}
