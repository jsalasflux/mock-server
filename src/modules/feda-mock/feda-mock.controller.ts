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
  
  @Controller('feda/api')
  export class FedaMockController {
    constructor(private readonly lowdbService: LowdbService) {
      
    }
  
    // Obtiene data
    @Get('/data')
    async getFedaData(@Headers() headers, @Res() res: Response) {
      const typeResponse = 0;
  
      try {
        if (typeResponse > 0) {
          throw 'Error interno';
        }
  
        await this.lowdbService.initDatabase(
          './src/modules/feda-mock/json/feda-data.json',
        );

        const user = await this.lowdbService.find(
          { id: "123456" },
          'users',
        );
  
        return res.status(HttpStatus.OK).json({
          user: user
        });
      } catch (error) {
        return res.status(406).json({
          codigoResultado: '99',
          descripcionResultado:
            'Error al obtener la data para el usuario',
        });
      }
    }

    // Obtiene reasons
    @Get('/reasons')
    async getReasons(@Headers() headers, @Res() res: Response) {
      const typeResponse = 0;
  
      try {
        if (typeResponse > 0) {
          throw 'Error interno';
        }
  
        await this.lowdbService.initDatabase(
          './src/modules/feda-mock/json/feda-reasons.json',
        );

        const reasons = await this.lowdbService.findAll(
          'reasons',
        );
  
        return res.status(HttpStatus.OK).json(reasons);
      } catch (error) {
        return res.status(406).json({
          codigoResultado: '99',
          descripcionResultado:
            'Error al obtener los reasons para el usuario',
        });
      }
    }

    // Obtiene casos
    @Get('/cases')
    async getCases(@Headers() headers, @Res() res: Response) {
      const typeResponse = 0;
  
      try {
        if (typeResponse > 0) {
          throw 'Error interno';
        }
  
        await this.lowdbService.initDatabase(
          './src/modules/feda-mock/json/feda-cases.json',
        );

        const cases = await this.lowdbService.findAll(
          'cases',
        );
  
        return res.status(HttpStatus.OK).json(cases);
      } catch (error) {
        return res.status(406).json({
          codigoResultado: '99',
          descripcionResultado:
            'Error al obtener los casos para el usuario',
        });
      }
    }
    
    // Obtiene caso por id
    @Get('/case-detail/:caseId')
    async getCaseDetailById(@Headers() headers, @Req() req: Request, @Res() res: Response) {
      const typeResponse = 0;
      const idCase = req.params.caseId;

      try {
        if (typeResponse > 0) {
          throw 'Error interno';
        }
        
        await this.lowdbService.initDatabase(
          './src/modules/feda-mock/json/feda-cases-detail.json',
        );
        
        const caseDetail = await this.lowdbService.find(
          { id: Number(idCase) },
          'cases-detail',
        );

        return res.status(HttpStatus.OK).json(caseDetail);
      } catch (error) {
        return res.status(406).json({
          codigoResultado: '99',
          descripcionResultado:
            'Error al obtener el caso para el usuario',
        });
      }
    }
}
  