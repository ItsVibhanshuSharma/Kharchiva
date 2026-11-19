import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/auth/jwt-auth.guard';
import {
  CreateGroupExpenseDto,
  CreateSettlementDto,
  GroupExpenseBodyDto,
  PageQueryDto,
} from './dto/group-expense.dto';
import { AddMemberDto, CreateGroupDto, JoinGroupDto, UpdateGroupDto } from './dto/group.dto';
import { GroupExpensesService } from './group-expenses.service';
import { GroupsService } from './groups.service';

class SetRoleDto {
  @IsEnum({ ADMIN: 'ADMIN', MEMBER: 'MEMBER' })
  role!: 'ADMIN' | 'MEMBER';
}

/** Unauthenticated: lets the invite landing page show which group the link is for. */
@Controller('invites')
export class InvitesController {
  constructor(private readonly groups: GroupsService) {}

  @Get(':code')
  async preview(@Param('code') code: string) {
    return { success: true, data: await this.groups.previewInvite(code) };
  }
}

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(
    private readonly groups: GroupsService,
    private readonly expenses: GroupExpensesService,
  ) {}

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() body: CreateGroupDto) {
    return { success: true, data: await this.groups.create(req.user.id, body) };
  }

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return { success: true, data: await this.groups.list(req.user.id) };
  }

  @Post('join/:code')
  @HttpCode(200)
  async join(@Req() req: AuthenticatedRequest, @Param('code') code: string, @Body() body: JoinGroupDto) {
    return { success: true, data: await this.groups.join(req.user.id, code, body) };
  }

  @Get(':groupId')
  async detail(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string) {
    return { success: true, data: await this.groups.detail(req.user.id, groupId) };
  }

  @Patch(':groupId')
  async update(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string, @Body() body: UpdateGroupDto) {
    return { success: true, data: await this.groups.update(req.user.id, groupId, body) };
  }

  @Delete(':groupId')
  async remove(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string) {
    return { success: true, data: await this.groups.remove(req.user.id, groupId) };
  }

  @Post(':groupId/invite/regenerate')
  @HttpCode(200)
  async regenerateInvite(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string) {
    return { success: true, data: await this.groups.regenerateInvite(req.user.id, groupId) };
  }

  // members

  @Post(':groupId/members')
  async addMember(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string, @Body() body: AddMemberDto) {
    return { success: true, data: await this.groups.addMember(req.user.id, groupId, body) };
  }

  @Patch(':groupId/members/:memberId')
  async setRole(
    @Req() req: AuthenticatedRequest,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @Body() body: SetRoleDto,
  ) {
    return { success: true, data: await this.groups.setRole(req.user.id, groupId, memberId, body.role) };
  }

  @Delete(':groupId/members/:memberId')
  async removeMember(
    @Req() req: AuthenticatedRequest,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
  ) {
    return { success: true, data: await this.groups.removeMember(req.user.id, groupId, memberId) };
  }

  // expenses

  @Post(':groupId/expenses')
  async createExpense(
    @Req() req: AuthenticatedRequest,
    @Param('groupId') groupId: string,
    @Body() body: CreateGroupExpenseDto,
  ) {
    return { success: true, data: await this.expenses.create(req.user.id, groupId, body) };
  }

  @Get(':groupId/expenses')
  async listExpenses(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string) {
    return { success: true, data: await this.expenses.list(req.user.id, groupId) };
  }

  @Get(':groupId/expenses/:expenseId')
  async getExpense(
    @Req() req: AuthenticatedRequest,
    @Param('groupId') groupId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return { success: true, data: await this.expenses.get(req.user.id, groupId, expenseId) };
  }

  @Put(':groupId/expenses/:expenseId')
  async updateExpense(
    @Req() req: AuthenticatedRequest,
    @Param('groupId') groupId: string,
    @Param('expenseId') expenseId: string,
    @Body() body: GroupExpenseBodyDto,
  ) {
    return { success: true, data: await this.expenses.update(req.user.id, groupId, expenseId, body) };
  }

  @Delete(':groupId/expenses/:expenseId')
  async deleteExpense(
    @Req() req: AuthenticatedRequest,
    @Param('groupId') groupId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return { success: true, data: await this.expenses.delete(req.user.id, groupId, expenseId) };
  }

  // settlements

  @Post(':groupId/settlements')
  async createSettlement(
    @Req() req: AuthenticatedRequest,
    @Param('groupId') groupId: string,
    @Body() body: CreateSettlementDto,
  ) {
    return { success: true, data: await this.expenses.createSettlement(req.user.id, groupId, body) };
  }

  @Get(':groupId/settlements')
  async listSettlements(@Req() req: AuthenticatedRequest, @Param('groupId') groupId: string) {
    return { success: true, data: await this.expenses.listSettlements(req.user.id, groupId) };
  }

  @Delete(':groupId/settlements/:settlementId')
  async deleteSettlement(
    @Req() req: AuthenticatedRequest,
    @Param('groupId') groupId: string,
    @Param('settlementId') settlementId: string,
  ) {
    return { success: true, data: await this.expenses.deleteSettlement(req.user.id, groupId, settlementId) };
  }

  // activity

  @Get(':groupId/activity')
  async activity(
    @Req() req: AuthenticatedRequest,
    @Param('groupId') groupId: string,
    @Query() query: PageQueryDto,
  ) {
    return { success: true, data: await this.groups.activity(req.user.id, groupId, query.limit, query.cursor) };
  }
}
