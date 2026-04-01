export type Room = {
  id: string;
  center_id: string;
  floor: number;
  roomName: string;
  isAvailable: boolean;
};

export type RoomDetail = Room & {
  sessionsCount: number;
};

export type RoomListQuery = {
  search?: string;
  floor?: number;
  isAvailable?: boolean;
  page?: number;
  limit?: number;
};

export type RoomCreatePayload = {
  floor: number;
  roomName: string;
  isAvailable?: boolean;
};

export type RoomUpdatePayload = Partial<{
  floor: number;
  roomName: string;
  isAvailable: boolean;
}>;
