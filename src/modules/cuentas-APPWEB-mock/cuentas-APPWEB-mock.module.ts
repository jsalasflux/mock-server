import { Module } from '@nestjs/common';
import { CuentasAPPWEBMockController } from './cuentas-APPWEB-mock.controller';
import { LowdbService } from '../../lowdb/lowdb.service';

@Module({
  controllers: [CuentasAPPWEBMockController],
  providers: [LowdbService],
})
export class CuentasAPPWEBMockModule {}
