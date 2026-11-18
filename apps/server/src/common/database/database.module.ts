import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI');
        if (!uri) {
          throw new Error('MONGODB_URI must be configured');
        }
        return {
          uri,
          autoIndex: config.get<string>('NODE_ENV') !== 'production',
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
