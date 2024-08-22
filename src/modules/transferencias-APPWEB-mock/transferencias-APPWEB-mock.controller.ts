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

@Controller('transferencias-APPWEB/rest-api')
export class TransferenciasAPPWEBMockController {
  constructor(private readonly lowdbService: LowdbService) {
    //Descomentar solo si se requiere actualizar fechas de carga
    // this.initTransferencias();
  }

  async initTransferencias() {
    try {
      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/transferencias.json',
      );

      const transferencias = await this.lowdbService.findAll('transferencias');

      transferencias.forEach((transferencia) => {
        transferencia.fechaCarga = randomDate();
      });

      //Se actualizan los datos
      await this.lowdbService
        .getDb()
        .set('transferencias', transferencias)
        .write();
    } catch (error) {
      console.log('error al actualizar fechas: ', error);
    }
  }

  // Carga de transferencia individual
  @Post('/transferencia')
  async cargaTransferenciaIndividual(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cbuCredito = req.body.cbucredito;
    const concepto = req.body.concepto;
    const motivoID = req.body.motivoID;
    const enviarMail = req.body.enviarMail;
    const fechaImputacion = req.body.fechaImputacion;
    const importe = req.body.importe;
    const mail = req.body.mail;
    const tipo = req.body.modulo;
    const nroCuentaDebito = req.body.nroCuentaDebito;
    const referencia = req.body.referencia;
    const tipoCuentaCredito = req.body.tipoCuentaCredito;
    const tipoCuentaDebito = req.body.tipoCuentaDebito;
    const typeResponse = 0;

    try {
      if (typeResponse > 0) {
        throw 'Error interno';
      }

      const transferencia = {} as any;

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/tipos-cuenta.json',
      );

      //Busco por tipo de cuenta
      const tipoCuenta = await this.lowdbService.find(
        {
          id: tipoCuentaCredito,
        },
        'tiposCuenta',
      );
      transferencia.tipoCuenta = tipoCuenta;
      transferencia.nroTransferencia = '' + new Date().getTime();
      transferencia.numeroCuentaDebito = nroCuentaDebito;
      transferencia.tipoCuentaDebitoId = tipoCuentaDebito;

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/destinatarios.json',
      );
      const destinatarios = await this.lowdbService.findAll('destinatarios');

      const destinatario = destinatarios.find((dato) => {
        return (
          dato.cbu.indexOf(cbuCredito) > -1 &&
          dato.tipoCuenta.id == tipoCuentaCredito
        );
      });

      transferencia.nombreDestinatario = destinatario.destinatario;
      transferencia.fechaCarga = randomDate(0);
      transferencia.fechaImputacion = tipo === 'TOFF' ? fechaImputacion : '';
      transferencia.importe = importe;

      await this.lowdbService.initDatabase(
        `./src/modules/configuracion-APPWEB-mock/json/conceptos-${
          tipo === 'TON' ? 'ton' : 'toff'
        }.json`,
      );

      const conceptos = await this.lowdbService.findAll(
        `conceptos${tipo === 'TON' ? tipo : 'TOFF'}`,
      );

      const { descripcion, ...datosCon } = conceptos.find((concepto) => {
        return concepto.conceptoId === motivoID;
      });

      transferencia.concepto = concepto;
      transferencia.motivo = descripcion;
      transferencia.referencia = referencia;
      transferencia.estadoName = 'Pendiente de firma';
      transferencia.estadoCode = 'FP';
      transferencia.cbuDestinatario = cbuCredito;
      transferencia.numeroCuentaCredito = destinatario.numeroCuenta;
      transferencia.cuitCuentaCredito = destinatario.titulares[0].numeroClave;
      transferencia.firmas = [];
      transferencia.tipo = tipo;

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/transferencias.json',
      );

      await this.lowdbService.add(transferencia, 'transferencias');

      return res.json({
        codigoResultado: '01',
        descripcionResultado: 'ok',
        operacionEstado: {
          nroOperacion: transferencia.nroTransferencia,
          estado: transferencia.estadoCode,
        },
      });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al cargar transferencia',
      });
    }
  }

  @Post('/transferencia/firma')
  async transferenciaFirma(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cuit = headers.cuit;
    const operaciones = req.body.operaciones;
    const operacionesResponse = [];
    const notRetry = {
      '01': {
        codigoResultado: '01',
        descripcionResultado: 'Parámetros ingresados incorrectos',
      },
      '31': {
        codigoResultado: '31',
        descripcionResultado: 'No existen datos para la consulta realizada',
      },
      '73': {
        codigoResultado: '73',
        descripcionResultado:
          'La transferencia se firmó correctamente, pero la cuenta seleccionada no dispone de fondos suficientes. ',
      },
    };
    const retry = {
      '99': {
        codigoResultado: '99',
        descripcionResultado: 'Error al firmar transferencia',
      },
    };
    /**
     * 200: a) todas exitosas
     *      b) allErrorsRetry es false
     * 406: a) allErrorsRetry es true
     */
    const allSuccess = true;
    const allErrorsRetry = false;
    const totalSuccess = 2;
    const totalRetry = 1;
    const error01 = {
      status: 406,
      ...notRetry['01'],
    };
    const error31 = {
      status: 406,
      ...notRetry['31'],
    };
    const error73 = {
      status: 406,
      ...notRetry['73'],
    };
    const error99 = {
      status: 500,
      ...retry['99'],
    };
    const typeResponse = 0;
    try {
      let response;
      const usuario = await this.getUsuario(headers.authorization);

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/transferencias.json',
      );
      // TODO: preguntar a Lucas si typeResponse 1 y 2 pueden existir
      if ((typeResponse as number) === 1) {
        throw error01;
      }
      if ((typeResponse as number) === 2) {
        throw error31;
      }
      if ((typeResponse as number) === 3 || allErrorsRetry) {
        throw error99;
      }
      if ((typeResponse as number) === 4) {
        throw error73;
      }

      for (let index = 0; index < operaciones.length; index++) {
        const transferencias = await this.lowdbService.findAll(
          'transferencias',
        );
        const operacion = operaciones[index];
        const transferencia = transferencias.find(
          (transferencia) =>
            transferencia.nroTransferencia == operacion.nroOperacion,
        );
        response = null;
        if (allSuccess || index < totalSuccess) {
          response = await this.firmarTransferencia(
            transferencia,
            usuario,
            cuit,
          );
          // Se actualiza la base de datos
          await this.actualizarBD('transferencias', transferencias);
          operacionesResponse.push(response);
        } else {
          const codigo =
            index < totalSuccess + totalRetry
              ? retry['99']
              : notRetry[
                  Reflect.ownKeys(notRetry)[
                    (index + 1) % Reflect.ownKeys(notRetry).length
                  ]
                ];
          operacionesResponse.push({
            ...codigo,
            nroOperacion: operacion.nroOperacion,
            estado: null,
          });
        }
      }
      return res.status(200).json({
        codigoResultado: '00',
        descripcionResultado: 'ok',
        operaciones: operacionesResponse,
      });
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  @Post('/transferencia/envio')
  async transferenciaEnvio(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const operaciones = req.body.operaciones;
    const operacionesResponse = [];
    const resultadosEnvio = {
      enviada: {
        estadoCode: 'EN',
        estadoName: 'Enviado',
        codigoResultado: '00',
        descripcionResultado: 'Transferencia enviada',
      },
      pendiente: {
        estadoCode: 'PE',
        estadoName: 'Pendiente',
        codigoResultado: '97',
        descripcionResultado: 'Transferencia pendiente de acreditación',
      },
      noEnviada: {
        estadoCode: 'PE',
        estadoName: 'Pendiente',
        codigoResultado: '90',
        descripcionResultado: 'Transferencia no enviada',
      },
    };
    let resultadoEnvio = null;
    const error65 = {
      status: 406,
      codigoResultado: '65',
      descripcionResultado: 'Límite superado',
    };
    const error73 = {
      status: 406,
      codigoResultado: '73',
      descripcionResultado:
        'La transferencia no se pudo enviar porque la cuenta seleccionada no dispone de fondos suficientes. ',
    };
    const error99 = {
      status: 500,
      codigoResultado: '99',
      descripcionResultado: 'No pudimos realizar la operación',
    };
    const typeResponse = 0;
    //Si someError es false, no hay errores en enviar las transferencias
    //Si someError es true, habra algunos errores en las transferencias
    const someError = false;
    try {
      if ((typeResponse as number) === 1) {
        throw error65;
      }
      if ((typeResponse as number) === 2) {
        throw error99;
      }
      if ((typeResponse as number) === 3) {
        throw error73;
      }
      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/transferencias.json',
      );
      for (let index = 0; index < operaciones.length; index++) {
        const transferencias = await this.lowdbService.findAll(
          'transferencias',
        );
        const operacion = operaciones[index];
        const transferencia = transferencias.find(
          (transferencia) =>
            transferencia.nroTransferencia == operacion.nroOperacion,
        );

        if (index === 0 || !someError) {
          resultadoEnvio = resultadosEnvio.enviada;
        } else {
          const nroEnvio = someError ? Math.floor(Math.random() * 3 + 1) : 1;
          if (nroEnvio === 2) {
            const codigoError =
              Math.floor(Math.random() * 2 + 1) === 1 ? '98' : '99';
            resultadoEnvio = resultadosEnvio.noEnviada;
            resultadosEnvio.noEnviada.codigoResultado = codigoError;
          } else {
            resultadoEnvio = resultadosEnvio.pendiente;
          }
        }
        // Transferencia se pasa por referencia
        const response = await this.enviarTransferencia(
          transferencia,
          resultadoEnvio,
        );
        // Se actualiza la base de datos
        this.actualizarBD('transferencias', transferencias);
        operacionesResponse.push(response);
      }
      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'ok',
        operaciones: operacionesResponse,
      });
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Obtiene la consulta de agenda destinatarios
  @Post('/agenda/destinatarios')
  async obtieneConsultaAgenda(@Req() req: Request, @Res() res: Response) {
    const pageNumber = parseInt(req.query.pageNumber as string) + 1;

    const records = parseInt(req.query.records as string);
    const body = req.body;
    const typeResponse = 0;

    try {
      //Emular primera consulta vacia
      if ((typeResponse as number) === 1) {
        throw {
          status: 406,
          codigoResultado: '31',
          descripcionResultado: 'No tenes destinatarios agendados',
        };
      }

      //Error interno servidor
      if ((typeResponse as number) === 2) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado: 'Error al obtener destinatarios',
        };
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/tipos-cuenta.json',
      );

      const tiposCuenta: any[] = await this.lowdbService.findAll('tiposCuenta');

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/destinatarios.json',
      );

      //Busco todos los destinatarios y empiezo a filtrar
      let destinatarios = await this.lowdbService.findAll('destinatarios');

      //Busco por bancoDestino
      if (body.bancoDestino) {
        let bancoDestino;
        if (body.bancoDestino.toString().charAt(0) !== '0') {
          bancoDestino = '0' + body.bancoDestino.toString();
        } else {
          bancoDestino = body.bancoDestino;
        }

        destinatarios = destinatarios.filter((dato: any) => {
          return dato.bancoId.toString().indexOf(bancoDestino as string) > -1;
        });
      }

      //Busco por estados
      if (body.estados && body.estados.length > 0 && body.estados.length < 3) {
        destinatarios = destinatarios.filter((dato: any) => {
          let estado;
          switch (dato.estado.toString()) {
            case 'Activa':
              estado = 'VE';
              break;
            case 'Eliminada':
              estado = 'BA';
              break;
            case 'Pendiente':
              estado = 'AP';
              break;
            case 'Rechazada':
              estado = 'RE';
              break;
          }

          return body.estados.includes(estado);
        });
      }

      //Reordeno por campoOrden y orden
      if (body.campoOrden && body.orden && body.campoOrden !== 'FECHA') {
        switch (body.campoOrden) {
          case 'ESTADO':
            destinatarios = destinatarios.sort((a, b) =>
              a.estado < b.estado ? 1 : -1,
            );
            break;
          case 'DESTINATARIO':
            destinatarios = destinatarios.sort((a, b) =>
              a.destinatario < b.destinatario ? 1 : -1,
            );
            break;
        }

        if (body.orden === 'DESC') {
          destinatarios = destinatarios.reverse();
        }
      }

      //Busco por referencia y nombre destinatario
      if (body.referencia) {
        let lista: string[] = [];
        //Armo array de busqueda de referencia y destinatario
        if ((body.referencia as string).includes('-')) {
          lista = body.referencia
            .toString()
            .split('-')
            .map((item) => item.trim());

          //Valido si existe tipo de cuenta
          const tipoCuentaEncontrada = tiposCuenta.find((tipoCuenta) =>
            lista.some((element) => {
              return (
                tipoCuenta.descripcionCorta.toLowerCase() ===
                element.toLowerCase()
              );
            }),
          );

          //Verifico si el tipo de cuenta viene en el request. Los posibles tipos de valores en "body.referencia":
          //Referencia
          //Destinatario
          //Destinatario - Referencia
          //Destinatario - Tipo cuenta - Referencia
          //Destinatario - Tipo cuenta
          if (tipoCuentaEncontrada) {
            const i: number = lista.indexOf(
              tipoCuentaEncontrada.descripcionCorta,
            );

            if (i !== -1) {
              lista.splice(i, 1);
            }

            destinatarios = this.buscarDestinatarios(lista, destinatarios);
          } else {
            destinatarios = this.buscarDestinatarios(lista, destinatarios);
          }
        } else {
          destinatarios = destinatarios.filter((dato: any) => {
            //Busco solo por referencia
            return (
              dato.referencia
                ?.toString()
                .toLowerCase()
                .indexOf(body.referencia.toString().toLowerCase()) > -1 ||
              dato.destinatario
                .toString()
                .toLowerCase()
                .indexOf(body.referencia.toString().toLowerCase()) > -1
            );
          });
        }
      }

      if (destinatarios.length > 0) {
        const cantidadTotal = destinatarios.length;
        const cantidadPaginas = Math.ceil(cantidadTotal / records);

        //Se devuelve datos con paginacion
        const destfiltrados = destinatarios.slice(
          records * (pageNumber - 1),
          records * pageNumber,
        );

        return res.status(HttpStatus.OK).json({
          codigoResultado: '200',
          descripcionResultado: 'ok',
          destinatarios: destfiltrados.map(
            ({ bancoId, fechaAdhesion, titulares, numeroCuenta, ...datos }) =>
              datos,
          ),
          paginasTotales: cantidadPaginas,
        });
      } else {
        throw {
          status: 406,
          codigoResultado: '31',
          descripcionResultado: 'No encontramos resultados',
        };
      }
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Descarga de comprobantes en consulta de transferencias inmediatas
  @Post('/descarga/comprobantes')
  getComprobantesTransacciones(@Req() req: Request, @Res() res: Response) {
    const error99 = {
      status: 406,
      codigoResultado: '99',
      descripcionResultado:
        'Ocurrió un problema al realizar la descarga. Intentalo de nuevo en unos minutos.',
    };
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw error99;
      }
      res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      });
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Descarga del comprobante asociado a una transferencia
  @Get('/descarga/comprobante/:transaccion')
  getUnicoComprobanteTransaccion(@Req() req: Request, @Res() res: Response) {
    const error99 = {
      status: 406,
      codigoResultado: '99',
      descripcionResultado:
        'Ocurrió un problema al realizar la descarga. Intentalo de nuevo en unos minutos.',
    };
    const transaccion = req.query.transaccion; // Al retornar un dummy no se hace uso del parametro
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw error99;
      }
      res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      });
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Descarga archivo para consulta agenda
  @Post('/agenda/descarga')
  descargaArchivoConsultaAgenda(@Req() req: Request, @Res() res: Response) {
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

  // Obtiene si es aprobador
  @Get('/transferencia/configuracion/usuario')
  async getAprobador(@Headers() headers, @Res() res: Response) {
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

      const aprobador = await this.lowdbService.find(
        { alias: aliasUsuarioLogueado },
        'usuarios',
      );

      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        apruebaDestinatario: aprobador.puedeAprobarDestinatarios,
      });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado:
          'Error al obtener los permisos de aprobador para el usuario',
      });
    }
  }

  // Modificar destinatario
  @Put('/agenda/destinatario/:tipoCuenta/:cbu')
  async modificarDestinatario(
    @Param('cbu') cbu,
    @Param('tipoCuenta') tipoCuentaId,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const typeResponse = 0;

    try {
      if (typeResponse > 0) {
        throw 'Error interno';
      }

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/destinatarios.json',
      );

      let destinatarios = await this.lowdbService.findAll('destinatarios');

      let destinatarioAModificar: any = {};
      let index: number;

      destinatarios = destinatarios.filter((destinatario) => {
        if (
          destinatario.cbu === cbu &&
          destinatario.tipoCuenta.id === tipoCuentaId
        ) {
          destinatarioAModificar = destinatario;
          index = destinatarios.findIndex((x) => x === destinatario);
        }
        return (
          destinatario.cbu !== cbu ||
          destinatario.tipoCuenta.id !== tipoCuentaId
        );
      });

      destinatarioAModificar.email = req.body.email;
      destinatarioAModificar.referencia = req.body.referencia;

      destinatarios.splice(index, 0, destinatarioAModificar);

      await this.lowdbService
        .getDb()
        .set('destinatarios', destinatarios)
        .write();

      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
      });
    } catch (error) {
      switch (typeResponse as number) {
        case 1:
          res.status(500).json({
            codigoResultado: '99',
            descripcionResultado: 'Error genérico',
          });
          break;
        case 2:
          res.status(406).json({
            codigoResultado: '99',
            descripcionResultado: 'Error genérico',
          });
          break;
      }
    }
  }

  // Obtiene datos del cbu para alta destinatarios
  @Post('/agenda/cuentas')
  async obtieneDatosCbu(@Req() req: Request, @Res() res: Response) {
    const body = req.body;
    const typeResponse = 0;

    // -- responses
    const error39 = {
      status: 406,
      codigoResultado: '39',
      descripcionResultado: 'Error al obtener datos del cbu 39',
    };

    const error42 = {
      status: 406,
      codigoResultado: '42',
      descripcionResultado: 'El CBU ya se encuentra agendado',
    };

    try {
      if ((typeResponse as number) === 1) {
        throw {
          status: 500,
          codigoResultado: '500',
          descripcionResultado: 'Error al obtener datos del cbu 500',
        };
      } else if (body.cbu === '0290000000000000000000') {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado: 'Error al obtener datos del cbu',
        };
      }

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/destinatarios.json',
      );

      const destinatariosDatabase = await this.lowdbService.findAll(
        'destinatarios',
      );

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/datos-cbu-cuenta-services.json',
      );
      // Back lo busca primero en cuenta services
      const cuentaServicesData = await this.lowdbService.find(
        body.cbu ? { cbu: body.cbu } : { alias: body.alias },
        'datosCbuCuentaServices',
      );
      // Si busca por alias y no lo encuentra en cuentaServices no va a saber que CBU buscar en la base, por lo cual devuelve error
      if (body.alias && !cuentaServicesData) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado: 'Error al obtener datos del cbu',
        };
      }
      // Si existe en cuentaService lo busca en la base.
      const destinatarioFound = destinatariosDatabase.filter(
        (dest) =>
          (body.cbu && dest.cbu === body.cbu) ||
          (body.alias && dest.alias === body.alias),
      );

      if (destinatarioFound[0]?.cbu.startsWith('072')) {
        // Santander, posible bimonetaria
        if (destinatarioFound.length === 2) {
          // Es bimonetaria, ambas agendadas
          throw error42;
        } else if (destinatarioFound.length === 1) {
          // Bimonetaria con una agendada o unimonetaria agendada
          if (cuentaServicesData?.datosCuentas.length === 1) {
            // Unimonetaria agendada
            throw error42;
          } else {
            // Bimonetaria con solo una agendada, retorno ambas
            // tambien puede ser unimoenataria que no esta informada
            // Bimonetaria sin informar

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            if (cuentaServicesData) {
              // Encontro datos en cuenta services
              cuentaServicesData.datosCuentas.forEach((c) => {
                c.agendado =
                  c.tipoCuenta.id === destinatarioFound[0].tipoCuenta.id;
              });

              return res.status(HttpStatus.OK).json({
                codigoResultado: '200',
                descripcionResultado: 'ok',
                cbu: cuentaServicesData.cbu,
                datosCuentas: cuentaServicesData.datosCuentas,
              });
            } else {
              // no se encontro en cuenta services, hay que desplegar formulario
              throw error39;
            }
          }
        } else {
          // No encontro nada en la bdd, tiene que ir a buscar a cuentas services todo lo q encuentre
          // retorna ok, ambos o unico flags en false, sin discriminar entre uni o bi
          if (cuentaServicesData) {
            cuentaServicesData.datosCuentas.forEach((c) => {
              c.agendado = false;
            });
            return res.status(HttpStatus.OK).json({
              codigoResultado: '200',
              descripcionResultado: 'ok',
              cbu: cuentaServicesData.cbu,
              datosCuentas: cuentaServicesData.datosCuentas,
            });
          } else {
            throw error39;
          }
        }
      } else {
        // Resto de los bancos, unimonetaria
        if (destinatarioFound.length > 0) {
          throw error42;
        } else {
          // buscar en cuenta services el cbu unimonetario
          // retorna lo que encuentre
          if (cuentaServicesData) {
            cuentaServicesData.datosCuentas.forEach((c) => {
              c.agendado = false;
            });

            return res.status(HttpStatus.OK).json({
              codigoResultado: '200',
              descripcionResultado: 'ok',
              cbu: cuentaServicesData.cbu,
              datosCuentas: cuentaServicesData.datosCuentas,
            });
          } else {
            // Si no encuentra
            throw error39;
          }
        }
      }
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Agendar destinatario
  @Post('/agenda/destinatario')
  async agendarDestinatario(@Req() req, @Res() res: Response) {
    const agregarDestinatariosInfo = req.body.agregarDestinatariosInfo;
    const typeResponse = 0;
    try {
      if ((typeResponse as number) === 1) {
        throw 'Error';
      }

      for (const destinatarioInfo of agregarDestinatariosInfo) {
        const cbu = destinatarioInfo.cbu;
        const alias = destinatarioInfo.alias;
        const email = destinatarioInfo.email;
        const nroDocumento = destinatarioInfo.nroDocumento;
        const referencia = destinatarioInfo.referencia;
        const tipoCuentaId = destinatarioInfo.tipoCuentaId;
        const tipoDocumento = destinatarioInfo.tipoDocumento;
        const titularCuenta = destinatarioInfo.titularCuenta;
        const numeroCuenta = destinatarioInfo.nroCuenta;

        const destinatario = {} as any;
        destinatario.destinatario = titularCuenta;
        destinatario.bancoId = cbu.substr(0, 3);
        destinatario.cbu = cbu;
        destinatario.alias = alias;
        destinatario.referencia = referencia;
        destinatario.estado = 'Pendiente';
        destinatario.email = email;
        destinatario.numeroCuenta = numeroCuenta;
        if (destinatario.bancoId === '000') {
          destinatario.banco = 'Cuenta virtual';
        } else {
          //inicializo la base de configuracion
          await this.lowdbService.initDatabase(
            './src/modules/configuracion-APPWEB-mock/json/bancos.json',
          );

          //Busco banco por codigo
          const banco = await this.lowdbService.find((banco) => {
            return banco.codigoBCRA.endsWith(destinatario.bancoId);
          }, 'bancos');

          destinatario.banco = banco.nombre;
        }
        //inicializo la base de cuentas
        await this.lowdbService.initDatabase(
          './src/modules/cuentas-APPWEB-mock/json/tipos-cuenta.json',
        );
        //Busco por tipo de cuenta
        const tipoCuenta = await this.lowdbService.find(
          {
            id: tipoCuentaId,
          },
          'tiposCuenta',
        );
        destinatario.tipoCuenta = tipoCuenta;
        destinatario.fechaAdhesion = getFecha();

        const cantTitulares = getRandomInt(1, 3);
        destinatario.titulares = [];
        for (let i = 0; i < cantTitulares; i++) {
          if (i === 0) {
            destinatario.titulares.push({
              tipoClave: tipoDocumento,
              numeroClave: nroDocumento,
              nombreApellido: destinatario.destinatario,
            });
          } else {
            destinatario.titulares.push({
              tipoClave: 'CUIT',
              numeroClave: '3000000001' + i,
              nombreApellido: 'Bruno Marte',
            });
          }
        }

        await this.lowdbService.initDatabase(
          './src/modules/transferencias-APPWEB-mock/json/destinatarios.json',
        );
        await this.lowdbService.add(destinatario, 'destinatarios');
      }

      return res.json({ codigoResultado: '00', descripcionResultado: 'OK' });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al agendar destinatario',
      });
    }
  }

  // Obtener detalle destinatario
  @Post('/agenda/destinatario/detalle')
  async getDetalleCbu(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;
    const cbu = req.body.cbu;
    const tipoCuentaId = req.body.tipoCuenta;
    try {
      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/destinatarios.json',
      );

      if ((typeResponse as number) === 1) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado: 'Error al buscar detalle',
        };
      }

      const destinatarios = await this.lowdbService.findAll('destinatarios');

      const destinatario = destinatarios.find((destinatario) => {
        return (
          destinatario.cbu.indexOf(cbu) > -1 &&
          destinatario.tipoCuenta.id == tipoCuentaId
        );
      });

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/datos-cbu-cuenta-services.json',
      );

      const datosCbuCuentas = await this.lowdbService.findAll(
        'datosCbuCuentaServices',
      );

      let informado = false;
      for (const datoCuenta of datosCbuCuentas) {
        if (datoCuenta.cbu.indexOf(destinatario.cbu) > -1) {
          informado = true;
        }
      }

      if (destinatario) {
        return res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          destinatarioDetalle: {
            nombreBanco: destinatario.banco,
            tipoCuenta: destinatario.tipoCuenta,
            cbu: destinatario.cbu,
            fechaAdhesion: destinatario.fechaAdhesion,
            email: destinatario.email,
            referencia: destinatario.referencia,
            estado: destinatario.estado,
            titulares: destinatario.titulares,
            informado: informado,
            numeroCuenta: destinatario.numeroCuenta,
          },
        });
      } else {
        throw {
          status: 406,
          codigoResultado: '35',
          descripcionResultado: 'No esta agendado',
        };
      }
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Descarga detalle de destinatario
  @Post('/agenda/destinatario/detalle/descarga')
  async descargaDetalleDestinatario(@Req() req: Request, @Res() res: Response) {
    const error99 = {
      status: 406,
      codigoResultado: '99',
      descripcionResultado:
        'Ocurrió un problema al realizar la descarga. Intentalo de nuevo en unos minutos.',
    };
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw error99;
      }
      res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      });
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Consulta los destinatarios de la agenda por CBU
  @Post('/agenda/cbu/destinatarios')
  async getAgendaDestinatarios(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;
    try {
      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/destinatarios.json',
      );

      if ((typeResponse as number) === 1) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado: 'Error al buscar destinatario por cbu',
        };
      }

      if (req.body.cbu === '0290000000000000000000') {
        throw {
          status: 406,
          codigoResultado: '36',
          descripcionResultado: 'CBU invalido',
        };
      }

      let destinatarios = await this.lowdbService.findAll('destinatarios');
      destinatarios = destinatarios.filter((destinatario) => {
        if (req.body.cbu) {
          return destinatario.cbu.indexOf(req.body.cbu) > -1;
        } else {
          return destinatario.alias === req.body.alias;
        }
      });
      if (destinatarios.length === 0) {
        throw {
          status: 406,
          codigoResultado: '35',
          descripcionResultado: 'Destinatario no agendado',
        };
      }

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/datos-cbu-cuenta-services.json',
      );

      const datosCbuCuentas = await this.lowdbService.findAll(
        'datosCbuCuentaServices',
      );

      const destinatarioDetalles = [];

      let informado;
      destinatarios.forEach((destinatario) => {
        informado = false;
        for (const datoCuenta of datosCbuCuentas) {
          if (datoCuenta.cbu.indexOf(destinatario.cbu) > -1) {
            informado = true;
          }
        }

        destinatarioDetalles.push({
          nombreBanco: destinatario.banco,
          tipoCuenta: destinatario.tipoCuenta,
          cbu: destinatario.cbu,
          fechaAdhesion: destinatario.fechaAdhesion,
          email: destinatario.email,
          referencia: destinatario.referencia,
          estado: destinatario.estado,
          titulares: destinatario.titulares,
          informado: informado,
          numeroCuenta: destinatario.numeroCuenta,
        });
      });
      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        destinatarioDetalles: destinatarioDetalles,
      });
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Eliminar destinatario
  @Post('/agenda/destinatario/baja')
  eliminarDestinatario(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res
          .status(HttpStatus.OK)
          .json({ codigoResultado: '00', descripcionResultado: 'OK' });
        break;
      case 1:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado: 'Error genérico',
        });
        break;
      case 2:
        res.status(500).json({
          codigoResultado: '99',
          descripcionResultado: 'Error genérico',
        });
        break;
    }
  }

  // Aprueba destinatario/s de agenda destinatarios
  @Post('/agenda/destinatario/aprobacion')
  async aprobarDestinatariosAgenda(@Req() req, @Res() res: Response) {
    const destinatariosSearch = req.body.destinatarios;
    const typeResponse = 0;

    try {
      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/destinatarios.json',
      );

      if (typeResponse > 0) {
        throw 'Error';
      }
      //busco todos los destinatarios
      let destinatarios = await this.lowdbService.findAll('destinatarios');
      destinatariosSearch.forEach((destinatario) => {
        //busco destinatario por cbu y tipocuenta
        const destinatarioFound = destinatarios.find((dato) => {
          return (
            dato.cbu.indexOf(destinatario.cbu) > -1 &&
            dato.tipoCuenta.id.indexOf(destinatario.tipoCuentaId) > -1
          );
        });
        //Filtro los destinatarios por cbu y tipo cuenta
        destinatarios = destinatarios.filter((dato) => {
          return !(
            dato.cbu.indexOf(destinatario.cbu) > -1 &&
            dato.tipoCuenta.id.indexOf(destinatario.tipoCuentaId) > -1
          );
        });

        //Se aprueba destinatario
        destinatarioFound.estado = 'Activa';

        //Actualizo los destinatarios
        destinatarios.push(destinatarioFound);
      });

      //Se actualizan los destinatarios
      await this.lowdbService
        .getDb()
        .set('destinatarios', destinatarios)
        .write();

      return res.json({ codigoResultado: '00', descripcionResultado: 'ok' });
    } catch (error) {
      if ((typeResponse as number) === 1) {
        return res.status(406).json({
          codigoResultado: '98',
          descripcionResultado: 'Error al aprobar destinatario/s',
        });
      } else {
        return res.status(500).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al aprobar destinatario/s',
        });
      }
    }
  }

  // Consulta de transferencias
  @Post('/transferencias')
  async consultaTransferencias(@Req() req: Request, @Res() res: Response) {
    const pageNumber = parseInt(req.query.pageNumber as string) + 1;

    const records = parseInt(req.query.records as string);
    const body = req.body;
    const typeResponse = 0;

    try {
      //Emular primera consulta vacia
      if ((typeResponse as number) === 1) {
        throw {
          status: 406,
          codigoResultado: '31',
          descripcionResultado: 'No encontramos resultados',
        };
      }

      //Error interno servidor
      if ((typeResponse as number) === 2) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado: 'Error al obtener transferencias',
        };
      }

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/transferencias.json',
      );

      // Busco cuentas segun el tipo de transferencias
      const transferencias = await this.lowdbService.findAll('transferencias');
      let transferenciasCuentaTipo = [];

      // Busco por tipo y numero de cuenta
      if (body.nroCuenta && body.tipoCuenta) {
        transferenciasCuentaTipo = transferencias.filter((transferencia) => {
          return (
            transferencia.numeroCuentaDebito === body.nroCuenta &&
            transferencia.tipoCuentaDebitoId === body.tipoCuenta
          );
        });
      }

      transferenciasCuentaTipo = transferenciasCuentaTipo.filter(
        (transferencia) => body.tipoTransferencia === transferencia.tipo,
      );

      //Busqueda por fechas
      if (body.fechaDesde && body.fechaHasta) {
        const fechaDesdeDate = new Date(body.fechaDesde)
          .toISOString()
          .slice(0, 10);
        const fechaHastaDate = new Date(body.fechaHasta)
          .toISOString()
          .slice(0, 10);

        transferenciasCuentaTipo = transferenciasCuentaTipo.filter(
          (transferencia) => {
            const fecha = new Date(transferencia.fechaCarga)
              .toISOString()
              .slice(0, 10);
            return fecha >= fechaDesdeDate && fecha <= fechaHastaDate;
          },
        );
      }

      //Busqueda por importe
      if (body.importeMinimo || body.importeMaximo) {
        const importeMin = body.importeMinimo ? body.importeMinimo : '0';
        const importeMax = body.importeMaximo
          ? body.importeMaximo
          : '9999999999,99';
        transferenciasCuentaTipo = transferenciasCuentaTipo.filter(
          (transferencia) => {
            return (
              transferencia.importe >= formatNumber(importeMin) &&
              transferencia.importe <= formatNumber(importeMax)
            );
          },
        );
      }

      //Busco por estados
      if (body.estados && body.estados.length > 0) {
        transferenciasCuentaTipo = transferenciasCuentaTipo.filter(
          (dato: any) => {
            return body.estados.includes(dato.estadoCode);
          },
        );
      }

      //Reordeno por campoOrden y orden
      if (body.campoOrden && body.orden) {
        switch (body.campoOrden) {
          case 'IMPORTE':
            transferenciasCuentaTipo = transferenciasCuentaTipo.sort(
              (a, b) => Number(a.importe) - Number(b.importe),
            );
            break;
          case 'NOMBRE_DESTINATARIO':
            transferenciasCuentaTipo = transferenciasCuentaTipo.sort((a, b) =>
              a.nombreDestinatario < b.nombreDestinatario ? 1 : -1,
            );
            break;
          case 'FECHA_CARGA':
            transferenciasCuentaTipo = transferenciasCuentaTipo.sort((a, b) =>
              a.fechaCarga < b.fechaCarga ? 1 : -1,
            );
            break;
        }

        if (body.orden === 'DESC') {
          transferenciasCuentaTipo = transferenciasCuentaTipo.reverse();
        }
      }

      //Busco por cbu y tipo de cuenta
      if (body.cbuDestinatario && body.tipoCuentaDestinatario) {
        transferenciasCuentaTipo = transferenciasCuentaTipo.filter(
          (dato: any) => {
            return (
              body.cbuDestinatario === dato.cbuDestinatario &&
              body.tipoCuentaDestinatario === dato.tipoCuenta.id
            );
          },
        );
      }

      //Busco por numero de transaccion
      if (body.nroTransferencia) {
        transferenciasCuentaTipo = transferencias.filter((transferencia) => {
          return body.nroTransferencia === transferencia.nroTransferencia;
        });
      }

      if (transferenciasCuentaTipo.length > 0) {
        const cantidadTotal = transferenciasCuentaTipo.length;
        const cantidadPaginas = Math.ceil(cantidadTotal / records);

        //Se devuelve datos con paginacion
        const destfiltrados = transferenciasCuentaTipo.slice(
          records * (pageNumber - 1),
          records * pageNumber,
        );

        return res.status(HttpStatus.OK).json({
          codigoResultado: '200',
          descripcionResultado: 'ok',
          transferencias: destfiltrados.map((transferencia) => {
            return {
              nroTransferencia: transferencia.nroTransferencia,
              nombreDestinatario: transferencia.nombreDestinatario,
              cbuDestinatario: transferencia.cbuDestinatario,
              fechaCarga: transferencia.fechaCarga,
              importe: transferencia.importe,
              concepto: transferencia.concepto,
              fechaImputacion: transferencia.fechaImputacion,
              referencia: transferencia.referencia,
              estadoCode: transferencia.estadoCode,
              estadoName: transferencia.estadoName,
              cuitCuentaCredito: transferencia.cuitCuentaCredito,
              cuentaCredito: transferencia.numeroCuentaCredito,
              tipoCuentaCredito: transferencia.tipoCuenta.descripcionCorta,
            };
          }),
          paginasTotales: cantidadPaginas,
        });
      } else {
        throw {
          status: 406,
          codigoResultado: '31',
          descripcionResultado: 'No encontramos resultados',
        };
      }
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Modifica fecha imputacion para transferencias TOFF
  @Put('/transferencia/:nroTran')
  async modificarTransferenciaTOFF(
    @Param('nroTran') nroTran,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const newDate = req.body.fechaImputacion;
    const typeResponse = 0;

    try {
      if (typeResponse > 0) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado: 'Error al modificar la fecha de imputacion',
        };
      }

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/transferencias.json',
      );

      let transferencias = await this.lowdbService.findAll('transferencias');

      let transferenciaAModificar: any = {};
      let index: number;

      transferencias = transferencias.filter((transferencia) => {
        if (transferencia.nroTransferencia === nroTran) {
          transferenciaAModificar = transferencia;
          index = transferencias.findIndex((x) => x === transferencia);
        }
        return transferencia.nroTransferencia !== nroTran;
      });

      transferenciaAModificar.fechaImputacion = newDate;

      transferencias.splice(index, 0, transferenciaAModificar);

      await this.lowdbService
        .getDb()
        .set('transferencias', transferencias)
        .write();

      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
      });
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Obtiene los firmantes para la consulta detalle de transferencia
  @Post('/transferencia/firmantes')
  async getFirmantesDetalleTransferencia(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cuit = headers.cuit;
    const nroTran = req.body.nroTran;
    const typeResponse = 0;

    try {
      if (typeResponse > 0) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado:
            'Error al obtener tipo de acciones de transferencia',
        };
      }

      const firmantesDatos = [];

      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/transferencias.json',
      );

      const transferencias = await this.lowdbService.findAll('transferencias');

      const nroCtaDebito = transferencias.find(
        (transferencia) => transferencia.nroTransferencia == nroTran,
      ).numeroCuentaDebito;

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/cuentas-por-cuit.json',
      );

      const cuentasDeLaEmpresa = await this.lowdbService.find(
        { cuit },
        'cuentasPorCuit',
      );

      const firmantes = cuentasDeLaEmpresa.datos.find(
        (dato) => dato.nroCuenta === nroCtaDebito,
      ).firmantes;

      await this.lowdbService.initDatabase(
        './src/modules/usuarios-APPWEB-mock/json/usuarios.json',
      );

      const usuarios = await this.lowdbService.findAll('usuarios');

      firmantes.forEach((firmante) => {
        const usuarioEncontrado = usuarios.find(
          (usuario) => usuario.cuil === firmante,
        );

        firmantesDatos.push({
          usuarioId: getRandomInt(1, 10).toString(),
          nombre: usuarioEncontrado.nombre,
          apellido: usuarioEncontrado.apellido,
          tipoDocumento: 'CUIL',
          documento: usuarioEncontrado.cuil,
        });
      });

      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        firmantes: firmantesDatos,
      });
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Obtener limites para transferencias inmediatas - TON
  @Get('/transferencias/limite')
  async obtenerLimitesTransferencias(
    @Headers() headers,
    @Req() req,
    @Res() res: Response,
  ) {
    const cuit = headers.cuit;
    const cuenta = req.query.cuenta.toString();
    const tipoCuenta = req.query.tipoCuenta.toString();
    const typeResponse = 0;

    try {
      if (typeResponse > 0) {
        throw 'Error generico';
      }

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/cuentas-por-cuit.json',
      );

      const cuentasPorCuit = await this.lowdbService.find(
        { cuit },
        'cuentasPorCuit',
      );

      const cuentaPorCuit = cuentasPorCuit.datos.find((item) => {
        return (
          item.nroCuenta.indexOf(cuenta) > -1 &&
          item.tipoCuenta.id.indexOf(tipoCuenta) > -1
        );
      });

      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        limite: cuentaPorCuit.limite,
      });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al consultar limite de cuenta',
      });
    }
  }

  // Obtiene configuracion por banco/producto
  @Get('transferencias/configuracion')
  getConfiguracion(@Res() res: Response) {
    const typeResponse = 0;

    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          habTrxFuturas: true,
          horaCierre: '18:00',
        });
        break;
      case 1:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          habTrxFuturas: false,
          horaCierre: '14:00',
        });
        break;
      case 2:
        res.status(HttpStatus.BAD_REQUEST).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al obtener configuracion',
        });
        break;
    }
  }

  // Obtener ver comprobante
  @Get('/transferencia/:transaccion/comprobante')
  async obtenerComprobanteTransferencias(
    @Headers() headers,
    @Param('transaccion') nroTransferencia,
    @Req() req,
    @Res() res: Response,
  ) {
    const typeResponse = 0;

    try {
      if (typeResponse > 0) {
        throw 'Error interno';
      }
      await this.lowdbService.initDatabase(
        './src/modules/transferencias-APPWEB-mock/json/transferencias.json',
      );
      const transferencia = await this.lowdbService.find(
        { nroTransferencia: Number(nroTransferencia) },
        'transferencias',
      );

      const cbuShort = transferencia.cbuDestinatario.slice(0, 3);

      await this.lowdbService.initDatabase(
        './src/modules/configuracion-APPWEB-mock/json/bancos.json',
      );

      const bancos = await this.lowdbService.findAll('bancos');

      const banco = bancos.find(
        (banco) => banco.codigoBCRA.indexOf(cbuShort) > -1,
      );

      await this.lowdbService.initDatabase(
        './src/modules/cuentas-APPWEB-mock/json/tipos-cuenta.json',
      );

      const tiposCuenta = await this.lowdbService.findAll('tiposCuenta');
      const tipoCuentaDebito = tiposCuenta.find(
        (tipoCuenta) =>
          tipoCuenta.id.indexOf(transferencia.tipoCuentaDebitoId) > -1,
      );

      const transfDto = this.getMapTransferencia(
        transferencia,
        banco.nombre,
        tipoCuentaDebito.descripcion,
      );

      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        ...transfDto,
      });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al consultar limite de cuenta',
      });
    }
  }

  getMapTransferencia(
    transferencia: any,
    banco: string,
    tipoCuentaDebito: string,
  ): any {
    return {
      nroTransferencia: transferencia.nroTransferencia,
      tipoTransferencia:
        transferencia.tipo === 'TON' ? 'Inmediata' : 'Programada',
      fechaCarga: this.reFormatDate(transferencia.fechaCarga),
      fechaImputacion: this.reFormatDate(transferencia.fechaImputacion),
      fechaHoraEnvio: '16/10/2022 14:45',
      ordenante: 'Ordenante',
      cuitCuentaDebito: '30359964001',
      banco: banco,
      tipoCuentaDebito: tipoCuentaDebito,
      nroCuentaDebito: transferencia.numeroCuentaDebito,
      destinatario: transferencia.nombreDestinatario,
      cuitCuentaCredito: transferencia.cuitCuentaCredito,
      tipoCuentaCredito: transferencia.tipoCuenta.descripcion,
      nroCuentaCredito: transferencia.numeroCuentaCredito,
      cbuDestinatario: transferencia.cbuDestinatario,
      importe: '$ ' + transferencia.importe,
      estado: transferencia.estadoName,
      concepto: transferencia.concepto,
      referencia: transferencia.referencia,
      solicitante: 'Enzo Fernandez',
      fechaHoraConsulta: '16/10/2022 14:45',
    };
  }

  reFormatDate(fecha: string): string {
    if (fecha) {
      const fechaAux = fecha.split('-');
      return fechaAux[2] + '/' + fechaAux[1] + '/' + fechaAux[0];
    } else {
      return null;
    }
  }

  extraerDatosFiltroDestinatarios(searchList: any): any {
    const query = { destinatario: '', referencia: '' };
    query.destinatario = searchList[0].trim();
    query.referencia = searchList[1].trim();
    return query;
  }

  buscarDestinatarios(listaSearch: any, destinatarios: any[]): any[] {
    if (listaSearch.length > 1) {
      const query = this.extraerDatosFiltroDestinatarios(listaSearch);
      destinatarios = destinatarios.filter((item) =>
        Object.keys(query).every((key) => {
          return item[key].toLowerCase() === query[key].toLowerCase();
        }),
      );
    } else {
      destinatarios = destinatarios.filter((dato: any) => {
        //Busco solo por referencia
        return (
          dato.referencia
            .toString()
            .toLowerCase()
            .indexOf(listaSearch[0].toString().toLowerCase()) > -1 ||
          dato.destinatario
            .toString()
            .toLowerCase()
            .indexOf(listaSearch[0].toString().toLowerCase()) > -1
        );
      });
    }
    return destinatarios;
  }

  async getUsuario(authorization) {
    await this.lowdbService.initDatabase(
      './src/modules/usuarios-APPWEB-mock/json/usuarios.json',
    );

    const aliasUsuarioLogueado = getUserNameFromJWTToken(authorization);

    const usuario = await this.lowdbService.find(
      { alias: aliasUsuarioLogueado },
      'usuarios',
    );
    return usuario;
  }

  async firmarTransferencia(transferencia, usuario, cuit) {
    // Se firma la transferencia
    transferencia.firmas.push(usuario.cuil);
    // Se actualiza el estado si es necesario
    const cuentaEmpresa = await this.cuentaEmpresa(
      cuit,
      transferencia.numeroCuentaDebito,
    );
    //TODO:Revisar si faltan agregar mas validaciones
    const firmaCompleta =
      transferencia.firmas.length === cuentaEmpresa.firmantes.length;
    transferencia.estadoCode = firmaCompleta ? 'FC' : 'FP';
    transferencia.estadoName = firmaCompleta
      ? transferencia.tipo === 'TON'
        ? 'Pendiente de envío'
        : 'Firmado'
      : 'Pendiente de firma';

    // Se incluye la respuesta
    return {
      codigoResultado: '00',
      descripcionResultado: 'OK',
      nroOperacion: transferencia.nroTransferencia,
      estado: transferencia.estadoCode,
    };
  }

  async enviarTransferencia(transferencia, resultadoSeleccionado) {
    // Se actualiza la transferencia si cambia de estado
    if (resultadoSeleccionado.estadoCode && resultadoSeleccionado.estadoName) {
      transferencia.estadoCode = resultadoSeleccionado.estadoCode;
      transferencia.estadoName = resultadoSeleccionado.estadoName;
    }
    // Se envia la respuesta
    return {
      codigoResultado: resultadoSeleccionado.codigoResultado,
      descripcionResultado: resultadoSeleccionado.descripcionResultado,
      nroOperacion: transferencia.nroTransferencia,
      estado: transferencia.estadoCode,
    };
  }

  async actualizarBD(key, value) {
    // Se actualiza la base de datos
    await this.lowdbService.initDatabase(
      './src/modules/transferencias-APPWEB-mock/json/transferencias.json',
    );
    await this.lowdbService.getDb().set(key, value).write();
  }

  async cuentaEmpresa(cuit, numeroCuenta) {
    await this.lowdbService.initDatabase(
      './src/modules/cuentas-APPWEB-mock/json/cuentas-por-cuit.json',
    );
    const empresa = await this.lowdbService.find({ cuit }, 'cuentasPorCuit');
    const cuentaEmpresa = empresa.datos.find(
      (cuentaEmpresa) => cuentaEmpresa.nroCuenta === numeroCuenta,
    );
    return cuentaEmpresa;
  }

  isFirmaCompleta(firmantes, firmas) {
    const completaEsquema = firmantes.every((element) => {
      return firmas.includes(element);
    });
  }

  @Post('/transferencia/eliminar')
  eliminaTransferencia(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;

    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          operaciones: [],
        });
        break;
      case 1:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al intentar eliminar las transferencias',
        });
        break;
    }
  }
}
