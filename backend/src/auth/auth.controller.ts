import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Cria uma nova conta de usuário' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.register(dto);
    this.setRefreshCookie(response, session.refreshToken);
    return this.buildSessionResponse(session);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Autentica o usuário e retorna access token, renovando refresh token por cookie seguro' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(dto);
    this.setRefreshCookie(response, session.refreshToken);
    return this.buildSessionResponse(session);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Renova o access token usando refresh token recebido por cookie seguro ou body' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.refresh(
      dto.refreshToken ?? this.extractRefreshTokenFromRequest(request),
    );
    this.setRefreshCookie(response, session.refreshToken);
    return this.buildSessionResponse(session);
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Encerra a sessão atual e remove o refresh token' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.extractRefreshTokenFromRequest(request);
    await this.authService.logout(refreshToken);
    this.clearRefreshCookie(response);
    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna os dados do usuário autenticado' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.sub);
  }

  private buildSessionResponse(session: {
    accessToken: string;
    refreshToken: string;
    user: Awaited<ReturnType<AuthService['me']>> | Record<string, unknown>;
  }) {
    return {
      accessToken: session.accessToken,
      user: session.user,
    };
  }

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie(
      this.configService.get<string>('auth.refreshCookieName', 'triluga_refresh_token'),
      refreshToken,
      {
        httpOnly: true,
        secure: this.configService.get<boolean>('auth.refreshCookieSecure', false),
        sameSite: this.normalizeSameSite(
          this.configService.get<string>('auth.refreshCookieSameSite', 'lax'),
        ),
        path: '/api/v1/auth',
        maxAge: this.parseDurationToMs(
          this.configService.get<string>('auth.refreshExpiresIn', '7d'),
        ),
      },
    );
  }

  private clearRefreshCookie(response: Response) {
    response.clearCookie(
      this.configService.get<string>('auth.refreshCookieName', 'triluga_refresh_token'),
      {
        httpOnly: true,
        secure: this.configService.get<boolean>('auth.refreshCookieSecure', false),
        sameSite: this.normalizeSameSite(
          this.configService.get<string>('auth.refreshCookieSameSite', 'lax'),
        ),
        path: '/api/v1/auth',
      },
    );
  }

  private extractRefreshTokenFromRequest(request: Request) {
    const cookieHeader = request.headers.cookie ?? '';
    const cookieName = this.configService.get<string>(
      'auth.refreshCookieName',
      'triluga_refresh_token',
    );

    for (const rawPart of cookieHeader.split(';')) {
      const [name, ...valueParts] = rawPart.trim().split('=');

      if (name !== cookieName) {
        continue;
      }

      return decodeURIComponent(valueParts.join('='));
    }

    return undefined;
  }

  private normalizeSameSite(value: string): 'lax' | 'strict' | 'none' {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'strict' || normalized === 'none') {
      return normalized;
    }

    return 'lax';
  }

  private parseDurationToMs(value: string) {
    const trimmed = value.trim();
    const match = /^(\d+)(ms|s|m|h|d)$/.exec(trimmed);

    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'ms':
        return amount;
      case 's':
        return amount * 1000;
      case 'm':
        return amount * 60 * 1000;
      case 'h':
        return amount * 60 * 60 * 1000;
      case 'd':
      default:
        return amount * 24 * 60 * 60 * 1000;
    }
  }
}
