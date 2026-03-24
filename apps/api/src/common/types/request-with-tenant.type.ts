import type { Request } from 'express';

export type TenantContext = {
  center_id: string;
};

export type RequestWithTenant = Request & {
  center_id?: string;
  tenant?: TenantContext;
};
