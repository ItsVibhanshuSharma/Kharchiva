import { Module } from '@nestjs/common';
import { ConfigModule } from './common/config/config.module';
import { DatabaseModule } from './common/database/database.module';
import { QueueInfrastructureModule } from './common/queue/queue.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [ConfigModule, DatabaseModule, QueueInfrastructureModule, JobsModule],
})
export class WorkerModule {}