import type { AppStore } from "./app-store";

export const selectAuthState = (state: AppStore) => state.auth;
export const selectCurrentUser = (state: AppStore) => state.auth.user;
export const selectIsAuthenticated = (state: AppStore) =>
  state.auth.isAuthenticated;

export const selectUiState = (state: AppStore) => state.ui;
export const selectIsSidebarOpen = (state: AppStore) => state.ui.isSidebarOpen;
