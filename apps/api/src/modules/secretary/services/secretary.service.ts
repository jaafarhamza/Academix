import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { hashPassword } from '../../../common/utils/password-hash.util';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateSecretaryDto } from '../dto/create-secretary.dto';
import { QuerySecretaryDto } from '../dto/query-secretary.dto';
import { SecretaryDetailResponseDto } from '../dto/secretary-detail-response.dto';
import { SecretaryResponseDto } from '../dto/secretary-response.dto';
import { SecretaryStatusResponseDto } from '../dto/secretary-status-response.dto';

@Injectable()
export class SecretaryService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    centerId: string,
    payload: CreateSecretaryDto,
  ): Promise<SecretaryResponseDto> {
    const passwordHash = await hashPassword(payload.password);
    try {
      const secretary = await this.prismaService.user.create({
        data: {
          centerId,
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          passwordHash,
          phone: payload.phone,
          role: UserRole.SECRETARY,
          cin: payload.cin,
        },
        select: {
          id: true,
          centerId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          cin: true,
          isActive: true,
          createdAt: true,
        },
      });

      return this.toSecretaryResponse(secretary);
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const target = this.getUniqueConstraintTarget(error);
      if (target.includes('email')) {
        throw new ConflictException('Secretary email already in use');
      }
      if (target.includes('cin')) {
        throw new ConflictException('Secretary CIN already in use');
      }

      throw new ConflictException(
        'Secretary already exists with the provided unique fields',
      );
    }
  }

  async findAll(
    centerId: string,
    query: QuerySecretaryDto,
  ): Promise<SecretaryResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const secretaries = await this.prismaService.user.findMany({
      where: {
        centerId,
        role: UserRole.SECRETARY,
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.search
          ? {
              OR: [
                {
                  firstName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  cin: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: limit,
      select: {
        id: true,
        centerId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        cin: true,
        isActive: true,
        createdAt: true,
      },
    });

    return secretaries.map((secretary) => this.toSecretaryResponse(secretary));
  }

  async findOne(
    centerId: string,
    id: string,
  ): Promise<SecretaryDetailResponseDto> {
    const secretary = await this.prismaService.user.findFirst({
      where: {
        id,
        centerId,
        role: UserRole.SECRETARY,
      },
      select: {
        id: true,
        centerId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        cin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!secretary) {
      throw new NotFoundException('Secretary not found');
    }

    return this.toSecretaryDetailResponse(secretary);
  }

  getStatus(): SecretaryStatusResponseDto {
    return {
      module: 'secretary',
      status: 'ready',
    };
  }

  private toSecretaryResponse(secretary: {
    id: string;
    centerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    cin: string | null;
    isActive: boolean;
    createdAt: Date;
  }): SecretaryResponseDto {
    return {
      id: secretary.id,
      center_id: secretary.centerId,
      firstName: secretary.firstName,
      lastName: secretary.lastName,
      email: secretary.email,
      phone: secretary.phone,
      role: secretary.role,
      cin: secretary.cin,
      isActive: secretary.isActive,
      createdAt: secretary.createdAt,
    };
  }

  private toSecretaryDetailResponse(secretary: {
    id: string;
    centerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    cin: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): SecretaryDetailResponseDto {
    return {
      id: secretary.id,
      center_id: secretary.centerId,
      firstName: secretary.firstName,
      lastName: secretary.lastName,
      email: secretary.email,
      phone: secretary.phone,
      role: secretary.role,
      cin: secretary.cin,
      isActive: secretary.isActive,
      createdAt: secretary.createdAt,
      updatedAt: secretary.updatedAt,
    };
  }

  private isUniqueConstraintError(error: unknown): error is {
    code: 'P2002';
    meta?: { target?: unknown };
  } {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const record = error as { code?: unknown };
    return record.code === 'P2002';
  }

  private getUniqueConstraintTarget(error: {
    meta?: { target?: unknown };
  }): string {
    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.map((value) => String(value).toLowerCase()).join(',');
    }

    return typeof target === 'string' ? target.toLowerCase() : '';
  }
}
