import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateRolePermissionDto } from '../dto/create-role-permission.dto';
import { QueryRolePermissionDto } from '../dto/query-role-permission.dto';
import { RolePermissionResponseDto } from '../dto/role-permission-response.dto';
import { UpdateRolePermissionDto } from '../dto/update-role-permission.dto';

@Injectable()
export class RolePermissionService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    centerId: string,
    payload: CreateRolePermissionDto,
  ): Promise<RolePermissionResponseDto> {
    try {
      const permission = await this.prismaService.rolePermission.create({
        data: {
          centerId,
          role: payload.role,
          permission: payload.permission,
          isGranted: payload.isGranted ?? false,
        },
        select: {
          id: true,
          centerId: true,
          role: true,
          permission: true,
          isGranted: true,
        },
      });

      return this.toResponse(permission);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Role permission already exists for this center',
        );
      }
      throw error;
    }
  }

  async findAll(
    centerId: string,
    query: QueryRolePermissionDto,
  ): Promise<RolePermissionResponseDto[]> {
    const permissions = await this.prismaService.rolePermission.findMany({
      where: {
        centerId,
        ...(query.role ? { role: query.role } : {}),
        ...(query.permission ? { permission: query.permission } : {}),
      },
      orderBy: [{ role: 'asc' }, { permission: 'asc' }],
      select: {
        id: true,
        centerId: true,
        role: true,
        permission: true,
        isGranted: true,
      },
    });

    return permissions.map((permission) => this.toResponse(permission));
  }

  async findOne(
    centerId: string,
    id: string,
  ): Promise<RolePermissionResponseDto> {
    const permission = await this.prismaService.rolePermission.findFirst({
      where: {
        id,
        centerId,
      },
      select: {
        id: true,
        centerId: true,
        role: true,
        permission: true,
        isGranted: true,
      },
    });

    if (!permission) {
      throw new NotFoundException('Role permission not found');
    }

    return this.toResponse(permission);
  }

  async update(
    centerId: string,
    id: string,
    payload: UpdateRolePermissionDto,
  ): Promise<RolePermissionResponseDto> {
    const existing = await this.prismaService.rolePermission.findFirst({
      where: {
        id,
        centerId,
      },
      select: {
        id: true,
        centerId: true,
        role: true,
        permission: true,
        isGranted: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Role permission not found');
    }

    if (payload.isGranted === undefined) {
      return this.toResponse(existing);
    }

    const updated = await this.prismaService.rolePermission.update({
      where: { id },
      data: {
        isGranted: payload.isGranted,
      },
      select: {
        id: true,
        centerId: true,
        role: true,
        permission: true,
        isGranted: true,
      },
    });

    return this.toResponse(updated);
  }

  async remove(centerId: string, id: string): Promise<void> {
    const existing = await this.prismaService.rolePermission.findFirst({
      where: {
        id,
        centerId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Role permission not found');
    }

    await this.prismaService.rolePermission.delete({
      where: { id },
    });
  }

  private toResponse(permission: {
    id: string;
    centerId: string;
    role: RolePermissionResponseDto['role'];
    permission: RolePermissionResponseDto['permission'];
    isGranted: boolean;
  }): RolePermissionResponseDto {
    return {
      id: permission.id,
      center_id: permission.centerId,
      role: permission.role,
      permission: permission.permission,
      isGranted: permission.isGranted,
    };
  }

  private isUniqueConstraintError(error: unknown): error is {
    code: 'P2002';
  } {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const record = error as { code?: unknown };
    return record.code === 'P2002';
  }
}
