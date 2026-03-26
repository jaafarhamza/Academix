import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentSuperAdmin } from '../decorators/current-super-admin.decorator';
import { SuperAdminOnly } from '../decorators/super-admin-only.decorator';
import { SuperAdminLoginDto } from '../dto/super-admin-login.dto';
import { SuperAdminLoginResponseDto } from '../dto/super-admin-login-response.dto';
import { SuperAdminProfileDto } from '../dto/super-admin-profile.dto';
import { SuperAdminRefreshTokenDto } from '../dto/super-admin-refresh-token.dto';
import {
  SuperAdminService,
  type SuperAdminAuthSession,
} from '../services/super-admin.service';
import type { AuthenticatedSuperAdmin } from '../types/authenticated-super-admin.type';

@Controller('super-admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() payload: SuperAdminLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SuperAdminLoginResponseDto> {
    const authSession = await this.superAdminService.login(payload);
    this.setRefreshTokenCookie(response, authSession.refreshToken);
    return this.buildPublicAuthResponse(authSession);
  }

  @Post('refresh')
  @Public()
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Body() payload: SuperAdminRefreshTokenDto = {},
    @Res({ passthrough: true }) response: Response,
  ): Promise<SuperAdminLoginResponseDto> {
    const refreshToken = this.resolveRefreshToken(request, payload);
    try {
      const authSession = await this.superAdminService.refresh(refreshToken);
      this.setRefreshTokenCookie(response, authSession.refreshToken);
      return this.buildPublicAuthResponse(authSession);
    } catch (error: unknown) {
      this.clearRefreshTokenCookie(response);
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response): void {
    this.clearRefreshTokenCookie(response);
  }

  @Get('profile')
  @SuperAdminOnly()
  getProfile(
    @CurrentSuperAdmin() superAdmin: AuthenticatedSuperAdmin,
  ): Promise<SuperAdminProfileDto> {
    return this.superAdminService.getProfile(superAdmin.id);
  }

  private buildPublicAuthResponse(
    session: SuperAdminAuthSession,
  ): SuperAdminLoginResponseDto {
    return {
      accessToken: session.accessToken,
      tokenType: session.tokenType,
      expiresIn: session.expiresIn,
      superAdmin: session.superAdmin,
    };
  }

  private resolveRefreshToken(
    request: Request,
    payload: SuperAdminRefreshTokenDto,
  ): string {
    const refreshCookieName = this.getRefreshCookieName();
    const cookieToken =
      typeof request.cookies?.[refreshCookieName] === 'string'
        ? request.cookies[refreshCookieName]
        : null;

    if (cookieToken) {
      return cookieToken;
    }

    return payload.refreshToken ?? '';
  }

  private getRefreshCookieName(): string {
    return (
      this.configService.get<string>('superAdminAuth.refreshCookieName') ??
      'academix_super_admin_refresh_token'
    );
  }

  private getRefreshCookieOptions(): CookieOptions {
    const secure = this.configService.get<boolean>(
      'superAdminAuth.refreshCookieSecure',
    );
    const sameSite = this.configService.get<'strict' | 'lax' | 'none'>(
      'superAdminAuth.refreshCookieSameSite',
    );
    const domainValue =
      this.configService.get<string>('superAdminAuth.refreshCookieDomain') ??
      '';
    const domain =
      domainValue.trim().length > 0 ? domainValue.trim() : undefined;
    const path =
      this.configService.get<string>('superAdminAuth.refreshCookiePath') ??
      '/super-admin/refresh';
    const maxAge =
      this.configService.get<number>('superAdminAuth.refreshCookieMaxAgeMs') ??
      7 * 24 * 60 * 60 * 1000;

    const resolvedSecure = secure ?? false;
    const resolvedSameSite =
      sameSite === 'none' && !resolvedSecure ? 'lax' : (sameSite ?? 'lax');

    return {
      httpOnly: true,
      secure: resolvedSecure,
      sameSite: resolvedSameSite,
      path,
      maxAge,
      domain,
    };
  }

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
  ): void {
    response.cookie(
      this.getRefreshCookieName(),
      refreshToken,
      this.getRefreshCookieOptions(),
    );
  }

  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(
      this.getRefreshCookieName(),
      this.getRefreshCookieOptions(),
    );
  }
}
