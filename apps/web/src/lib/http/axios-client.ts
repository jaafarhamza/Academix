import axios, { AxiosError, AxiosHeaders, type AxiosInstance } from "axios";

import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth/token-storage";
import { clientEnv } from "@/lib/env/client-env";

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let refreshPromise: Promise<string> | null = null;
const configuredClients = new WeakSet<AxiosInstance>();

export const apiClient = axios.create({
  baseURL: clientEnv.apiBaseUrl,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

function setAuthorizationHeader(headers: AxiosHeaders, token: string) {
  const value = `Bearer ${token}`;
  headers.set("Authorization", value);
}

function extractAccessToken(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.accessToken === "string" && payload.accessToken) {
    return payload.accessToken;
  }

  if (typeof payload.access_token === "string" && payload.access_token) {
    return payload.access_token;
  }

  if (typeof payload.token === "string" && payload.token) {
    return payload.token;
  }

  if (!payload.data || typeof payload.data !== "object") {
    return null;
  }

  const nested = payload.data as Record<string, unknown>;

  if (typeof nested.accessToken === "string" && nested.accessToken) {
    return nested.accessToken;
  }

  if (typeof nested.access_token === "string" && nested.access_token) {
    return nested.access_token;
  }

  if (typeof nested.token === "string" && nested.token) {
    return nested.token;
  }

  return null;
}

function isRefreshRequest(url: string | undefined) {
  if (!url) {
    return false;
  }

  const refreshPath = clientEnv.authRefreshPath;
  return (
    url.includes(`/${refreshPath}`) ||
    url.endsWith(refreshPath) ||
    url === refreshPath
  );
}

async function refreshAccessToken(client: AxiosInstance) {
  if (!refreshPromise) {
    refreshPromise = client
      .post(clientEnv.authRefreshPath, undefined, {
        skipAuth: true,
      })
      .then((response) => {
        const accessToken = extractAccessToken(response.data);

        if (!accessToken) {
          throw new Error("No access token returned by /auth/refresh");
        }

        setAccessToken(accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export function configureApiInterceptors(client: AxiosInstance = apiClient) {
  if (configuredClients.has(client)) {
    return client;
  }

  client.interceptors.request.use((config) => {
    if (config.skipAuth) {
      return config;
    }

    const token = getAccessToken();

    if (!token) {
      return config;
    }

    const headers = AxiosHeaders.from(config.headers);
    setAuthorizationHeader(headers, token);
    config.headers = headers;

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const status = error.response?.status;
      const originalRequest = error.config;

      if (!originalRequest || status !== 401) {
        return Promise.reject(error);
      }

      if (originalRequest.skipAuth) {
        return Promise.reject(error);
      }

      if (
        originalRequest.retryAuth ||
        isRefreshRequest(originalRequest.url)
      ) {
        clearAccessToken();
        unauthorizedHandler?.();
        return Promise.reject(error);
      }

      originalRequest.retryAuth = true;

      try {
        const nextAccessToken = await refreshAccessToken(client);
        const headers = AxiosHeaders.from(originalRequest.headers);
        setAuthorizationHeader(headers, nextAccessToken);
        originalRequest.headers = headers;

        return client(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        unauthorizedHandler?.();
        return Promise.reject(refreshError);
      }
    },
  );

  configuredClients.add(client);
  return client;
}

configureApiInterceptors();
