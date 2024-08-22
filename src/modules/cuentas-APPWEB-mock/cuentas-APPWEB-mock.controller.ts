import {
  Controller,
  Get,
  Headers,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LowdbService } from '../../lowdb/lowdb.service';
import { randomDate } from '../../utils/functions/fechas';
import { formatNumber } from '../../utils/functions/formatNumber';
import { getUserNameFromJWTToken } from '../../utils/functions/getUserNameFromJWTToken';

@Controller('cuentas-APPWEB/rest-api')
export class CuentasAPPWEBMockController {
  constructor(private readonly lowdbService: LowdbService) {
    //Descomentar codigo solo si se requiere actualizar fechas
    // this.initMovimientosConformados();
    // this.initMovimientosPendientes();
    // this.initSaldosHistoricos();
    //Descomentar solo si se desea agregar un campo adicional al objeto
    //this.addFieldToObjectJson('enviador', 'cuentas', 'cuentas-por-cuit');
  }

  async initMovimientosConformados() {
    try {
      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/movimientos-conformados.json',
      );

      const movimientos = await this.lowdbService.findAll(
        'movimientosConformados',
      );

      movimientos.forEach((movimiento) => {
        movimiento.datos.forEach((item) => {
          item.fecha = randomDate();
        });
      });

      //Se actualizan los datos
      await this.lowdbService
        .getDb()
        .set('movimientosConformados', movimientos)
        .write();
    } catch (error) {
      console.log('error al actualizar fechas: ', error);
    }
  }

  async initMovimientosPendientes() {
    try {
      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/movimientos-pendientes.json',
      );

      const movimientos = await this.lowdbService.findAll(
        'movimientosPendientes',
      );

      movimientos.forEach((movimiento) => {
        movimiento.datos.forEach((item) => {
          item.fechaMov = randomDate();
        });
      });

      //Se actualizan los datos
      await this.lowdbService
        .getDb()
        .set('movimientosPendientes', movimientos)
        .write();
    } catch (error) {
      console.log('error al actualizar fechas: ', error);
    }
  }

  async initSaldosHistoricos() {
    try {
      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/saldos-historicos.json',
      );

      const saldosHistoricos = await this.lowdbService.findAll(
        'saldosHistoricos',
      );

      saldosHistoricos.forEach((saldoHistorico) => {
        saldoHistorico.saldos.forEach((item) => {
          item.fecha = randomDate();
        });
      });

      //Se actualizan los datos
      await this.lowdbService
        .getDb()
        .set('saldosHistoricos', saldosHistoricos)
        .write();
    } catch (error) {
      console.log('error al actualizar fechas: ', error);
    }
  }

  async addFieldToObjectJson(field: string, module: string, entity: string) {
    try {
      await this.lowdbService.initDatabase(
        `./src/modules/${module}-APPWEB-mock/json/${entity}.json`,
      );

      const cuentas = await this.lowdbService.findAll('cuentasPorCuit');

      cuentas.forEach((cuenta) => {
        cuenta.datos.forEach((item) => {
          item[field] = true;
        });
      });

      //Se actualizan los datos
      await this.lowdbService.getDb().set('cuentasPorCuit', cuentas).write();
    } catch (error) {
      console.log('error al agregar campo adicional: ', error);
    }
  }

  // Obtener cuentas
  @Post('/cuentas')
  async getCuentas(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const typeResponse = 0;
    const pageNumber = parseInt(req.query.pageNumber.toString()) + 1;
    const records = parseInt(req.query.records.toString());
    const cuit = headers.cuit;
    const body = req.body;
    const error34 = {
      status: 406,
      codigoResultado: '34',
      descripcionResultado: 'Error al cargar cuentas',
    };
    const error40 = {
      status: 406,
      codigoResultado: '40',
      descripcionResultado: 'No se han obtenido cuentas',
    };

    try {
      if (typeResponse >= 2) {
        throw error34;
      }
      if (typeResponse >= 1) {
        throw error40;
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/cuentas-por-cuit.json',
      );

      const cuentasPorCuit = await this.lowdbService.find(
        { cuit },
        'cuentasPorCuit',
      );

      if (body.numero && body.referencia) {
        let query = null;

        query = this.extraerDatosFiltro(body);

        cuentasPorCuit.datos = cuentasPorCuit.datos.filter((item) =>
          Object.keys(query).every((key) => {
            if (item[key]) {
              return (
                item[key].toLowerCase().indexOf(query[key].toLowerCase()) > -1
              );
            }
          }),
        );
      }

      if (cuentasPorCuit.datos.length) {
        const cantidadTotal = cuentasPorCuit.datos.length;

        const cantidadPaginas = Math.ceil(cantidadTotal / records);

        //Se devuelve datos con paginacion
        const cuentasPorCuitFiltrados = cuentasPorCuit.datos.slice(
          records * (pageNumber - 1),
          records * pageNumber,
        );

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

        cuentasPorCuitFiltrados.forEach((cuenta) => {
          cuenta.enviador = cuenta.enviadores.includes(usuario.cuil);
        });

        return res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          paginasTotales: cantidadPaginas,
          cuentas: cuentasPorCuitFiltrados.map((data) => {
            const {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              puedeTransferir,
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              limite,
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              enviadores,
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              firmantes,
              ...datosCuenta
            } = data;
            return datosCuenta;
          }),
        });
      } else {
        throw error40;
      }
    } catch (error) {
      res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  extraerDatosFiltro(body): any {
    let searchListaNumero = null;
    let searchListaReferencia = null;
    let searchList = null;
    let numero = null;
    let referencia = null;

    //Armo array de busqueda de numero
    if ((body.numero as string).includes('-')) {
      searchListaNumero = body.numero.toString().split('-');
    } else {
      searchListaNumero = [body.numero];
    }
    //Armo array de busqueda de referencia
    if ((body.referencia as string).includes('-')) {
      searchListaReferencia = body.referencia.toString().split('-');
    } else {
      searchListaReferencia = [body.referencia];
    }
    searchList = [...searchListaNumero, ...searchListaReferencia];

    searchList = searchList
      .filter((item, index) => {
        if (searchList.indexOf(item) == index) {
          return item;
        }
      })
      .map((item) => {
        return item.trim();
      });

    const regex = /^[0-9]*$/;
    searchList.forEach((item) => {
      if (regex.test(item)) {
        numero = item;
      } else {
        referencia = item;
      }
    });

    const query = { nroCuenta: '', referencia: '' };
    if (numero) {
      query.nroCuenta = numero;
    } else {
      delete query.nroCuenta;
    }
    if (referencia) {
      query.referencia = referencia;
    } else {
      delete query.referencia;
    }
    return query;
  }

  // Obtener movimientos conformados
  @Post('/cuenta/movimientos')
  async obtenerMovimientosConformados(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const nroCuenta = req.body.nroCuenta;
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw {
          status: 406,
          codigoResultado: '29',
          descripcionResultado: 'Error. Descargue el archivo.',
        };
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/movimientos-conformados.json',
      );

      const cuit = headers.cuit;
      const proximo = parseInt(req.body.proximo) + 1;
      const records = 20; //Porque asi lo manda backend

      const movimientos = await this.lowdbService.find(
        { cuit, nroCuenta },
        'movimientosConformados',
      );

      // Valida si hay datos en la base
      if (!movimientos) {
        throw {
          status: 406,
          codigoResultado: '31',
          descripcionResultado: 'No se han obtenido movimientos',
        };
      }

      //Busqueda por fechas
      if (req.body.fechaDesde && req.body.fechaHasta) {
        const fechaDesdeDate = new Date(req.body.fechaDesde);
        const fechaHastaDate = new Date(req.body.fechaHasta);

        movimientos.datos = movimientos.datos.filter((movimiento) => {
          const fecha = new Date(movimiento.fecha);
          return fecha >= fechaDesdeDate && fecha <= fechaHastaDate;
        });
      }

      //Filtro por debito y credito
      if (req.body.tipoMovimiento !== 'TODOS') {
        let tipoMovimiento;
        if (req.body.tipoMovimiento === 'DEBITO') {
          tipoMovimiento = 'D';
        } else if (req.body.tipoMovimiento === 'CREDITO') {
          tipoMovimiento = 'C';
        }

        movimientos.datos = movimientos.datos.filter((movimiento) => {
          return movimiento.tipoMovimiento === tipoMovimiento;
        });
      }

      //Busqueda por importe
      if (req.body.importeMin || req.body.importeMax) {
        const importeMin = req.body.importeMin ? req.body.importeMin : '0';
        const importeMax = req.body.importeMax
          ? req.body.importeMax
          : '99999999999999';

        movimientos.datos = movimientos.datos.filter((movimiento) => {
          return (
            Math.abs(formatNumber(movimiento.importe)) >=
              formatNumber(importeMin) &&
            Math.abs(formatNumber(movimiento.importe)) <=
              formatNumber(importeMax)
          );
        });
      }
      const longitudTotal = movimientos.datos.length;
      // Valido si quedan datos despues de todos los filtros
      if (movimientos.datos.length) {
        //Se devuelve datos con paginacion
        movimientos.datos = movimientos.datos.slice(
          records * (proximo - 1),
          records * proximo,
        );

        return res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          proximo: proximo.toString(),
          masRegistros: longitudTotal > records * proximo ? true : false,
          movimientos: movimientos.datos,
          servicioActual: 'mock',
        });
      } else {
        throw {
          status: 406,
          codigoResultado: '31',
          descripcionResultado: 'No se han obtenido movimientos',
        };
      }
    } catch (error) {
      res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Obtener movimientos diferidos
  @Post('/cuenta/movimientos/pendientes')
  async obtenerMovimientosDiferidos(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const pageNumber = parseInt(req.query.pageNumber.toString()) + 1;
    const cuentaNro = req.body.cuentaNro;
    const cuit = headers.cuit;
    const records = 10;
    const typeResponse = 0;

    try {
      if (typeResponse > 0) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado: 'Error al buscar movimientos pendientes',
        };
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/movimientos-pendientes.json',
      );

      const movimientos = await this.lowdbService.find(
        { cuentaNro, cuit },
        'movimientosPendientes',
      );

      // Valida si volvio datos de la base
      if (!movimientos) {
        throw {
          status: 406,
          codigoResultado: '31',
          descripcionResultado: 'No se han obtenido movimientos',
        };
      }

      //Busqueda por fechas
      if (req.body.fechaDesde && req.body.fechaHasta) {
        const fechaDesdeDate = new Date(req.body.fechaDesde);
        const fechaHastaDate = new Date(req.body.fechaHasta);

        movimientos.datos = movimientos.datos.filter((movimiento) => {
          const fecha = new Date(movimiento.fechaMov);
          return fecha >= fechaDesdeDate && fecha <= fechaHastaDate;
        });
      }

      //Busqueda por debito y credito
      if (req.body.tipoMovimiento !== 'TODOS') {
        let tipoMovimiento;
        if (req.body.tipoMovimiento === 'DEBITO') {
          tipoMovimiento = 'D';
        } else if (req.body.tipoMovimiento === 'CREDITO') {
          tipoMovimiento = 'C';
        }

        movimientos.datos = movimientos.datos.filter((movimiento) => {
          return movimiento.debitoCredito === tipoMovimiento;
        });
      }

      //Busqueda por importe
      if (req.body.importeDesde || req.body.importeHasta) {
        const importeDesde = req.body.importeDesde
          ? req.body.importeDesde
          : '0';
        const importeHasta = req.body.importeHasta
          ? req.body.importeHasta
          : '99999999999999';

        movimientos.datos = movimientos.datos.filter((movimiento) => {
          return (
            Math.abs(movimiento.monto) >= formatNumber(importeDesde) &&
            Math.abs(movimiento.monto) <= formatNumber(importeHasta)
          );
        });
      }
      const cantidadTotal = movimientos.datos.length;
      const cantidadPaginas = Math.ceil(cantidadTotal / records);

      // Valida si quedo datos despues de aplicar los filtros
      if (movimientos.datos.length) {
        //Se devuelve datos con paginacion
        movimientos.datos = movimientos.datos.slice(
          records * (pageNumber - 1),
          records * pageNumber,
        );

        return res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          movimientosPendientes: movimientos.datos,
          paginasTotales: cantidadPaginas,
        });
      } else {
        throw {
          status: 406,
          codigoResultado: '31',
          descripcionResultado: 'No se han obtenido movimientos',
        };
      }
    } catch (error) {
      res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Descarga archivo de movimientos
  @Post('/cuenta/movimientos/descarga')
  descargaArchivoMovimientos(@Req() req: Request, @Res() res: Response) {
    const formato = req.body.formato;
    switch (formato) {
      case 'TXT':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://filesamples.com/samples/document/txt/sample1.txt',
        });
        break;
      case 'CSV':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://filesamples.com/samples/document/csv/sample1.csv',
        });
        break;
      case 'PDF':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        });
        break;
    }
  }

  // Descarga archivo de movimientos pendientes
  @Post('/cuenta/movimientos/pendientes/descarga')
  descargaArchivoPendientes(@Req() req: Request, @Res() res: Response) {
    const formato = req.body.formato;
    switch (formato) {
      case 'TXT':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://filesamples.com/samples/document/txt/sample1.txt',
        });
        break;
      case 'CSV':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://filesamples.com/samples/document/csv/sample1.csv',
        });
        break;
      case 'PDF':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        });
        break;
    }
  }

  // Descarga detalle de movimientos
  @Post('/cuenta/movimiento/detalle')
  descargaDetalleMovimientos(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '01',
          descripcionResultado: 'OK',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        });
        break;
      case 1:
        res.status(406).json({
          codigoResultado: '00',
          descripcionResultado: 'Error al obtener movimientos',
        });
        break;
    }
  }

  // Descarga detalle de movimientos pendientes
  @Post('/cuenta/movimiento/pendiente/detalle')
  descargaDetalleMovimientosPendientes(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '01',
          descripcionResultado: 'OK',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        });
        break;
      case 1:
        res.status(406).json({
          codigoResultado: '00',
          descripcionResultado: 'Error al obtener movimientos',
        });
        break;
    }
  }

  // Consulta de cuentas para consulta de saldos
  @Get('/cuentas/saldos/apertura')
  async getCuentasForConsultaSaldos(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cuit = headers.cuit;
    const records = 10;
    const pageNumber = parseInt(req.query.pageNumber.toString()) + 1;
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado:
            'Error al buscar cuentas para saldos saldos del dia',
        };
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/saldos-del-dia.json',
      );

      const saldos = await this.lowdbService.find(
        {
          cuit,
        },
        'saldosDelDia',
      );

      if (saldos) {
        const cantidadTotal = saldos.cuentas.length;

        const cantidadPaginas = Math.ceil(cantidadTotal / records);

        //Se devuelve datos con paginacion
        saldos.cuentas = saldos.cuentas.slice(
          records * (pageNumber - 1),
          records * pageNumber,
        );

        return res.status(HttpStatus.OK).json({
          codigoResultado: '200',
          descripcionResultado: 'OK',
          saldos: saldos.cuentas,
          paginasTotales: cantidadPaginas,
        });
      } else {
        throw {
          status: 406,
          codigoResultado: '34',
          descripcionResultado: 'No se obtuvieron cuentas para saldos del dia',
        };
      }
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Consulta de saldos del día
  @Post('/cuentas/saldos/actuales')
  async consultaSaldosDia(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const typeResponse = 0;
    const cuit = headers.cuit;
    const searchByCuentas = req.body.cuentas;

    try {
      if (typeResponse > 0) {
        throw 'Error';
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/saldos-actuales.json',
      );

      const saldosActuales = await this.lowdbService.find(
        { cuit },
        'saldosActuales',
      );

      // Si no hay saldos para ese cuit
      if (!saldosActuales) {
        throw 'error';
      }

      saldosActuales.saldos = saldosActuales.saldos.filter((saldo) => {
        const res = searchByCuentas.find((cuenta) => {
          return (
            saldo.cuenta.tipoCuentaId === cuenta.tipoCuentaId &&
            saldo.cuenta.numeroCuenta === cuenta.numeroCuenta
          );
        });
        return res !== undefined;
      });

      // Si saldos para esa cuenta
      if (saldosActuales.saldos) {
        return res.status(HttpStatus.OK).json({
          codigoResultado: '200',
          descripcionResultado: 'ok',
          saldos: saldosActuales.saldos,
        });
      } else {
        throw 'error';
      }
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al obtener saldo de las cuenta',
      });
    }
  }

  // Descarga archivo para saldos del dia
  @Post('/cuentas/saldos/dia/descarga')
  descargaArchivoSaldosDelDia(@Req() req: Request, @Res() res: Response) {
    const formato = req.body.formato;
    switch (formato) {
      case 'TXT':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://filesamples.com/samples/document/txt/sample1.txt',
        });
        break;
      case 'CSV':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://filesamples.com/samples/document/csv/sample1.csv',
        });
        break;
      case 'PDF':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        });
        break;
    }
  }

  // Consulta de saldos historicos del dia
  @Post('/cuentas/saldos/historicos/dia')
  async consultaSaldosHistoricosDia(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cuit = headers.cuit;
    const records = parseInt(req.query.records.toString());
    const pageNumber = parseInt(req.query.pageNumber.toString()) + 1;
    const typeResponse = 0;
    try {
      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/saldos-historicos.json',
      );

      if (typeResponse > 0) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado:
            'Error al buscar cuentas para saldos saldos del dia',
        };
      }

      const saldosHistoricos = await this.lowdbService.find(
        { cuit },
        'saldosHistoricos',
      );

      // Si no encontro saldos historicos por dia
      if (!saldosHistoricos) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado:
            'Error al buscar cuentas para saldos saldos del dia',
        };
      }

      // Busqueda por fecha
      if (req.body.fecha) {
        const fechaParam = new Date(req.body.fecha);
        saldosHistoricos.saldos = saldosHistoricos.saldos.filter((saldo) => {
          const fecha = new Date(saldo.fecha);
          return fecha.toString() === fechaParam.toString();
        });
      }
      // // Busqueda por numero cuenta y referencia
      const query = this.extraerDatosFiltro(req.body);

      saldosHistoricos.saldos = saldosHistoricos.saldos.filter((item) =>
        Object.keys(query).every((key) => {
          if (item.cuenta[key]) {
            return (
              item.cuenta[key].toLowerCase().indexOf(query[key].toLowerCase()) >
              -1
            );
          }
        }),
      );

      // Busqueda por tiposCuenta
      if (req.body.tiposCuenta) {
        saldosHistoricos.saldos = saldosHistoricos.saldos.filter((saldo) => {
          return req.body.tiposCuenta.includes(
            parseInt(saldo.cuenta.tipoCuenta.id),
          );
        });
      }

      if (saldosHistoricos.saldos.length > 0) {
        const cantidadTotal = saldosHistoricos.saldos.length;
        const cantidadPaginas = Math.ceil(cantidadTotal / records);
        saldosHistoricos.saldos = saldosHistoricos.saldos.slice(
          records * (pageNumber - 1),
          records * pageNumber,
        );
        return res.status(HttpStatus.OK).json({
          codigoResultado: '200',
          descripcionResultado: 'OK',
          saldos: saldosHistoricos.saldos,
          paginasTotales: cantidadPaginas,
        });
      } else {
        throw {
          status: 406,
          codigoResultado: '40',
          descripcionResultado:
            'No se encontraron saldos para los filtros aplicados',
        };
      }
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Descarga archivo para saldos historicos por dia
  @Post('cuentas/saldos/historicos/dia/descarga')
  descargaArchivoSaldosHistoricosPorDia(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const formato = req.body.formato;
    switch (formato) {
      case 'TXT':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://filesamples.com/samples/document/txt/sample1.txt',
        });
        break;
      case 'CSV':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://filesamples.com/samples/document/csv/sample1.csv',
        });
        break;
      case 'PDF':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        });
        break;
    }
  }

  // Consulta de saldos historicos por periodo
  @Post('/cuentas/saldos/historicos/periodo')
  async consultaSaldosHistoriosPorPeriodo(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cuit = headers.cuit;
    const records = parseInt(req.query.records.toString());
    const pageNumber = parseInt(req.query.pageNumber.toString()) + 1;
    const cuentaSearch = req.body.cuenta;
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw 'Error';
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/saldos-historicos.json',
      );

      const saldosHistoricos = await this.lowdbService.find(
        { cuit },
        'saldosHistoricos',
      );

      // Si no se encontraron saldos historiocos en la base
      if (!saldosHistoricos) {
        throw 'error';
      }

      //Filtrar por numero y tipo de cuenta
      if (cuentaSearch.numeroCuenta && cuentaSearch.tipoCuentaId) {
        saldosHistoricos.saldos = saldosHistoricos.saldos.filter(
          ({ cuenta }) => {
            return (
              cuenta.nroCuenta.indexOf(cuentaSearch.numeroCuenta) > -1 &&
              cuenta.tipoCuenta.id.indexOf(cuentaSearch.tipoCuentaId) > -1
            );
          },
        );
      }

      // Busqueda por fechas
      if (req.body.fechaDesde && req.body.fechaHasta) {
        const fechaDesdeDate = new Date(req.body.fechaDesde);
        const fechaHastaDate = new Date(req.body.fechaHasta);

        saldosHistoricos.saldos = saldosHistoricos.saldos.filter(
          ({ fecha }) => {
            const fechaSearch = new Date(fecha);
            return (
              fechaSearch >= fechaDesdeDate && fechaSearch <= fechaHastaDate
            );
          },
        );
      }

      const cantidadTotal = saldosHistoricos.saldos.length;
      const cantidadPaginas = Math.ceil(cantidadTotal / records);
      saldosHistoricos.saldos = saldosHistoricos.saldos.slice(
        records * (pageNumber - 1),
        records * pageNumber,
      );

      return res.status(HttpStatus.OK).json({
        codigoResultado: '200',
        descripcionResultado: 'OK',
        saldos: saldosHistoricos.saldos.map((saldo) => {
          return { saldo: saldo.saldo, fecha: saldo.fecha };
        }),
        paginasTotales: cantidadPaginas,
      });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al obtener saldos historicos por periodo',
      });
    }
  }

  // Descarga archivo para saldos historicos por periodo
  @Post('/cuentas/saldos/historicos/periodo/descarga')
  descargaArchivoSaldosHistoricosPorPeriodo(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const formato = req.body.formato;
    switch (formato) {
      case 'TXT':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://filesamples.com/samples/document/txt/sample1.txt',
        });
        break;
      case 'CSV':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://filesamples.com/samples/document/csv/sample1.csv',
        });
        break;
      case 'PDF':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        });
        break;
    }
  }

  // Consulta tipos de cuentas que posee el usuario
  @Get('/cuentas/usuario/tipos')
  async getCuentasTiposPorUsuario(@Headers() headers, @Res() res: Response) {
    const cuit = headers.cuit;
    const typeResponse = 0;

    try {
      if (typeResponse > 0) {
        throw {
          status: 406,
          codigoResultado: '34',
          descripcionResultado: 'Error al cargar tipos de cuentas del usuario',
        };
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/cuentas-por-cuit.json',
      );

      const cuentasPorCuit = await this.lowdbService.find(
        { cuit },
        'cuentasPorCuit',
      );

      const tiposDeCuenta = [];
      cuentasPorCuit.datos.forEach((element) => {
        tiposDeCuenta.push(element.tipoCuenta);
      });

      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        tiposCuenta: tiposDeCuenta,
      });
    } catch (error) {
      res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Consulta todos los tipos de cuentas disponibles en la base
  @Get('/cuentas/tipos')
  async getCuentasTipos(@Res() res: Response) {
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw 'Error';
      }
      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/tipos-cuenta.json',
      );

      const tiposCuenta = await this.lowdbService.findAll('tiposCuenta');
      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        tiposCuenta,
      });
    } catch (error) {
      res.status(406).json({
        codigoResultado: '34',
        descripcionResultado: 'Error al obtener todos los tipos de cuentas',
      });
    }
  }

  // Consulta de saldos proyectados
  @Post('/cuentas/saldos/proyectados')
  async getConsultaSaldosProyectados(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado: 'Error al cargar saldos proyectados',
        };
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/saldos-proyectados.json',
      );

      const cuit = headers.cuit;
      const pageNumber = parseInt(req.query.pageNumber.toString()) + 1;
      const records = parseInt(req.query.records.toString());
      const body = req.body;

      const saldosProyectados = await this.lowdbService.find(
        { cuit },
        'saldosProyectados',
      );

      const query = this.extraerDatosFiltro(body);

      saldosProyectados.cuentas = saldosProyectados.cuentas.filter((item) =>
        Object.keys(query).every((key) => {
          if (item.cuenta[key]) {
            return (
              item.cuenta[key].toLowerCase().indexOf(query[key].toLowerCase()) >
              -1
            );
          }
        }),
      );

      if (body.tiposCuenta.length > 0) {
        const tiposCuenta = body.tiposCuenta;
        saldosProyectados.cuentas = saldosProyectados.cuentas.filter(
          ({ cuenta }) => {
            return tiposCuenta.includes(parseInt(cuenta.tipoCuenta.id));
          },
        );
      }

      if (saldosProyectados.cuentas.length) {
        const cantidadTotal = saldosProyectados.cuentas.length;

        const cantidadPaginas = Math.ceil(cantidadTotal / records);

        //Se devuelve datos con paginacion
        const saldosProyectadosFiltrados = saldosProyectados.cuentas.slice(
          records * (pageNumber - 1),
          records * pageNumber,
        );

        return res.status(HttpStatus.OK).json({
          codigoResultado: '200',
          descripcionResultado: 'ok',
          saldosProyectados: saldosProyectadosFiltrados,
          paginasTotales: cantidadPaginas,
        });
      } else {
        throw {
          status: 406,
          codigoResultado: '40',
          descripcionResultado:
            'No se encontraron saldos para los filtros aplicados',
        };
      }
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Descarga archivo para saldos proyectados
  @Post('/cuentas/saldos/proyectados/descarga')
  descargaArchivoSaldosProyectados(@Req() req: Request, @Res() res: Response) {
    const formato = req.body.formato;
    switch (formato) {
      case 'TXT':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://filesamples.com/samples/document/txt/sample1.txt',
        });
        break;
      case 'CSV':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://filesamples.com/samples/document/csv/sample1.csv',
        });
        break;
      case 'PDF':
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        });
        break;
    }
  }

  // Consulta de saldos totales
  @Post('/cuentas/saldos/proyectados/totales')
  async getConsultaSaldosTotales(
    @Headers() headers,
    @Req() req,
    @Res() res: Response,
  ) {
    const typeResponse = 0;

    try {
      if (typeResponse > 0) {
        throw 'Error';
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/saldos-proyectados.json',
      );

      const cuit = headers.cuit;
      const body = req.body;

      const saldosProyectados = await this.lowdbService.find(
        { cuit },
        'saldosProyectados',
      );

      const query = this.extraerDatosFiltro(body);

      saldosProyectados.cuentas = saldosProyectados.cuentas.filter((item) =>
        Object.keys(query).every((key) => {
          if (item.cuenta[key]) {
            return (
              item.cuenta[key].toLowerCase().indexOf(query[key].toLowerCase()) >
              -1
            );
          }
        }),
      );

      if (body.tiposCuenta && body.tiposCuenta.length > 0) {
        const tiposCuenta = body.tiposCuenta;
        saldosProyectados.cuentas = saldosProyectados.cuentas.filter(
          ({ cuenta }) => {
            return tiposCuenta.includes(parseInt(cuenta.tipoCuenta.id));
          },
        );
      }

      const totalesPesos = {
        saldo: 0,
        hoy: 0,
        a24: 0,
        a48: 0,
        noDisponible: false,
      };

      const totalesDolares = {
        saldo: 0,
        hoy: 0,
        a24: 0,
        a48: 0,
        noDisponible: false,
      };

      saldosProyectados.cuentas.forEach(({ cuenta, saldo, hoy, a24, a48 }) => {
        if (cuenta.tipoCuenta.moneda.id === 0) {
          if (saldo === null || hoy === null || a24 === null || a48 === null) {
            totalesPesos.noDisponible = true;
          }
          totalesPesos.saldo += saldo;
          totalesPesos.hoy += hoy;
          totalesPesos.a24 += a24;
          totalesPesos.a48 += a48;
        } else if (cuenta.tipoCuenta.moneda.id === 1) {
          if (saldo === null || hoy === null || a24 === null || a48 === null) {
            totalesDolares.noDisponible = true;
          }
          totalesDolares.saldo += saldo;
          totalesDolares.hoy += hoy;
          totalesDolares.a24 += a24;
          totalesDolares.a48 += a48;
        }
      });

      totalesPesos.noDisponible = this.sumarSaldos(totalesPesos) === 0;
      totalesDolares.noDisponible = this.sumarSaldos(totalesDolares) === 0;

      return res.status(HttpStatus.OK).json({
        codigoResultado: '200',
        descripcionResultado: 'ok',
        totalesPesos,
        totalesDolares,
      });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al calcular saldos proyectados',
      });
    }
  }

  private sumarSaldos(totales): number {
    return totales.saldo + totales.hoy + totales.a24 + totales.a48;
  }

  // Consulta de saldos configuracion acuerdo
  @Get('/cuentas/saldos/configuracion')
  getConsultaSaldosConfiguracion(@Res() res: Response) {
    const typeResponse = 0;

    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '200',
          descripcionResultado: 'ok',
          muestraAcuerdo: true,
        });
        break;
      case 1:
        res.status(HttpStatus.OK).json({
          codigoResultado: '200',
          descripcionResultado: 'ok',
          muestraAcuerdo: false,
        });
        break;
      case 2:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado:
            'Error al obtener configuracion para mostrar acuerdo',
        });
        break;
    }
  }

  // Obtener cuentas propias para transferencias
  @Post('/cuentas/transferencias')
  async getCuentasPropias(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const typeResponse = 0;
    const pageNumber = parseInt(req.query.pageNumber.toString()) + 1;
    const records = parseInt(req.query.records.toString());
    const cuit = headers.cuit;
    const body = req.body;

    try {
      if (typeResponse > 0) {
        throw {
          status: 406,
          codigoResultado: '34',
          descripcionResultado: 'Error al cargar cuentas',
        };
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/cuentas-por-cuit.json',
      );

      const cuentasPorCuit = await this.lowdbService.find(
        { cuit },
        'cuentasPorCuit',
      );

      if (body.numero && body.referencia) {
        let query = null;

        query = this.extraerDatosFiltro(body);

        cuentasPorCuit.datos = cuentasPorCuit.datos.filter((item) =>
          Object.keys(query).every((key) => {
            if (item[key]) {
              return (
                item[key].toLowerCase().indexOf(query[key].toLowerCase()) > -1
              );
            }
          }),
        );
      }

      if (cuentasPorCuit.datos.length) {
        const cantidadTotal = cuentasPorCuit.datos.length;

        const cantidadPaginas = Math.ceil(cantidadTotal / records);

        //Se devuelve datos con paginacion
        const cuentasPorCuitFiltrados = cuentasPorCuit.datos.slice(
          records * (pageNumber - 1),
          records * pageNumber,
        );

        return res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          paginasTotales: cantidadPaginas,
          cuentas: cuentasPorCuitFiltrados.map((datosCuentas) => {
            const { ...datos } = datosCuentas;
            return datos;
          }),
        });
      } else {
        throw {
          status: 406,
          codigoResultado: '03',
          descripcionResultado: 'No se han obtenido cuentas',
        };
      }
    } catch (error) {
      res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Obtener cuentas debito para transaccionar
  @Get('/cuentas/transaccion')
  async getCuentasDebitos(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const typeResponse = 0;
    const pageNumber = parseInt(req.query.pageNumber.toString()) + 1;
    const records = parseInt(req.query.records.toString());
    const moneda = parseInt(req.query.moneda.toString());
    const search = req.query.search.toString();

    try {
      if (typeResponse > 0) {
        throw {
          status: 406,
          codigoResultado: '34',
          descripcionResultado: 'Error al cargar cuentas para transaccionar',
        };
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/cuentas-debito.json',
      );

      let cuentasDebito = await this.lowdbService.findAll('cuentasDebito');

      if (search) {
        const query = this.extraerDatosFiltroTransf(search);
        cuentasDebito = cuentasDebito.filter((item) =>
          Object.keys(query).every((key) => {
            if (item[key]) {
              return (
                item[key].toLowerCase().indexOf(query[key].toLowerCase()) >
                  -1 && item.tipoCuenta.moneda.id === moneda
              );
            }
          }),
        );
      } else {
        cuentasDebito = cuentasDebito.filter((item) => {
          return item.tipoCuenta.moneda.id === moneda;
        });
      }

      if (cuentasDebito.length) {
        const cantidadTotal = cuentasDebito.length;

        const cantidadPaginas = Math.ceil(cantidadTotal / records);

        //Se devuelve datos con paginacion
        const cuentasDebitoFiltrados = cuentasDebito.slice(
          records * (pageNumber - 1),
          records * pageNumber,
        );

        return res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          paginasTotales: cantidadPaginas,
          cuentas: cuentasDebitoFiltrados,
        });
      } else {
        throw {
          status: 406,
          codigoResultado: '40',
          descripcionResultado: 'No se han obtenido cuentas para transaccionar',
        };
      }
    } catch (error) {
      res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  extraerDatosFiltroTransf(search): any {
    let searchListaNumero = null;
    let searchListaReferencia = null;
    let searchList = null;
    let numero = null;
    let referencia = null;

    //Armo array de busqueda de numero
    if ((search as string).includes('-')) {
      searchListaNumero = search.toString().split('-');
    } else {
      searchListaNumero = [search];
    }
    //Armo array de busqueda de referencia
    if ((search as string).includes('-')) {
      searchListaReferencia = search.toString().split('-');
    } else {
      searchListaReferencia = [search];
    }
    searchList = [...searchListaNumero, ...searchListaReferencia];
    searchList = searchList
      .filter((item, index) => {
        if (searchList.indexOf(item) == index) {
          return item;
        }
      })
      .map((item) => {
        return item.trim();
      });
    const regex = /^[0-9]*$/;
    searchList.forEach((item) => {
      if (regex.test(item)) {
        numero = item;
      } else {
        referencia = item;
      }
    });
    const query = { nroCuenta: '', referencia: '' };
    if (numero) {
      query.nroCuenta = numero;
    } else {
      delete query.nroCuenta;
    }
    if (referencia) {
      query.referencia = referencia;
    } else {
      delete query.referencia;
    }
    return query;
  }

  // Obtiene responsables de cuentas
  @Get('/cuentas/responsables')
  async cuentasResponsablesGet(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw 'Error';
      }
      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/responsables.json',
      );
      const responsables = await this.lowdbService.findAll('responsables');
      if (responsables) {
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          responsablesCuenta: responsables,
        });
      } else {
        res.status(500).json({
          codigoResultado: '99',
          descripcionResultado: 'Error buscar permisos del usuario',
        });
      }
    } catch (error) {
      res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error buscar permisos del usuario',
      });
    }
  }
}
