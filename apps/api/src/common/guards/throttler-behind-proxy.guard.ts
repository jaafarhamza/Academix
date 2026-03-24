import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected override getTracker(req: Request): Promise<string> {
    if (Array.isArray(req.ips) && req.ips.length > 0) {
      return Promise.resolve(req.ips[0] as string);
    }

    return Promise.resolve(req.ip ?? 'unknown');
  }
}
