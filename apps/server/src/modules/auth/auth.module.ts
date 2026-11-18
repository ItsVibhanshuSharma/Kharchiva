import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import {
  AuthRateLimit,
  AuthRateLimitSchema,
  AuthSession,
  AuthSessionSchema,
  OtpChallenge,
  OtpChallengeSchema,
} from './auth.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: OtpChallenge.name, schema: OtpChallengeSchema },
      { name: AuthSession.name, schema: AuthSessionSchema },
      { name: AuthRateLimit.name, schema: AuthRateLimitSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  // Re-export the registered model providers with the guard. Nest resolves
  // controller guards in the consuming module context; exposing MongooseModule
  // keeps the guard's AuthSessionModel dependency available without registering
  // the same model a second time in each feature module.
  exports: [JwtAuthGuard, MongooseModule],
})
export class AuthModule {}
