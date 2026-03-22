import { Body, Controller, Post } from '@nestjs/common';
import { CurrentSuperAdmin } from '../../super-admin/decorators/current-super-admin.decorator';
import { SuperAdminOnly } from '../../super-admin/decorators/super-admin-only.decorator';
import type { AuthenticatedSuperAdmin } from '../../super-admin/types/authenticated-super-admin.type';
import { RegisterCenterDto } from '../dto/register-center.dto';
import { RegisterCenterResponseDto } from '../dto/register-center-response.dto';
import { CenterService } from '../services/center.service';

@Controller('centers')
export class CenterController {
  constructor(private readonly centerService: CenterService) {}

  @Post('register')
  @SuperAdminOnly()
  register(
    @CurrentSuperAdmin() superAdmin: AuthenticatedSuperAdmin,
    @Body() payload: RegisterCenterDto,
  ): Promise<RegisterCenterResponseDto> {
    return this.centerService.register(payload, superAdmin.id);
  }
}
