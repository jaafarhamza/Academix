import { Injectable, type NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { decode, verify, type JwtPayload } from 'jsonwebtoken';
import {
  USER_ACCESS_TOKEN_TYPE,
  USER_AUTH_AUDIENCE,
  USER_AUTH_ISSUER,
} from '../../modules/auth/constants/user-auth.constants';
import {
  CENTER_AUDIENCE,
  CENTER_ISSUER,
} from '../../modules/center/constants/center-auth.constants';
import { SUPER_ADMIN_AUDIENCE } from '../../modules/super-admin/constants/super-admin-auth.constants';
import { RequestContextService } from '../services/request-context.service';
import type { RequestContext } from '../types/request-context.type';
import type { RequestWithTenant } from '../types/request-with-tenant.type';

const UUID_V4_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VerificationProfile = {
  kind: 'user' | 'center';
  secret: string;
  issuer: string;
  audience: string;
};

type VerifiedPayload = Record<string, unknown>;

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly requestContextService: RequestContextService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const request = req as RequestWithTenant;

    delete request.center_id;
    delete request.tenant;

    let centerId: string | null = null;
    const token = this.extractBearerToken(req.headers.authorization);
    if (token) {
      const verificationProfile = this.resolveVerificationProfile(token);
      if (verificationProfile) {
        const payload = this.verifyToken(token, verificationProfile);
        if (payload) {
          centerId = this.extractCenterId(payload, verificationProfile.kind);
        }
      }
    }

    this.requestContextService.run(
      {
        center_id: centerId,
      } satisfies RequestContext,
      () => {
        if (centerId) {
          request.center_id = centerId;
          request.tenant = { center_id: centerId };
        }
        next();
      },
    );
  }

  private resolveVerificationProfile(
    token: string,
  ): VerificationProfile | null {
    const decoded = decode(token);
    if (!decoded || typeof decoded === 'string') {
      return null;
    }

    const audience = this.readAudience(decoded);
    if (!audience || audience === SUPER_ADMIN_AUDIENCE) {
      return null;
    }

    if (audience === USER_AUTH_AUDIENCE) {
      return {
        kind: 'user',
        secret:
          this.configService.get<string>('userAuth.jwtSecret') ?? 'change-me',
        issuer: USER_AUTH_ISSUER,
        audience: USER_AUTH_AUDIENCE,
      };
    }

    if (audience === CENTER_AUDIENCE) {
      return {
        kind: 'center',
        secret:
          this.configService.get<string>('centerAuth.jwtSecret') ?? 'change-me',
        issuer: CENTER_ISSUER,
        audience: CENTER_AUDIENCE,
      };
    }

    return null;
  }

  private verifyToken(
    token: string,
    profile: VerificationProfile,
  ): VerifiedPayload | null {
    try {
      const payload = verify(token, profile.secret, {
        algorithms: ['HS256'],
        issuer: profile.issuer,
        audience: profile.audience,
      });

      if (!payload || typeof payload === 'string') {
        return null;
      }

      return payload as VerifiedPayload;
    } catch {
      return null;
    }
  }

  private extractCenterId(
    payload: VerifiedPayload,
    kind: VerificationProfile['kind'],
  ): string | null {
    const tokenType = this.readStringClaim(payload, 'token_type');
    if (kind === 'user' && tokenType !== USER_ACCESS_TOKEN_TYPE) {
      return null;
    }

    const centerId = this.readStringClaim(payload, 'center_id');
    if (!centerId || !UUID_V4_LIKE_REGEX.test(centerId)) {
      return null;
    }

    return centerId;
  }

  private extractBearerToken(authorization: string | undefined): string | null {
    if (!authorization) {
      return null;
    }

    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (!match || !match[1]) {
      return null;
    }

    return match[1];
  }

  private readAudience(payload: JwtPayload): string | null {
    if (typeof payload.aud === 'string') {
      return payload.aud;
    }

    if (Array.isArray(payload.aud)) {
      const firstAudience = payload.aud.find(
        (value): value is string =>
          typeof value === 'string' && value.length > 0,
      );
      return firstAudience ?? null;
    }

    return null;
  }

  private readStringClaim(
    payload: VerifiedPayload,
    claimName: string,
  ): string | null {
    const claim = payload[claimName];
    return typeof claim === 'string' ? claim : null;
  }
}
