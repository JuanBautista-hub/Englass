import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LessonsService } from '../lessons/lessons.service';
import { RateLimitStore } from './rate-limit.store';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';
import type { MeView } from '@engclass/shared';

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; displayName: string };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly lessons: LessonsService,
    private readonly jwt: JwtService,
    private readonly rateLimits: RateLimitStore,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResult> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('email_already_registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });
    try {
      const result = await this.lessons.autoEnrollAllForUser(user.id);
      this.logger.log(
        `auto-enrolled user ${user.id}: ${result.enrolled} new, ${result.skipped} skipped`,
      );
    } catch (err: unknown) {
      this.logger.warn(
        `auto-enroll failed for user ${user.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('invalid_credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('invalid_credentials');
    }
    return this.buildAuthResult({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  }

  async me(userId: string): Promise<MeView | null> {
    const user = await this.users.findById(userId);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      level: null,
      currentStreak: user.currentStreak,
    };
  }

  async logout(userId: string): Promise<void> {
    this.rateLimits.clearUser(userId);
  }

  private buildAuthResult(user: { id: string; email: string; displayName: string }): AuthResult {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwt.sign(payload),
      user,
    };
  }
}
