import { Module } from '@nestjs/common';
import { ConfigModule } from './common/config/config.module';
import { DatabaseModule } from './common/database/database.module';
import { QueueInfrastructureModule } from './common/queue/queue.module';
import { HealthModule } from './common/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { PaymentSourcesModule } from './modules/payment-sources/payment-sources.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { IncomesModule } from './modules/incomes/incomes.module';
import { RecurringExpensesModule } from './modules/recurring-expenses/recurring-expenses.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SyncModule } from './modules/sync/sync.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DevicesModule } from './modules/devices/devices.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    QueueInfrastructureModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OnboardingModule,
    CategoriesModule,
    PaymentSourcesModule,
    ExpensesModule,
    IncomesModule,
    RecurringExpensesModule,
    BudgetsModule,
    DashboardModule,
    ReportsModule,
    SyncModule,
    NotificationsModule,
    DevicesModule,
    JobsModule,
    EmailModule,
  ],
})
export class AppModule {}
