"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppAuth, useToast } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import {
  activateSecretary,
  createSecretary,
  deactivateSecretary,
  getSecretaryDetail,
  listSecretaries,
  updateSecretary,
} from "../client/secretary-client";
import { SecretaryFormDialog } from "./secretary-form-dialog";
import { UserDetailDialog } from "@/modules/user/components/user-detail-dialog";
import { UserDeactivateDialog } from "@/modules/user/components/user-deactivate-dialog";
import type { Secretary, SecretaryDetail } from "../types/secretary.types";

type SecretaryListState = {
  isLoading: boolean;
  errorMessage: string | null;
  items: Secretary[];
};

const initialSecretaryListState: SecretaryListState = {
  isLoading: true,
  errorMessage: null,
  items: [],
};

type SecretaryStatusFilter = "all" | "active" | "inactive";
type SecretaryStatusAction = {
  secretary: Secretary;
  action: "activate" | "deactivate";
};

const defaultPage = 1;
const defaultLimit = 10;
const limitOptions = [10, 20, 50];
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

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

function parseStatusFilter(value: string | null): SecretaryStatusFilter {
  if (value === "active" || value === "inactive") {
    return value;
  }
  return "all";
}

function getStatusFilterValue(filter: SecretaryStatusFilter): boolean | undefined {
  if (filter === "active") {
    return true;
  }

  if (filter === "inactive") {
    return false;
  }

  return undefined;
}

function getSecretaryName(secretary: Secretary) {
  return `${secretary.firstName} ${secretary.lastName}`.trim();
}

function getFormattedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return dateFormatter.format(date);
}

function getFormattedDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return dateTimeFormatter.format(date);
}

function extractErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export function SecretaryListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, setUser, clearUser } = useAppAuth();
  const toast = useToast();

  const searchValue = searchParams.get("search")?.trim() ?? "";
  const page = parsePositiveInteger(searchParams.get("page"), defaultPage);
  const rawLimit = parsePositiveInteger(searchParams.get("limit"), defaultLimit);
  const limit = limitOptions.includes(rawLimit) ? rawLimit : defaultLimit;
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const isActiveFilter = getStatusFilterValue(statusFilter);

  const [searchInput, setSearchInput] = useState(searchValue);
  const [state, setState] = useState<SecretaryListState>(initialSecretaryListState);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSecretary, setEditingSecretary] = useState<Secretary | null>(null);
  const [viewingSecretaryId, setViewingSecretaryId] = useState<string | null>(null);
  const [secretaryStatusAction, setSecretaryStatusAction] = useState<SecretaryStatusAction | null>(null);

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

  const loadSecretaries = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const secretaries = await listSecretaries({
        search: searchValue || undefined,
        isActive: isActiveFilter,
        page,
        limit,
      });

      setState({
        isLoading: false,
        errorMessage: null,
        items: secretaries,
      });
    } catch (error: unknown) {
      setState({
        isLoading: false,
        errorMessage:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Unable to load secretaries.",
        items: [],
      });
    }
  }, [isActiveFilter, limit, page, searchValue]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void loadSecretaries();
  }, [isSessionReady, loadSecretaries]);

  const handleCreateSecretary = useCallback(
    async (payload: Parameters<typeof createSecretary>[0]) => {
      try {
        await createSecretary(payload);
        await loadSecretaries();
        toast.success(
          "Secretary created",
          "The secretary account was created successfully.",
        );
      } catch (error: unknown) {
        toast.error(
          "Unable to create secretary",
          extractErrorMessage(error, "Please review the form values and try again."),
        );
        throw error;
      }
    },
    [loadSecretaries, toast],
  );

  const handleUpdateSecretary = useCallback(
    async (secretaryId: string, payload: Parameters<typeof updateSecretary>[1]) => {
      try {
        await updateSecretary(secretaryId, payload);
        await loadSecretaries();
        toast.success("Secretary updated", "The secretary profile was updated.");
      } catch (error: unknown) {
        toast.error(
          "Unable to update secretary",
          extractErrorMessage(error, "Please review your changes and try again."),
        );
        throw error;
      }
    },
    [loadSecretaries, toast],
  );

  const loadSecretaryDetail = useCallback((secretaryId: string) => {
    return getSecretaryDetail(secretaryId);
  }, []);

  const handleChangeSecretaryStatus = useCallback(
    async (secretaryId: string, action: SecretaryStatusAction["action"]) => {
      try {
        if (action === "activate") {
          await activateSecretary(secretaryId);
          toast.success(
            "Secretary activated",
            "The secretary can now access the platform.",
          );
        } else {
          await deactivateSecretary(secretaryId);
          toast.success(
            "Secretary deactivated",
            "The secretary account is now inactive.",
          );
        }

        await loadSecretaries();
      } catch (error: unknown) {
        toast.error(
          action === "activate"
            ? "Unable to activate secretary"
            : "Unable to deactivate secretary",
          extractErrorMessage(error, "Please try again in a moment."),
        );
        throw error;
      }
    },
    [loadSecretaries, toast],
  );

  const hasPreviousPage = page > 1;
  const hasNextPage = state.items.length === limit;

  const summaryLabel = useMemo(() => {
    if (state.items.length === 0) {
      return "No secretaries found for this filter.";
    }

    const firstItemIndex = (page - 1) * limit + 1;
    const lastItemIndex = firstItemIndex + state.items.length - 1;
    return `Showing ${firstItemIndex}-${lastItemIndex}`;
  }, [limit, page, state.items.length]);

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
            <h1 className="text-xl font-semibold tracking-tight">Secretaries</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage and review secretaries for your current center.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Users className="size-4" />
              {summaryLabel}
            </div>
            <Button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Add Secretary
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_140px]">
          <label className="relative block">
            <span className="sr-only">Search secretaries</span>
            <Search className="pointer-events-none absolute top-4 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, email, or CIN"
              value={searchInput}
              onChange={(event) => {
                const nextValue = event.currentTarget.value;
                setSearchInput(nextValue);
              }}
              className="pl-9"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                const value = event.currentTarget.value;
                replaceQueryParams((params) => {
                  if (value === "all") {
                    params.delete("status");
                  } else {
                    params.set("status", value);
                  }

                  params.set("page", "1");
                });
              }}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="all">All secretaries</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Per page</span>
            <select
              value={String(limit)}
              onChange={(event) => {
                const value = Number.parseInt(event.currentTarget.value, 10);
                replaceQueryParams((params) => {
                  params.set("limit", String(value));
                  params.set("page", "1");
                });
              }}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {limitOptions.map((option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option} rows
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card/90 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-left text-sm">
            <caption className="sr-only">Secretaries list with search and filters</caption>
            <thead className="bg-muted/55 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Phone
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  CIN
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Created
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
              {state.isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading secretaries...
                  </td>
                </tr>
              ) : state.errorMessage ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-destructive"
                  >
                    {state.errorMessage}
                  </td>
                </tr>
              ) : state.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No secretaries found.
                  </td>
                </tr>
              ) : (
                state.items.map((secretary) => (
                  <tr
                    key={secretary.id}
                    className="border-t"
                  >
                    <td className="px-4 py-3 font-medium">{getSecretaryName(secretary)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{secretary.email}</td>
                    <td className="px-4 py-3">{secretary.phone}</td>
                    <td className="px-4 py-3">{secretary.cin ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          secretary.isActive
                            ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                            : "rounded-full border border-muted-foreground/30 bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        {secretary.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getFormattedDate(secretary.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewingSecretaryId(secretary.id);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSecretary(secretary);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant={secretary.isActive ? "destructive" : "default"}
                          size="sm"
                          onClick={() => {
                            setSecretaryStatusAction({
                              secretary,
                              action: secretary.isActive ? "deactivate" : "activate",
                            });
                          }}
                        >
                          {secretary.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
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
      </div>

      <SecretaryFormDialog
        mode="create"
        secretary={null}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreate={handleCreateSecretary}
        onUpdate={handleUpdateSecretary}
      />

      <SecretaryFormDialog
        mode="edit"
        secretary={editingSecretary}
        open={editingSecretary !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingSecretary(null);
          }
        }}
        onCreate={handleCreateSecretary}
        onUpdate={handleUpdateSecretary}
      />

      <UserDetailDialog<SecretaryDetail>
        open={viewingSecretaryId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setViewingSecretaryId(null);
          }
        }}
        userId={viewingSecretaryId}
        entityLabel="Secretary"
        loadDetail={loadSecretaryDetail}
        getTitle={(secretary) => `${secretary.firstName} ${secretary.lastName}`.trim()}
        getSubtitle={(secretary) => secretary.email}
        getIsActive={(secretary) => secretary.isActive}
        renderDetail={(secretary) => (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="font-medium">{secretary.phone}</dd>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">CIN</dt>
              <dd className="font-medium">{secretary.cin ?? "-"}</dd>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd className="font-medium">{secretary.role}</dd>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Created At</dt>
              <dd className="font-medium">{getFormattedDateTime(secretary.createdAt)}</dd>
            </div>
          </dl>
        )}
      />

      <UserDeactivateDialog
        open={secretaryStatusAction !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSecretaryStatusAction(null);
          }
        }}
        entityLabel="Secretary"
        userName={
          secretaryStatusAction
            ? getSecretaryName(secretaryStatusAction.secretary)
            : ""
        }
        action={secretaryStatusAction?.action ?? "deactivate"}
        onConfirm={async () => {
          if (!secretaryStatusAction) {
            return;
          }

          await handleChangeSecretaryStatus(
            secretaryStatusAction.secretary.id,
            secretaryStatusAction.action,
          );
        }}
      />
    </section>
  );
}
