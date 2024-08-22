import {
  Controller,
  HttpStatus,
  Headers,
  Post,
  Req,
  Res,
} from '@nestjs/common';

import { Request, Response } from 'express';
import { LowdbService } from '../../lowdb/lowdb.service';
import { getUserNameFromJWTToken } from '../../utils/functions/getUserNameFromJWTToken';

@Controller('firmas-APPWEB/rest-api')
export class FirmasAPPWEBMockController {
  constructor(private readonly lowdbService: LowdbService) {}

  // Obtiene las acciones permitidas
  @Post('/esquema/acciones')
  async getAccionesDisponibles(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cuit = headers.cuit;
    const nroCuenta = req.body.nroCuenta;
    const operacion = req.body.operacion;
    const typeResponse = 0;

    try {
      if (typeResponse > 0) {
        throw 'Error interno';
      }

      await this.lowdbService.initDatabase(
        './src/modules/usuarios-APPWEB-mock/json/usuarios.json',
      );

      const aliasUsuarioLogueado = getUserNameFromJWTToken(
        headers.authorization,
      );

      const usuario = await this.lowdbService.find(
        { alias: aliasUsuarioLogueado },
        'usuarios',
      );

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/cuentas-por-cuit.json',
      );

      const empresa = await this.lowdbService.find({ cuit }, 'cuentasPorCuit');
      const cuenta = empresa.datos.find(
        (cuenta) => cuenta.nroCuenta === nroCuenta,
      );
      const esFirmante = cuenta.firmantes.includes(usuario.cuil);
      // Solo se evalua si puede enviar si el tipo de transferencia es inmediata
      let puedeEnviar = false;
      const enviadores = cuenta.enviadores;
      const firmantes = cuenta.firmantes;
      if (operacion === 'TON') {
        const esEnviador = enviadores.includes(usuario.cuil);
        const completaEsquema =
          enviadores.length === 1 &&
          this.equalsIgnoreOrder(enviadores, firmantes);
        if (esEnviador && completaEsquema) {
          puedeEnviar = true;
        }
      }
      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        puedeFirmar: esFirmante,
        puedeEnviar: puedeEnviar,
      });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado:
          'Error al obtener tipo de acciones de transferencia',
      });
    }
  }

  // Obtiene informacion firmante y si ya se firmo
  @Post('/firmas/acciones')
  async getVerificarFirma(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cuit = headers.cuit;
    const nroCuenta = req.body.nroCuenta;
    const tipoCuenta = req.body.tipoCuenta;
    const operaciones = req.body.operaciones;
    const typeResponse = 0;

    const error99 = {
      status: 406,
      codigoResultado: '99',
      descripcionResultado:
        'Error al obtener tipo de acciones de transferencia',
    };

    const error55 = {
      status: 406,
      codigoResultado: '55',
      descripcionResultado: 'Tu mandato esta vencido',
    };

    try {
      if ((typeResponse as number) === 1) {
        throw error99;
      }
      if ((typeResponse as number) === 2) {
        throw error55;
      }
      await this.lowdbService.initDatabase(
        './src/modules/usuarios-APPWEB-mock/json/usuarios.json',
      );

      const aliasUsuarioLogueado = getUserNameFromJWTToken(
        headers.authorization,
      );

      const usuario = await this.lowdbService.find(
        { alias: aliasUsuarioLogueado },
        'usuarios',
      );

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/cuentas-por-cuit.json',
      );

      const empresa = await this.lowdbService.find({ cuit }, 'cuentasPorCuit');
      const cuenta = empresa.datos.find(
        (cuenta) => cuenta.nroCuenta === nroCuenta,
      );
      const esFirmante = cuenta.firmantes.includes(usuario.cuil);

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/transferencias.json',
      );

      const transferencias = await this.lowdbService.findAll('transferencias');
      let transferenciasCuenta = [];
      // Busco por tipo y numero de cuenta
      if (nroCuenta && tipoCuenta) {
        transferenciasCuenta = transferencias.filter((transferencia) => {
          return (
            transferencia.numeroCuentaDebito === nroCuenta &&
            transferencia.tipoCuentaDebitoId === tipoCuenta
          );
        });
      }
      const acciones = [];
      operaciones.forEach((operacion) => {
        const transferencia = transferenciasCuenta.find(
          (transferencia) => transferencia.nroTransferencia === operacion,
        );
        if (transferencia) {
          const yaFirmo = transferencia.firmas
            ? transferencia.firmas.includes(usuario.cuil)
            : false;
          const firmasPosibles = [usuario.cuil].concat(transferencia.firmas);
          const completaEsquema = cuenta.firmantes.every((element) => {
            return firmasPosibles.includes(element);
          });
          acciones.push({
            nroOperacion: operacion,
            puedeOperar: esFirmante && !yaFirmo,
            completaEsquema: completaEsquema,
            yaFirmo: yaFirmo,
          });
        }
      });

      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        acciones: acciones,
      });
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  equalsIgnoreOrder = (a, b) => {
    if (a.length !== b.length) return false;
    const uniqueValues = new Set([...a, ...b]);
    for (const v of uniqueValues) {
      const aCount = a.filter((e) => e === v).length;
      const bCount = b.filter((e) => e === v).length;
      if (aCount !== bCount) return false;
    }
    return true;
  };
}
