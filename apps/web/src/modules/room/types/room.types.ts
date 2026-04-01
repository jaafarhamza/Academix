export type Room = {
  id: string;
  center_id: string;
  floor: number;
  roomName: string;
  isAvailable: boolean;
};

export type RoomListQuery = {
  search?: string;
  floor?: number;
  isAvailable?: boolean;
  page?: number;
  limit?: number;
};
