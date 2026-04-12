import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";

export type UserRole =
  | "ADMIN"
  | "SECRETARY"
  | "TEACHER"
  | "STUDENT"
  | "SUPER_ADMIN";

export type AuthUser = {
  id: string;
  centerId?: string;
  role?: UserRole;
  fullName?: string;
  email?: string;
};

export type AppStoreState = {
  auth: {
    isAuthenticated: boolean;
    user: AuthUser | null;
  };
  ui: {
    isSidebarOpen: boolean;
  };
};

export type AppStoreActions = {
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
};

export type AppStore = AppStoreState & AppStoreActions;

const defaultAppStoreState: AppStoreState = {
  auth: {
    isAuthenticated: false,
    user: null,
  },
  ui: {
    isSidebarOpen: true,
  },
};

type AppStoreInit = Partial<{
  auth: Partial<AppStoreState["auth"]>;
  ui: Partial<AppStoreState["ui"]>;
}>;

const appStoreStorageKey = "academix.app-store";

export function createAppStore(initState: AppStoreInit = {}) {
  const initialState: AppStoreState = {
    auth: {
      ...defaultAppStoreState.auth,
      ...initState.auth,
    },
    ui: {
      ...defaultAppStoreState.ui,
      ...initState.ui,
    },
  };

  return createStore<AppStore>()(
    persist(
      (set) => ({
        ...initialState,
        setUser: (user) =>
          set(() => ({
            auth: {
              isAuthenticated: Boolean(user),
              user,
            },
          })),
        clearUser: () =>
          set(() => ({
            auth: {
              isAuthenticated: false,
              user: null,
            },
          })),
        setSidebarOpen: (isOpen) =>
          set((state) => ({
            ui: {
              ...state.ui,
              isSidebarOpen: isOpen,
            },
          })),
        toggleSidebar: () =>
          set((state) => ({
            ui: {
              ...state.ui,
              isSidebarOpen: !state.ui.isSidebarOpen,
            },
          })),
      }),
      {
        name: appStoreStorageKey,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          auth: {
            isAuthenticated: state.auth.isAuthenticated,
            user: state.auth.user,
          },
          ui: state.ui,
        }),
        merge: (persistedState, currentState) => {
          const authState = (persistedState as Partial<AppStoreState>)?.auth;
          const uiState = (persistedState as Partial<AppStoreState>)?.ui;

          return {
            ...currentState,
            auth: {
              ...currentState.auth,
              ...authState,
            },
            ui: {
              ...currentState.ui,
              ...uiState,
            },
          };
        },
      },
    ),
  );
}

export type AppStoreApi = ReturnType<typeof createAppStore>;
