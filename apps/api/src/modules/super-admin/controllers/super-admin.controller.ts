import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentSuperAdmin } from '../decorators/current-super-admin.decorator';
import { SuperAdminOnly } from '../decorators/super-admin-only.decorator';
import { SuperAdminLoginDto } from '../dto/super-admin-login.dto';
import { SuperAdminLoginResponseDto } from '../dto/super-admin-login-response.dto';
import { SuperAdminProfileDto } from '../dto/super-admin-profile.dto';
import { SuperAdminService } from '../services/super-admin.service';
import type { AuthenticatedSuperAdmin } from '../types/authenticated-super-admin.type';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Post('login')
  login(
    @Body() payload: SuperAdminLoginDto,
  ): Promise<SuperAdminLoginResponseDto> {
    return this.superAdminService.login(payload);
  }

  @Get('profile')
  @SuperAdminOnly()
  getProfile(
    @CurrentSuperAdmin() superAdmin: AuthenticatedSuperAdmin,
  ): Promise<SuperAdminProfileDto> {
    return this.superAdminService.getProfile(superAdmin.id);
  }
}
