/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Controller,
    Post,
    HttpStatus,
    Req,
    Res,
    Get,
    Put,
    Delete,
    Param,
    Headers,
  } from '@nestjs/common';
  import { Request, Response } from 'express';
  import { LowdbService } from '../../lowdb/lowdb.service';
  import { getFecha, randomDate } from '../../utils/functions/fechas';
  import { getUserNameFromJWTToken } from '../../utils/functions/getUserNameFromJWTToken';
  import { getRandomInt } from '../../utils/functions/random';
  import { formatNumber } from '../../utils/functions/formatNumber';
  
  @Controller('api-gateway/context-service/auth')
  export class FedaLoginMockController {
    constructor(private readonly lowdbService: LowdbService) {
      
    }
  
    // Obtiene datos de usuario
    @Post('/login')
    async getFedaData(@Headers() headers, @Res() res: Response) {
      const typeResponse = 0;
  
      try {
        if (typeResponse > 0) {
          throw 'Error interno';
        }
  
        await this.lowdbService.initDatabase(
          './src/modules/feda-login-mock/json/feda-login.json',
        );

        const user = await this.lowdbService.find(
          { id: "15475-P" },
          'users',
        );
  
        return res.status(HttpStatus.OK).json(user);
      } catch (error) {
        return res.status(406).json({
          codigoResultado: '99',
          descripcionResultado:
            'Error al obtener los datos de usuario',
        });
      }
    }
}
  