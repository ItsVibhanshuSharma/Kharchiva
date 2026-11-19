import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../users/user.schema';
import { GroupExpensesService } from './group-expenses.service';
import {
  Group,
  GroupActivity,
  GroupActivitySchema,
  GroupExpense,
  GroupExpenseSchema,
  GroupMember,
  GroupMemberSchema,
  GroupSchema,
  GroupSettlement,
  GroupSettlementSchema,
} from './group.schemas';
import { GroupsController, InvitesController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupMember.name, schema: GroupMemberSchema },
      { name: GroupExpense.name, schema: GroupExpenseSchema },
      { name: GroupSettlement.name, schema: GroupSettlementSchema },
      { name: GroupActivity.name, schema: GroupActivitySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [GroupsController, InvitesController],
  providers: [GroupsService, GroupExpensesService],
})
export class GroupsModule {}
