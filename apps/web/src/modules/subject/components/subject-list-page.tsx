"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookCopy, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppAuth, useToast } from "@/hooks";
import { ensureCenterSession } from "@/modules/center/client/center-auth-client";
import {
  createSubject,
  deleteSubject,
  getSubjectDetail,
  listSubjects,
  updateSubject,
} from "../client/subject-client";
import { SubjectFormDialog } from "./subject-form-dialog";
import { SubjectDeleteDialog } from "./subject-delete-dialog";
import { UserDetailDialog } from "@/modules/user/components/user-detail-dialog";
import type { Subject, SubjectDetail } from "../types/subject.types";

type SubjectListState = {
  isLoading: boolean;
  errorMessage: string | null;
  items: Subject[];
};

const initialSubjectListState: SubjectListState = {
  isLoading: true,
  errorMessage: null,
  items: [],
};

const defaultPage = 1;
const defaultLimit = 10;
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

function extractErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function SubjectListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, setUser, clearUser } = useAppAuth();
  const toast = useToast();

  const searchValue = searchParams.get("search")?.trim() ?? "";
  const page = parsePositiveInteger(searchParams.get("page"), defaultPage);
  const rawLimit = parsePositiveInteger(searchParams.get("limit"), defaultLimit);
  const limit = limitOptions.includes(rawLimit) ? rawLimit : defaultLimit;

  const [searchInput, setSearchInput] = useState(searchValue);
  const [state, setState] = useState<SubjectListState>(initialSubjectListState);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [viewingSubjectId, setViewingSubjectId] = useState<string | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

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

  const loadSubjects = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      errorMessage: null,
    }));

    try {
      const subjects = await listSubjects({
        search: searchValue || undefined,
        page,
        limit,
      });

      setState({
        isLoading: false,
        errorMessage: null,
        items: subjects,
      });
    } catch (error: unknown) {
      setState({
        isLoading: false,
        errorMessage:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Unable to load subjects.",
        items: [],
      });
    }
  }, [limit, page, searchValue]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    void loadSubjects();
  }, [isSessionReady, loadSubjects]);

  const handleCreateSubject = useCallback(
    async (payload: Parameters<typeof createSubject>[0]) => {
      try {
        await createSubject(payload);
        await loadSubjects();
        toast.success("Subject created", "The subject was created successfully.");
      } catch (error: unknown) {
        toast.error(
          "Unable to create subject",
          extractErrorMessage(error, "Please review the form values and try again."),
        );
        throw error;
      }
    },
    [loadSubjects, toast],
  );

  const handleUpdateSubject = useCallback(
    async (subjectId: string, payload: Parameters<typeof updateSubject>[1]) => {
      try {
        await updateSubject(subjectId, payload);
        await loadSubjects();
        toast.success("Subject updated", "The subject details were updated.");
      } catch (error: unknown) {
        toast.error(
          "Unable to update subject",
          extractErrorMessage(error, "Please review your changes and try again."),
        );
        throw error;
      }
    },
    [loadSubjects, toast],
  );

  const loadSubjectDetail = useCallback((subjectId: string) => {
    return getSubjectDetail(subjectId);
  }, []);

  const handleDeleteSubject = useCallback(
    async (subjectId: string) => {
      try {
        await deleteSubject(subjectId);
        await loadSubjects();
        toast.success("Subject deleted", "The subject was removed successfully.");
      } catch (error: unknown) {
        toast.error(
          "Unable to delete subject",
          extractErrorMessage(error, "Please try again in a moment."),
        );
        throw error;
      }
    },
    [loadSubjects, toast],
  );

  const hasPreviousPage = page > 1;
  const hasNextPage = state.items.length === limit;

  const summaryLabel = useMemo(() => {
    if (state.items.length === 0) {
      return "No subjects found for this filter.";
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
            <h1 className="text-xl font-semibold tracking-tight">Subjects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage center subjects used in teacher assignments and groups.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
              <BookCopy className="size-4" />
              {summaryLabel}
            </div>
            <Button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Add Subject
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px]">
          <label className="relative block">
            <span className="sr-only">Search subjects</span>
            <Search className="pointer-events-none absolute top-4 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by subject name or description"
              value={searchInput}
              onChange={(event) => {
                const nextValue = event.currentTarget.value;
                setSearchInput(nextValue);
              }}
              className="pl-9"
            />
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
          <table className="w-full min-w-160 text-left text-sm">
            <caption className="sr-only">Subjects list with search and pagination</caption>
            <thead className="bg-muted/55 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Subject
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                >
                  Description
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
                    colSpan={3}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Loading subjects...
                  </td>
                </tr>
              ) : state.errorMessage ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-sm text-destructive"
                  >
                    {state.errorMessage}
                  </td>
                </tr>
              ) : state.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No subjects found.
                  </td>
                </tr>
              ) : (
                state.items.map((subject) => (
                  <tr
                    key={subject.id}
                    className="border-t"
                  >
                    <td className="px-4 py-3 font-medium">{subject.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span title={subject.description}>
                        {truncateText(subject.description, 120)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewingSubjectId(subject.id);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSubject(subject);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setDeletingSubject(subject);
                          }}
                        >
                          Delete
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

      <SubjectFormDialog
        mode="create"
        subject={null}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreate={handleCreateSubject}
        onUpdate={handleUpdateSubject}
      />

      <SubjectFormDialog
        mode="edit"
        subject={editingSubject}
        open={editingSubject !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingSubject(null);
          }
        }}
        onCreate={handleCreateSubject}
        onUpdate={handleUpdateSubject}
      />

      <UserDetailDialog<SubjectDetail>
        open={viewingSubjectId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setViewingSubjectId(null);
          }
        }}
        userId={viewingSubjectId}
        entityLabel="Subject"
        loadDetail={loadSubjectDetail}
        getTitle={(subject) => subject.name}
        renderDetail={(subject) => (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-md border bg-background/60 px-3 py-2 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap font-medium">
                {subject.description}
              </dd>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Teacher assignments</dt>
              <dd className="font-medium">{subject.teacherAssignmentsCount}</dd>
            </div>
            <div className="rounded-md border bg-background/60 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Sessions</dt>
              <dd className="font-medium">{subject.sessionsCount}</dd>
            </div>
          </dl>
        )}
      />

      <SubjectDeleteDialog
        open={deletingSubject !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeletingSubject(null);
          }
        }}
        subjectName={deletingSubject?.name ?? ""}
        onConfirm={async () => {
          if (!deletingSubject) {
            return;
          }

          await handleDeleteSubject(deletingSubject.id);
        }}
      />
    </section>
  );
}
