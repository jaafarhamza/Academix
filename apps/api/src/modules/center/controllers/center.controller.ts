import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentSuperAdmin } from '../../super-admin/decorators/current-super-admin.decorator';
import { SuperAdminOnly } from '../../super-admin/decorators/super-admin-only.decorator';
import type { AuthenticatedSuperAdmin } from '../../super-admin/types/authenticated-super-admin.type';
import { CenterLoginDto } from '../dto/center-login.dto';
import { CenterLoginResponseDto } from '../dto/center-login-response.dto';
import { RegisterCenterDto } from '../dto/register-center.dto';
import { RegisterCenterResponseDto } from '../dto/register-center-response.dto';
import { CenterService } from '../services/center.service';

@Controller('centers')
export class CenterController {
  constructor(private readonly centerService: CenterService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  login(@Body() payload: CenterLoginDto): Promise<CenterLoginResponseDto> {
    return this.centerService.login(payload);
  }

  @Post('register')
  @SuperAdminOnly()
  register(
    @CurrentSuperAdmin() superAdmin: AuthenticatedSuperAdmin,
    @Body() payload: RegisterCenterDto,
  ): Promise<RegisterCenterResponseDto> {
    return this.centerService.register(payload, superAdmin.id);
  }
}
