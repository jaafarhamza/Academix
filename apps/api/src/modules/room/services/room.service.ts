import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { QueryRoomDto } from '../dto/query-room.dto';
import { RoomDetailResponseDto } from '../dto/room-detail-response.dto';
import { RoomResponseDto } from '../dto/room-response.dto';
import { RoomStatusResponseDto } from '../dto/room-status-response.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';

@Injectable()
export class RoomService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    centerId: string,
    payload: CreateRoomDto,
  ): Promise<RoomResponseDto> {
    try {
      const room = await this.prismaService.room.create({
        data: {
          centerId,
          floor: payload.floor,
          roomName: payload.roomName,
          ...(payload.isAvailable !== undefined
            ? { isAvailable: payload.isAvailable }
            : {}),
        },
        select: this.getRoomSelect(),
      });

      return this.toRoomResponse(room);
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      throw new ConflictException('Room already exists on this floor');
    }
  }

  async findAll(
    centerId: string,
    query: QueryRoomDto,
  ): Promise<RoomResponseDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const rooms = await this.prismaService.room.findMany({
      where: {
        centerId,
        ...(query.floor !== undefined ? { floor: query.floor } : {}),
        ...(query.isAvailable !== undefined
          ? { isAvailable: query.isAvailable }
          : {}),
        ...(query.search
          ? {
              roomName: {
                contains: query.search,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      orderBy: [{ floor: 'asc' }, { roomName: 'asc' }, { id: 'asc' }],
      skip,
      take: limit,
      select: this.getRoomSelect(),
    });

    return rooms.map((room) => this.toRoomResponse(room));
  }

  async findOne(centerId: string, id: string): Promise<RoomDetailResponseDto> {
    const room = await this.findRoomDetailOrThrow(centerId, id);
    return this.toRoomDetailResponse(room);
  }

  async update(
    centerId: string,
    id: string,
    payload: UpdateRoomDto,
  ): Promise<RoomDetailResponseDto> {
    const existingRoom = await this.findRoomDetailOrThrow(centerId, id);
    const data = this.buildRoomUpdateData(payload);

    if (Object.keys(data).length === 0) {
      return this.toRoomDetailResponse(existingRoom);
    }

    try {
      const room = await this.prismaService.room.update({
        where: {
          id,
        },
        data,
        select: this.getRoomDetailSelect(),
      });

      return this.toRoomDetailResponse(room);
    } catch (error: unknown) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      throw new ConflictException('Room already exists on this floor');
    }
  }

  async remove(centerId: string, id: string): Promise<void> {
    await this.findRoomStateOrThrow(centerId, id);

    try {
      await this.prismaService.room.delete({
        where: {
          id,
        },
      });
    } catch (error: unknown) {
      if (this.isForeignKeyConstraintError(error)) {
        throw new ConflictException(
          'Cannot delete room because it is linked to course sessions',
        );
      }

      throw error;
    }
  }

  getStatus(): RoomStatusResponseDto {
    return {
      module: 'room',
      status: 'ready',
    };
  }

  private getRoomSelect() {
    return {
      id: true,
      centerId: true,
      floor: true,
      roomName: true,
      isAvailable: true,
    };
  }

  private getRoomDetailSelect() {
    return {
      ...this.getRoomSelect(),
      _count: {
        select: {
          courseSessions: true,
        },
      },
    };
  }

  private async findRoomDetailOrThrow(centerId: string, id: string) {
    const room = await this.prismaService.room.findFirst({
      where: {
        id,
        centerId,
      },
      select: this.getRoomDetailSelect(),
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  private async findRoomStateOrThrow(centerId: string, id: string) {
    const room = await this.prismaService.room.findFirst({
      where: {
        id,
        centerId,
      },
      select: {
        id: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  private buildRoomUpdateData(payload: UpdateRoomDto): Prisma.RoomUpdateInput {
    const data: Prisma.RoomUpdateInput = {};

    if (payload.floor !== undefined) {
      data.floor = payload.floor;
    }
    if (payload.roomName !== undefined) {
      data.roomName = payload.roomName;
    }
    if (payload.isAvailable !== undefined) {
      data.isAvailable = payload.isAvailable;
    }

    return data;
  }

  private toRoomResponse(room: {
    id: string;
    centerId: string;
    floor: number;
    roomName: string;
    isAvailable: boolean;
  }): RoomResponseDto {
    return {
      id: room.id,
      center_id: room.centerId,
      floor: room.floor,
      roomName: room.roomName,
      isAvailable: room.isAvailable,
    };
  }

  private toRoomDetailResponse(room: {
    id: string;
    centerId: string;
    floor: number;
    roomName: string;
    isAvailable: boolean;
    _count: {
      courseSessions: number;
    };
  }): RoomDetailResponseDto {
    return {
      id: room.id,
      center_id: room.centerId,
      floor: room.floor,
      roomName: room.roomName,
      isAvailable: room.isAvailable,
      sessionsCount: room._count.courseSessions,
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

  private isForeignKeyConstraintError(error: unknown): error is {
    code: 'P2003';
    meta?: { field_name?: unknown };
  } {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const record = error as { code?: unknown };
    return record.code === 'P2003';
  }
}
