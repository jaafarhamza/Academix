import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserJwtAuthGuard } from '../../auth/guards/user-jwt-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreateRolePermissionDto } from '../dto/create-role-permission.dto';
import { QueryRolePermissionDto } from '../dto/query-role-permission.dto';
import { RolePermissionResponseDto } from '../dto/role-permission-response.dto';
import { UpdateRolePermissionDto } from '../dto/update-role-permission.dto';
import { RolePermissionService } from '../services/role-permission.service';

@Controller('role-permissions')
@UseGuards(UserJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class RolePermissionController {
  constructor(private readonly rolePermissionService: RolePermissionService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateRolePermissionDto,
  ): Promise<RolePermissionResponseDto> {
    return this.rolePermissionService.create(user.center_id, payload);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryRolePermissionDto,
  ): Promise<RolePermissionResponseDto[]> {
    return this.rolePermissionService.findAll(user.center_id, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RolePermissionResponseDto> {
    return this.rolePermissionService.findOne(user.center_id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateRolePermissionDto,
  ): Promise<RolePermissionResponseDto> {
    return this.rolePermissionService.update(user.center_id, id, payload);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.rolePermissionService.remove(user.center_id, id);
  }
}
