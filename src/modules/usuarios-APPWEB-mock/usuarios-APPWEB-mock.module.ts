import { Module } from '@nestjs/common';
import { UsuariosAPPWEBMockController } from './usuarios-APPWEB-mock.controller';
import { LowdbService } from '../../lowdb/lowdb.service';
@Module({
  controllers: [UsuariosAPPWEBMockController],
  providers: [LowdbService],
})
export class UsuariosAPPWEBMockModule {}
