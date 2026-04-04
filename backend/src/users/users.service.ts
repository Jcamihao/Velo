import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateUserInput = {
  email: string;
  passwordHash: string;
  role: Role;
  profile: {
    fullName: string;
    phone: string;
    zipCode: string;
    addressLine: string;
    addressComplement?: string;
    city: string;
    state: string;
  };
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(input: CreateUserInput) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException('Este e-mail já está em uso.');
    }

    if (input.role === Role.ADMIN) {
      throw new ForbiddenException(
        'Não é permitido criar contas administrativas publicamente.',
      );
    }

    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        role: input.role,
        profile: {
          create: {
            fullName: input.profile.fullName,
            phone: input.profile.phone,
            zipCode: input.profile.zipCode,
            addressLine: input.profile.addressLine,
            addressComplement: input.profile.addressComplement,
            city: input.profile.city,
            state: input.profile.state,
          },
        },
      },
      include: {
        profile: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        profile: true,
      },
    });
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  async listAll(params?: {
    role?: Role;
    status?: UserStatus;
    take?: number;
    skip?: number;
  }) {
    return this.prisma.user.findMany({
      where: {
        role: params?.role,
        status: params?.status,
      },
      include: {
        profile: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: params?.take ?? 20,
      skip: params?.skip ?? 0,
    });
  }

  async updateRefreshToken(userId: string, refreshTokenHash: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  async updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async updateStatus(userId: string, status: UserStatus) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      include: {
        profile: true,
      },
    });
  }

  async sanitizeUser(
    user:
      | Prisma.UserGetPayload<{
          include: { profile: true };
        }>
      | Awaited<ReturnType<UsersService['findById']>>,
  ) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      analyticsConsentGranted: user.analyticsConsentGranted,
      analyticsConsentUpdatedAt: user.analyticsConsentUpdatedAt,
      profile: this.sanitizeSessionProfile(user.profile),
    };
  }

  sanitizeSessionProfile(
    profile:
      | {
          fullName: string;
          phone: string;
          zipCode: string | null;
          addressLine: string | null;
          addressComplement: string | null;
          city: string;
          state: string;
          avatarUrl: string | null;
          documentVerificationStatus: VerificationStatus;
          driverLicenseVerification: VerificationStatus;
        }
      | null
      | undefined,
  ) {
    if (!profile) {
      return null;
    }

    return {
      fullName: profile.fullName,
      phone: profile.phone,
      zipCode: profile.zipCode,
      addressLine: profile.addressLine,
      addressComplement: profile.addressComplement,
      city: profile.city,
      state: profile.state,
      avatarUrl: profile.avatarUrl,
      documentVerificationStatus: profile.documentVerificationStatus,
      driverLicenseVerification: profile.driverLicenseVerification,
    };
  }
}
