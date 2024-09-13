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
  
  @Controller('feda/api/usuarios')
  export class FedaUsuariosMockController {
    constructor(private readonly lowdbService: LowdbService) {
      
    }
    // Obtiene casos
    @Get('/analistas')
    async getCases(@Headers() headers, @Res() res: Response) {
      const typeResponse = 0;
  
      try {
        if (typeResponse > 0) {
          throw 'Error interno';
        }
  
        await this.lowdbService.initDatabase(
          './src/modules/feda-usuarios-mock/json/feda-usuarios.json',
        );

        const cases = await this.lowdbService.findAll(
          'usuarios-analistas',
        );
  
        return res.status(HttpStatus.OK).json(cases);
      } catch (error) {
        return res.status(404).json({
          codigoResultado: '99',
          descripcionResultado:
            'Error al obtener los casos para el usuario',
        });
      }
    }
    
}
  