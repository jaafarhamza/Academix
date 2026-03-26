import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserJwtAuthGuard } from '../../auth/guards/user-jwt-auth.guard';
import { SecretaryStatusResponseDto } from '../dto/secretary-status-response.dto';
import { SecretaryService } from '../services/secretary.service';

@Controller('secretaries')
@UseGuards(UserJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SecretaryController {
  constructor(private readonly secretaryService: SecretaryService) {}

  @Get('status')
  getStatus(): SecretaryStatusResponseDto {
    return this.secretaryService.getStatus();
  }
}
