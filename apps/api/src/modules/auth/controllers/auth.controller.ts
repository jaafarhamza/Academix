import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { AuthStatusResponseDto } from '../dto/auth-status-response.dto';
import { UserLoginDto } from '../dto/user-login.dto';
import { UserLoginResponseDto } from '../dto/user-login-response.dto';
import { UserRefreshTokenDto } from '../dto/user-refresh-token.dto';
import { UserJwtAuthGuard } from '../guards/user-jwt-auth.guard';
import { AuthService, type UserAuthSession } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() payload: UserLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserLoginResponseDto> {
    const authSession = await this.authService.login(payload);
    this.setRefreshTokenCookie(response, authSession.refreshToken);
    return this.buildPublicAuthResponse(authSession);
  }

  @Post('refresh')
  @Public()
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Body() payload: UserRefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserLoginResponseDto> {
    const refreshToken = this.resolveRefreshToken(request, payload);
    try {
      const authSession = await this.authService.refresh(refreshToken);
      this.setRefreshTokenCookie(response, authSession.refreshToken);
      return this.buildPublicAuthResponse(authSession);
    } catch (error: unknown) {
      this.clearRefreshTokenCookie(response);
      throw error;
    }
  }

  @Get('status')
  @UseGuards(UserJwtAuthGuard)
  getStatus(): AuthStatusResponseDto {
    return this.authService.getStatus();
  }

  private buildPublicAuthResponse(
    session: UserAuthSession,
  ): UserLoginResponseDto {
    return {
      accessToken: session.accessToken,
      tokenType: session.tokenType,
      expiresIn: session.expiresIn,
      user: session.user,
    };
  }

  private resolveRefreshToken(
    request: Request,
    payload: UserRefreshTokenDto,
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
      this.configService.get<string>('userAuth.refreshCookieName') ??
      'academix_refresh_token'
    );
  }

  private getRefreshCookieOptions(): CookieOptions {
    const secure = this.configService.get<boolean>(
      'userAuth.refreshCookieSecure',
    );
    const sameSite = this.configService.get<'strict' | 'lax' | 'none'>(
      'userAuth.refreshCookieSameSite',
    );
    const domainValue =
      this.configService.get<string>('userAuth.refreshCookieDomain') ?? '';
    const domain =
      domainValue.trim().length > 0 ? domainValue.trim() : undefined;
    const path =
      this.configService.get<string>('userAuth.refreshCookiePath') ??
      '/auth/refresh';
    const maxAge =
      this.configService.get<number>('userAuth.refreshCookieMaxAgeMs') ??
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
