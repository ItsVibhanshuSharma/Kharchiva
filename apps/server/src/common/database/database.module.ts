import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGODB_URI') ??
          'mongodb://127.0.0.1:27017/kharchiva_dev',
        autoIndex: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}