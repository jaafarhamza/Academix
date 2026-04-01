"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, PencilLine, Plus, Trash2 } from "lucide-react";

import { FilterField } from "@/components/filters/filter-field";
import { SearchFilterInput } from "@/components/filters/search-filter-input";
import { SelectFilter } from "@/components/filters/select-filter";
import { Button } from "@/components/ui/button";
import { useAppAuth, useToast } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import { createRoom, deleteRoom, listRooms, updateRoom } from "../client/room-client";
import { RoomDeleteDialog } from "./room-delete-dialog";
import { RoomFormDialog } from "./room-form-dialog";
import type { Room } from "../types/room.types";

type RoomListState = {
  isLoading: boolean;
  errorMessage: string | null;
  items: Room[];
  hasNextPage: boolean;
  totalMatching: number | null;
};

type RoomViewMode = "table" | "grid";

const initialRoomListState: RoomListState = {
  isLoading: true,
  errorMessage: null,
  items: [],
  hasNextPage: false,
  totalMatching: null,
};

const defaultPage = 1;
const defaultLimit = 10;
const defaultViewMode: RoomViewMode = "table";
const limitOptions = [10, 20, 50];

function parsePositiveInteger(value: string | null, fallbackValue: number) {
  if (!value) {
    return fallbackValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return parsed;
}

function parseNonNegativeInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function parseIsAvailableFilter(value: string | null) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function parseViewMode(value: string | null): RoomViewMode {
  if (value === "grid") {
    return "grid";
  }

  return defaultViewMode;
}

function toAvailabilitySelectValue(value: boolean | undefined) {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "all";
}

function getAvailabilityLabel(isAvailable: boolean) {
  return isAvailable ? "Available" : "Unavailable";
}

function getAvailabilityBadgeClassName(isAvailable: boolean) {
  return isAvailable
    ? "inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
    : "inline-flex items-center rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300";
}

function getFloorLabel(floor: number) {
  return `Floor ${floor}`;
}

function extractErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

type RoomGroup = {
  floor: number;
  rooms: Room[];
};

export function RoomListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, setUser, clearUser } = useAppAuth();
  const toast = useToast();

  const searchValue = searchParams.get("search")?.trim() ?? "";
  const page = parsePositiveInteger(searchParams.get("page"), defaultPage);
  const rawLimit = parsePositiveInteger(searchParams.get("limit"), defaultLimit);
  const limit = limitOptions.includes(rawLimit) ? rawLimit : defaultLimit;
  const floorFilter = parseNonNegativeInteger(searchParams.get("floor"));
  const isAvailableFilter = parseIsAvailableFilter(
    searchParams.get("isAvailable"),
  );
  const viewMode = parseViewMode(searchParams.get("view"));
  const availabilitySelectValue = toAvailabilitySelectValue(isAvailableFilter);

  const [searchInput, setSearchInput] = useState(searchValue);
  const [availableFloors, setAvailableFloors] = useState<number[]>([]);
  const [state, setState] = useState<RoomListState>(initialRoomListState);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      setIsSessionReady(true);
      return;
    }

    let isCancelled = false;

    async function initializeCenterSession() {
      try {
        const session = await ensureCenterSession();
        if (isCancelled) {
          return;
        }

        setUser({
          id: session.auth.center.id,
          centerId: session.auth.center.id,
          role: "ADMIN",
          fullName: session.profile?.centerName ?? session.auth.center.centerName,
          email: session.auth.center.email,
        });
        setIsSessionReady(true);
      } catch {
        if (isCancelled) {
          return;
        }

        clearUser();
        setIsSessionReady(false);
        router.replace("/center/login");
      }
    }

    void initializeCenterSession();

    return () => {
      isCancelled = true;
    };
  }, [clearUser, router, setUser, user?.role]);

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  const loadFloorOptions = useCallback(async () => {
    const rooms = await listRooms({
      page: 1,
      limit: 100,
    });

    const nextFloors = Array.from(new Set(rooms.map((room) => room.floor))).sort(
      (left, right) => left - right,
    );
    setAvailableFloors(nextFloors);
  }, []);

  const replaceQueryParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      mutate(nextParams);

      const currentQuery = searchParams.toString();
      const nextQuery = nextParams.toString();
      if (nextQuery === currentQuery) {
        return;
      }

      const target = nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const normalized = searchInput.trim();
      if (normalized === searchValue) {
        return;
      }

      replaceQueryParams((params) => {
        if (normalized.length > 0) {
          params.set("search", normalized);
        } else {
          params.delete("search");
        }

        params.set("page", "1");
      });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [replaceQueryParams, searchInput, searchValue]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    let isCancelled = false;

    async function loadFloorOptionsSafely() {
      try {
        if (isCancelled) {
          return;
        }
        await loadFloorOptions();
      } catch {
        if (isCancelled) {
          return;
        }
        setAvailableFloors([]);
      }
    }

    void loadFloorOptionsSafely();

    return () => {
      isCancelled = true;
    };
  }, [isSessionReady, loadFloorOptions]);

  const loadRooms = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      if (isAvailableFilter === undefined) {
        const rooms = await listRooms({
          search: searchValue || undefined,
          floor: floorFilter,
          page,
          limit,
        });

        setState({
          isLoading: false,
          errorMessage: null,
          items: rooms,
          hasNextPage: rooms.length === limit,
          totalMatching: null,
        });
        return;
      }

      const unfilteredRooms = await listRooms({
        search: searchValue || undefined,
        floor: floorFilter,
        page: 1,
        limit: 100,
      });
      const filteredRooms = unfilteredRooms.filter(
        (room) => room.isAvailable === isAvailableFilter,
      );
      const firstItemIndex = (page - 1) * limit;
      const paginatedRooms = filteredRooms.slice(
        firstItemIndex,
        firstItemIndex + limit,
      );
      const hasNextPage = firstItemIndex + paginatedRooms.length < filteredRooms.length;

      setState({
        isLoading: false,
        errorMessage: null,
        items: paginatedRooms,
        hasNextPage,
        totalMatching: filteredRooms.length,
      });
    } catch (error: unknown) {
      setState({
        isLoading: false,
        errorMessage: extractErrorMessage(error, "Unable to load rooms."),
        items: [],
        hasNextPage: false,
        totalMatching: null,
      });
    }
  }, [floorFilter, isAvailableFilter, limit, page, searchValue]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void loadRooms();
  }, [isSessionReady, loadRooms]);

  const handleCreateRoom = useCallback(
    async (payload: Parameters<typeof createRoom>[0]) => {
      try {
        await createRoom(payload);
        await Promise.all([loadRooms(), loadFloorOptions()]);
        toast.success("Room created", "The room was created successfully.");
      } catch (error: unknown) {
        const message = extractErrorMessage(
          error,
          "Please review the room details and try again.",
        );
        toast.error("Unable to create room", message);
        throw error;
      }
    },
    [loadFloorOptions, loadRooms, toast],
  );

  const handleUpdateRoom = useCallback(
    async (roomId: string, payload: Parameters<typeof updateRoom>[1]) => {
      try {
        await updateRoom(roomId, payload);
        await Promise.all([loadRooms(), loadFloorOptions()]);
        toast.success("Room updated", "The room details were updated.");
      } catch (error: unknown) {
        const message = extractErrorMessage(
          error,
          "Please review your changes and try again.",
        );
        toast.error("Unable to update room", message);
        throw error;
      }
    },
    [loadFloorOptions, loadRooms, toast],
  );

  const handleDeleteRoom = useCallback(
    async (roomId: string) => {
      try {
        await deleteRoom(roomId);
        await Promise.all([loadRooms(), loadFloorOptions()]);
        toast.success("Room deleted", "The room was removed successfully.");
      } catch (error: unknown) {
        const message = extractErrorMessage(error, "Please try again in a moment.");
        toast.error("Unable to delete room", message);
        throw error;
      }
    },
    [loadFloorOptions, loadRooms, toast],
  );

  const hasPreviousPage = page > 1;
  const hasNextPage = state.hasNextPage;

  const summaryLabel = useMemo(() => {
    if (state.items.length === 0) {
      return "No rooms found for this filter.";
    }

    const firstItemIndex = (page - 1) * limit + 1;
    const lastItemIndex = firstItemIndex + state.items.length - 1;
    if (typeof state.totalMatching === "number") {
      return `Showing ${firstItemIndex}-${lastItemIndex} of ${state.totalMatching}`;
    }

    return `Showing ${firstItemIndex}-${lastItemIndex}`;
  }, [limit, page, state.items.length, state.totalMatching]);

  const groupedRooms = useMemo<RoomGroup[]>(() => {
    const groups = new Map<number, Room[]>();

    for (const room of state.items) {
      const existing = groups.get(room.floor);
      if (existing) {
        existing.push(room);
      } else {
        groups.set(room.floor, [room]);
      }
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => left - right)
      .map(([floor, rooms]) => ({
        floor,
        rooms,
      }));
  }, [state.items]);

  const floorOptions = useMemo(() => {
    const floorSet = new Set(availableFloors);
    if (floorFilter !== undefined) {
      floorSet.add(floorFilter);
    }

    return Array.from(floorSet)
      .sort((left, right) => left - right)
      .map((floor) => ({
        value: String(floor),
        label: getFloorLabel(floor),
      }));
  }, [availableFloors, floorFilter]);

  if (!isSessionReady) {
    return (
      <section className="mx-auto w-full max-w-6xl">
        <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
          <p className="text-sm text-muted-foreground">Validating center session...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <div className="rounded-xl border bg-card/90 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Rooms</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse room inventory with floor grouping and quick availability context.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Building2 className="size-4" />
              {summaryLabel}
            </div>
            <Button
              type="button"
              onClick={() => {
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add room
            </Button>
            <div className="inline-flex overflow-hidden rounded-lg border bg-background p-1">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "table" ? "default" : "ghost"}
                onClick={() => {
                  replaceQueryParams((params) => {
                    params.set("view", "table");
                  });
                }}
              >
                Table
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "grid" ? "default" : "ghost"}
                onClick={() => {
                  replaceQueryParams((params) => {
                    params.set("view", "grid");
                  });
                }}
              >
                Grid
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_120px_170px_140px]">
          <SearchFilterInput
            placeholder="Search by room name"
            value={searchInput}
            onChange={setSearchInput}
          />

          <FilterField label="Floor">
            <SelectFilter
              value={floorFilter !== undefined ? String(floorFilter) : ""}
              onChange={(value) => {
                replaceQueryParams((params) => {
                  if (!value) {
                    params.delete("floor");
                  } else {
                    params.set("floor", value);
                  }

                  params.set("page", "1");
                });
              }}
              options={floorOptions}
              emptyLabel="All floors"
            />
          </FilterField>

          <FilterField label="Availability">
            <SelectFilter
              value={availabilitySelectValue}
              onChange={(value) => {
                replaceQueryParams((params) => {
                  if (value === "all" || value === "") {
                    params.delete("isAvailable");
                  } else {
                    params.set("isAvailable", value);
                  }

                  params.set("page", "1");
                });
              }}
              options={[
                { value: "all", label: "All rooms" },
                { value: "true", label: "Available only" },
                { value: "false", label: "Unavailable only" },
              ]}
            />
          </FilterField>

          <FilterField label="Per page">
            <SelectFilter
              value={String(limit)}
              onChange={(value) => {
                const parsed = Number.parseInt(value, 10);
                replaceQueryParams((params) => {
                  params.set("limit", String(parsed));
                  params.set("page", "1");
                });
              }}
              options={limitOptions.map((option) => ({
                value: String(option),
                label: `${option} rows`,
              }))}
            />
          </FilterField>
        </div>
      </div>

      {state.isLoading ? (
        <div className="rounded-xl border bg-card/90 p-8 text-center text-sm text-muted-foreground shadow-xs">
          Loading rooms...
        </div>
      ) : state.errorMessage ? (
        <div className="rounded-xl border bg-card/90 p-8 text-center text-sm text-destructive shadow-xs">
          {state.errorMessage}
        </div>
      ) : groupedRooms.length === 0 ? (
        <div className="rounded-xl border bg-card/90 p-8 text-center text-sm text-muted-foreground shadow-xs">
          No rooms found.
        </div>
      ) : viewMode === "grid" ? (
        <div className="space-y-4">
          {groupedRooms.map((group) => (
            <section
              key={group.floor}
              className="overflow-hidden rounded-xl border bg-card/90 shadow-xs"
              aria-label={getFloorLabel(group.floor)}
            >
              <div className="flex items-center justify-between border-b bg-muted/45 px-4 py-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  {getFloorLabel(group.floor)}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {group.rooms.length} room{group.rooms.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.rooms.map((room) => (
                  <article
                    key={room.id}
                    className="rounded-lg border bg-background/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{room.roomName}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => {
                            setEditingRoom(room);
                          }}
                        >
                          <PencilLine className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeletingRoom(room);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getFloorLabel(room.floor)}
                    </p>
                    <div className="mt-3">
                      <span className={getAvailabilityBadgeClassName(room.isAvailable)}>
                        {getAvailabilityLabel(room.isAvailable)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedRooms.map((group) => (
            <section
              key={group.floor}
              className="overflow-hidden rounded-xl border bg-card/90 shadow-xs"
              aria-label={getFloorLabel(group.floor)}
            >
              <div className="flex items-center justify-between border-b bg-muted/45 px-4 py-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  {getFloorLabel(group.floor)}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {group.rooms.length} room{group.rooms.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-120 text-left text-sm">
                  <caption className="sr-only">
                    Rooms listed for {getFloorLabel(group.floor)}
                  </caption>
                  <thead className="bg-muted/55 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 font-medium"
                      >
                        Room
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-medium"
                      >
                        Floor
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-medium"
                      >
                        Availability
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-medium"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rooms.map((room) => (
                      <tr
                        key={room.id}
                        className="border-t"
                      >
                        <th
                          scope="row"
                          className="px-4 py-3 font-medium"
                        >
                          {room.roomName}
                        </th>
                        <td className="px-4 py-3 text-muted-foreground">
                          {getFloorLabel(room.floor)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={getAvailabilityBadgeClassName(room.isAvailable)}>
                            {getAvailabilityLabel(room.isAvailable)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingRoom(room);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setDeletingRoom(room);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card/90 px-4 py-3 shadow-xs">
        <p className="text-sm text-muted-foreground">Page {page}</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={state.isLoading || !hasPreviousPage}
            onClick={() => {
              replaceQueryParams((params) => {
                params.set("page", String(page - 1));
              });
            }}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={state.isLoading || !hasNextPage}
            onClick={() => {
              replaceQueryParams((params) => {
                params.set("page", String(page + 1));
              });
            }}
          >
            Next
          </Button>
        </div>
      </div>

      <RoomFormDialog
        mode="create"
        room={null}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreate={handleCreateRoom}
        onUpdate={handleUpdateRoom}
      />

      <RoomFormDialog
        mode="edit"
        room={editingRoom}
        open={editingRoom !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingRoom(null);
          }
        }}
        onCreate={handleCreateRoom}
        onUpdate={handleUpdateRoom}
      />

      <RoomDeleteDialog
        open={deletingRoom !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeletingRoom(null);
          }
        }}
        roomName={deletingRoom?.roomName ?? ""}
        onConfirm={async () => {
          if (!deletingRoom) {
            return;
          }

          await handleDeleteRoom(deletingRoom.id);
        }}
      />
    </section>
  );
}
