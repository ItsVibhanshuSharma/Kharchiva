import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { validateEnvironment } from './validate-environment';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../../../.env'),
      ignoreEnvFile: false,
      validate: validateEnvironment,
    }),
  ],
})
export class ConfigModule {}
