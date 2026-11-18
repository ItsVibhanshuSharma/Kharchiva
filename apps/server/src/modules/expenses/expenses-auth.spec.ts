import 'reflect-metadata';
import { GUARDS_METADATA, MODULE_METADATA } from '@nestjs/common/constants';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesModule } from './expenses.module';

describe('ExpensesController authentication', () => {
  it('requires the real JWT guard on every expense route', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ExpensesController)).toContain(JwtAuthGuard);
  });

  it('exports the registered auth models with the guard to importing feature modules', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, AuthModule)).toContain(JwtAuthGuard);
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, AuthModule)).toContain(MongooseModule);
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, ExpensesModule)).toContain(AuthModule);
  });
});
