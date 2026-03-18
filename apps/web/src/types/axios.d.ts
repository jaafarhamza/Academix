import "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
    retryAuth?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    skipAuth?: boolean;
    retryAuth?: boolean;
  }
}
