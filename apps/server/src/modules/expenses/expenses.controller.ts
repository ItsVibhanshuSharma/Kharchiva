import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/auth/jwt-auth.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesDto } from './dto/list-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() body: CreateExpenseDto) {
    const result = await this.expenses.create(request.user.id, body);
    return { success: true, data: result.expense };
  }

  @Get()
  async list(@Req() request: AuthenticatedRequest, @Query() query: ListExpensesDto) {
    return { success: true, data: await this.expenses.list(request.user.id, query) };
  }

  @Get(':expenseId')
  async get(@Req() request: AuthenticatedRequest, @Param('expenseId') expenseId: string) {
    return { success: true, data: await this.expenses.get(request.user.id, expenseId) };
  }

  @Patch(':expenseId')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('expenseId') expenseId: string,
    @Body() body: UpdateExpenseDto,
  ) {
    return { success: true, data: await this.expenses.update(request.user.id, expenseId, body) };
  }

  @Delete(':expenseId')
  async delete(@Req() request: AuthenticatedRequest, @Param('expenseId') expenseId: string) {
    return { success: true, data: await this.expenses.delete(request.user.id, expenseId) };
  }
}
