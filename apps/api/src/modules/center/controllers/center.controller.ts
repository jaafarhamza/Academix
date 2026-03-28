import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  ParseFilePipeBuilder,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Public } from '../../../common/decorators/public.decorator';
import { CenterAdminOnly } from '../decorators/center-admin-only.decorator';
import { CurrentCenter } from '../decorators/current-center.decorator';
import { ChangeCenterPasswordDto } from '../dto/change-center-password.dto';
import { CenterLoginDto } from '../dto/center-login.dto';
import { CenterLoginResponseDto } from '../dto/center-login-response.dto';
import { CenterLogoUploadResponseDto } from '../dto/center-logo-upload-response.dto';
import { CenterProfileDto } from '../dto/center-profile.dto';
import { CenterRefreshTokenDto } from '../dto/center-refresh-token.dto';
import { RegisterCenterDto } from '../dto/register-center.dto';
import { RegisterCenterResponseDto } from '../dto/register-center-response.dto';
import { UpdateCenterProfileDto } from '../dto/update-center-profile.dto';
import {
  CenterService,
  type CenterAuthSession,
} from '../services/center.service';
import type { AuthenticatedCenterAdmin } from '../types/authenticated-center-admin.type';

@Controller('centers')
export class CenterController {
  constructor(
    private readonly centerService: CenterService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() payload: CenterLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CenterLoginResponseDto> {
    const authSession = await this.centerService.login(payload);
    this.setRefreshTokenCookie(response, authSession.refreshToken);
    return this.buildPublicAuthResponse(authSession);
  }

  @Post('refresh')
  @Public()
  @SkipThrottle({ auth: true })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Body() payload: CenterRefreshTokenDto = {},
    @Res({ passthrough: true }) response: Response,
  ): Promise<CenterLoginResponseDto> {
    const refreshToken = this.resolveRefreshToken(request, payload);
    try {
      const authSession = await this.centerService.refresh(refreshToken);
      this.setRefreshTokenCookie(response, authSession.refreshToken);
      return this.buildPublicAuthResponse(authSession);
    } catch (error: unknown) {
      this.clearRefreshTokenCookie(response);
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @SkipThrottle({ auth: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response): void {
    this.clearRefreshTokenCookie(response);
  }

  @Post('register')
  @Public()
  @Throttle({ auth: { limit: 3, ttl: 60_000 } })
  register(
    @Body() payload: RegisterCenterDto,
  ): Promise<RegisterCenterResponseDto> {
    return this.centerService.register(payload);
  }

  @Get('profile')
  @SkipThrottle({ auth: true })
  @CenterAdminOnly()
  getProfile(
    @CurrentCenter() center: AuthenticatedCenterAdmin,
  ): Promise<CenterProfileDto> {
    return this.centerService.getProfile(center.center_id);
  }

  @Patch('profile')
  @SkipThrottle({ auth: true })
  @CenterAdminOnly()
  updateProfile(
    @CurrentCenter() center: AuthenticatedCenterAdmin,
    @Body() payload: UpdateCenterProfileDto,
  ): Promise<CenterProfileDto> {
    return this.centerService.updateProfile(center.center_id, payload);
  }

  @Patch('profile/password')
  @SkipThrottle({ auth: true })
  @CenterAdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentCenter() center: AuthenticatedCenterAdmin,
    @Body() payload: ChangeCenterPasswordDto,
  ): Promise<void> {
    await this.centerService.changePassword(center.center_id, payload);
  }

  @Post('logo')
  @SkipThrottle({ auth: true })
  @CenterAdminOnly()
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  uploadLogo(
    @CurrentCenter() center: AuthenticatedCenterAdmin,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .addFileTypeValidator({
          fileType: /^(image\/jpeg|image\/png|image\/webp|image\/svg\+xml)$/i,
        })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ): Promise<CenterLogoUploadResponseDto> {
    return this.centerService.uploadLogo(center.center_id, file);
  }

  private buildPublicAuthResponse(
    session: CenterAuthSession,
  ): CenterLoginResponseDto {
    return {
      accessToken: session.accessToken,
      tokenType: session.tokenType,
      expiresIn: session.expiresIn,
      center: session.center,
    };
  }

  private resolveRefreshToken(
    request: Request,
    payload: CenterRefreshTokenDto,
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
      this.configService.get<string>('centerAuth.refreshCookieName') ??
      'academix_center_refresh_token'
    );
  }

  private getRefreshCookieOptions(): CookieOptions {
    const secure = this.configService.get<boolean>(
      'centerAuth.refreshCookieSecure',
    );
    const sameSite = this.configService.get<'strict' | 'lax' | 'none'>(
      'centerAuth.refreshCookieSameSite',
    );
    const domainValue =
      this.configService.get<string>('centerAuth.refreshCookieDomain') ?? '';
    const domain =
      domainValue.trim().length > 0 ? domainValue.trim() : undefined;
    const path =
      this.configService.get<string>('centerAuth.refreshCookiePath') ??
      '/centers/refresh';
    const maxAge =
      this.configService.get<number>('centerAuth.refreshCookieMaxAgeMs') ??
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
