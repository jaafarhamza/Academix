import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { RequestContext } from '../types/request-context.type';

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run(context: RequestContext, callback: () => void): void {
    this.storage.run(context, callback);
  }

  getCenterId(): string | null {
    return this.storage.getStore()?.center_id ?? null;
  }
}
