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
        return res.status(404).json({
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

  @Post('/new-case')
  async createNewCase(
    @Headers() headers,
    @Req() req,
    @Res() res: Response,
  ) {

    
    let typeResponse = 0;
    
    try {
      if (typeResponse > 0) {
        throw 'Error';
      }
      
      const body = req.body;

      const newCase = {} as any;

      if(body?.subtipo2?.codigo.toString() === '81' ){
        throw 'Error';
      }

      await this.lowdbService.initDatabase(
        './src/modules/feda-mock/json/feda-cases.json',
      );

      newCase.id = 101;
      newCase.fechaAlta = '2024-09-06';
      newCase.nroCaso = 'CAS-14209-2024';
      newCase.usuGeneradorNombre =  "Prestador";
      newCase.usuGeneradorRol =  "Prestador";
      newCase.titulo = body.titulo;
      newCase.descripcion = "Si estas soluciones no resuelven el problema, puede haber un problema más profundo con el entorno o la configuración del sistema operativo. Considera revisar logs detallados o usar un depurador para identificar el origen del problema.";
      newCase.usuPropietario = null;
      newCase.usuPropietarioNombre = "Externo";
      newCase.usuPropietarioEmail = "ambulancias@clinicas.com.ar";
      newCase.usuPropietarioRol = null;
      newCase.vencimientoSla = "2024-07-31 10:30";
      newCase.slaTimeCounter = "2:45";
      newCase.slaTimerStatus = "timer_down";
      newCase.estado = {
        id: 6,
        descripcion: "Asignado",
        nombre: "Asignado"
      };
      newCase.grupoCodigo= 2;
      newCase.fechaModificacion= null;
      newCase.areaCodigo= body.area.codigo;
      newCase.emailContacto= "jose.garay@fluxit.com.ar";
      newCase.emailReceptor= null;
      newCase.creacionAutomatica= true;
      newCase.motivo= {
        id: body.motivoId,
        tiempoSLA: null,
        nombre: "Consulta derivaciones"
      };
      newCase.ultimoAnalista="",
      newCase.tipo= body.tipo.nombre,
      newCase.subtipo1= body.subtipo.nombre,
      newCase.subtipo2= body.subtipo2.nombre,
      newCase.destinatarios= {
        principal: body.destinatarios.principal,
        conCopia: [...body.destinatarios.conCopia],
        conCopiaOculta: [...body.destinatarios.conCopiaOculta]
      }

      await this.lowdbService.add(newCase, 'cases');
      
      return res.status(HttpStatus.OK).json({
        codigoResultado: HttpStatus.OK
      });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al crear caso',
      });
    }
  }
}
  