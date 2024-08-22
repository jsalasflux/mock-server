import {
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';

import { Request, Response } from 'express';
import { LowdbService } from '../../lowdb/lowdb.service';
import { getUserNameFromJWTToken } from '../../utils/functions/getUserNameFromJWTToken';

@Controller('configuracion-APPWEB/rest-api')
export class ConfiguracionAPPWEBMockController {
  constructor(private readonly lowdbService: LowdbService) {}

  // Obtiene configuracion de pantalla
  @Get('/configuracion/pantalla/inicial')
  getPantallaInicial(@Res() res: Response) {
    const typeResponse = 0;

    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          recuperoClave: true,
          recuperoUsuario: true,
          tutorialAPPWEB: true,
        });
        break;
      case 1:
        res.status(HttpStatus.BAD_REQUEST).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al obtener configuracion',
        });
        break;
    }
  }

  // Obtiene tyc para usuarios deslogueados
  @Get('/configuracion/tyc')
  getTyc(@Req() req: Request, @Res() res: Response) {
    const transaccion = req.query.transaccion;
    const typeResponse = 0;
    if (typeResponse === 0) {
      switch (transaccion) {
        case 'RECORDAR_USUARIO':
          res.status(HttpStatus.OK).json({
            codigoResultado: '00',
            descripcionResultado: 'OK',
            terminosYCondiciones:
              'RECORDAR USUARIO...Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
            aceptacionUnica: false,
            mostrarTyC: true,
          });
          break;
        default:
          res.status(406).json({
            codigoResultado: '99',
            descripcionResultado: 'Error al obtener terminos y condiciones',
          });
          break;
      }
    } else {
      res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al obtener terminos y condiciones',
      });
    }
  }

  // Obtiene configuración dashboard
  @Get('/configuracion/dashboard')
  getConfiguracionDashboard(@Req() req: Request, @Res() res: Response) {
    res.status(HttpStatus.OK).json({
      codigoResultado: '00',
      descripcionResultado: 'OK',
      banco: 21,
      responsableCta: true,
    });
  }

  // Obtiene tyc para usuarios logueados
  @Get('/configuracion/tyc/auth')
  async getTycAuth(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const transaccion = req.query.transaccion;
    const cuit = headers.cuit;
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw 'Error';
      }
      await this.lowdbService.initDatabase(
        './src/modules/configuracion-APPWEB-mock/json/tycs.json',
      );
      const tycAuth = await this.lowdbService.find({ cuit }, 'tycs');

      const tyc = tycAuth.transacciones.find((item) => {
        return item.transaccion.indexOf(transaccion) > -1;
      });

      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        terminosYCondiciones: tyc.descripcion,
        aceptacionUnica: tyc.aceptacionUnica,
        mostrarTyC: tyc.mostrarTyC,
      });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al obtener terminos y condiciones',
      });
    }
  }

  // Acepta tyc para usuarios logueados
  @Post('/configuracion/tyc/aceptacion')
  postTycAccepted(@Req() req: Request, @Res() res: Response) {
    const transaccion = req.body.transaccion;
    switch (transaccion) {
      case 'LOGIN':
        res
          .status(HttpStatus.OK)
          .json({ codigoResultado: '00', descripcionResultado: 'OK' });
        break;
      case 'APROBAR_CTAS_CRED':
        res
          .status(HttpStatus.OK)
          .json({ codigoResultado: '00', descripcionResultado: 'OK' });
        break;
      case 'MODIFICAR_EMPRESA':
        res
          .status(HttpStatus.OK)
          .json({ codigoResultado: '00', descripcionResultado: 'OK' });
        break;
      default:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al aceptar términos y condiciones',
        });
        break;
    }
  }

  // Obtiene los bancos para la agenda
  @Get('/configuracion/bancos')
  async getBancos(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;

    try {
      if (typeResponse > 0) {
        throw 'Error';
      }

      await this.lowdbService.initDatabase(
        './src/modules/configuracion-APPWEB-mock/json/bancos.json',
      );

      const elementsPerPage = parseInt(req.query.elementsPerPage.toString());

      //Busco todos los bancos y empiezo a filtrar
      const bancos = await this.lowdbService.findAll('bancos');
      const cantidadTotal = bancos.length;

      const cantidadPaginas = Math.ceil(cantidadTotal / elementsPerPage);
      const pageNumberAux = parseInt(req.query.pageNumber as string) + 1;

      //Se devuelve datos con paginacion
      const bancosFiltrados = bancos.slice(
        elementsPerPage * (pageNumberAux - 1),
        elementsPerPage * pageNumberAux,
      );

      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        resultado: bancosFiltrados,
        paginado: { total: cantidadTotal, cantPaginas: cantidadPaginas },
      });
    } catch (e) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al obtener los bancos',
      });
    }
  }

  // Conceptos de transferencia
  @Get('/configuracion/conceptos')
  async getConceptos(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;

    try {
      if ((typeResponse as number) === 1) {
        throw 'Error interno';
      }
      let conceptos = [];

      if (req.query.modulo === 'TON') {
        await this.lowdbService.initDatabase(
          './src/modules/configuracion-APPWEB-mock/json/conceptos-ton.json',
        );
        conceptos = await this.lowdbService.findAll('conceptosTON');
      } else {
        await this.lowdbService.initDatabase(
          './src/modules/configuracion-APPWEB-mock/json/conceptos-toff.json',
        );
        conceptos = await this.lowdbService.findAll('conceptosTOFF');
      }

      if (!conceptos || conceptos.length == 0 || typeResponse > 0) {
        throw 'Error';
      } else {
        return res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          conceptos,
        });
      }
    } catch (e) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al obtener los conceptos',
      });
    }
  }

  // Configuracion importe transferencia
  @Get('/configuracion/importe')
  getImporte(@Req() req: Request, @Res() res: Response) {
    const modulo = req.query.modulo;
    const typeResponse = 0;

    try {
      if (typeResponse > 0) {
        throw 'Error interno';
      }

      switch (modulo) {
        case 'TON':
          res.status(HttpStatus.OK).json({
            codigoResultado: '00',
            descripcionResultado: 'OK',
            enteros: 15,
            decimales: 2,
          });
          break;
        case 'TOFF':
          res.status(HttpStatus.OK).json({
            codigoResultado: '00',
            descripcionResultado: 'OK',
            enteros: 17,
            decimales: 2,
          });
          break;
      }
    } catch (e) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al consultar la configuracion de importe',
      });
    }
  }

  // Obtiene los dias feriados
  @Get('/configuracion/feriados')
  async getFeriados(@Res() res: Response) {
    const typeResponse = 0;
    try {
      await this.lowdbService.initDatabase(
        './src/modules/configuracion-APPWEB-mock/json/feriados.json',
      );

      let feriados = [];
      feriados = await this.lowdbService.findAll('feriados');

      if (!feriados || feriados.length == 0 || typeResponse > 0) {
        throw 'Error';
      } else {
        return res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          feriados,
        });
      }
    } catch (e) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al obtener los feriados',
      });
    }
  }

  @Get('/menu')
  async getMenu(@Headers() headers, @Res() res: Response) {
    const cuit = headers.cuit;
    const typeResponse = 0;
    try {
      await this.lowdbService.initDatabase(
        './src/modules/usuarios-APPWEB-mock/json/empresas.json',
      );
      const empresa = await this.lowdbService.find({ cuit }, 'empresas');

      await this.lowdbService.initDatabase(
        './src/modules/configuracion-APPWEB-mock/json/menu.json',
      );
      const menuproducto = await this.lowdbService.find(
        { producto: empresa.producto },
        'menuProducto',
      );

      if (!menuproducto || menuproducto.length == 0 || typeResponse > 0) {
        throw 'Error';
      } else {
        return res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          menu: menuproducto.menu,
        });
      }
    } catch (e) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al obtener los menus',
      });
    }
  }

  @Get('/menu/directo')
  async getAccesosDirectos(@Req() req: Request, @Res() res: Response) {
    const jwtToken = req.headers.authorization;
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw 'Error';
      }

      await this.lowdbService.initDatabase(
        './src/modules/usuarios-APPWEB-mock/json/usuarios.json',
      );

      const usuario = await this.lowdbService.find(
        { alias: getUserNameFromJWTToken(jwtToken) },
        'usuarios',
      );

      await this.lowdbService.initDatabase(
        './src/modules/configuracion-APPWEB-mock/json/accesos-directos.json',
      );
      const accesoDirecto = await this.lowdbService.find(
        { cuil: usuario.cuil },
        'accesosDirectos',
      );

      return res.status(HttpStatus.OK).json({
        codigoResultado: '01',
        descripcionResultado: 'OK',
        accesosDirectos: accesoDirecto.accesos,
      });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al obtener los accesos',
      });
    }
  }

  // Obtiene banners
  @Get('/banners')
  async getBanners(@Req() req, @Res() res: Response) {
    const typeResponse = 0;

    try {
      if (typeResponse > 2) {
        throw 'Error';
      }

      await this.lowdbService.initDatabase(
        './src/modules/configuracion-APPWEB-mock/json/banners.json',
      );
      let banners = await this.lowdbService.findAll('banners');

      //Una sola imagen
      if ((typeResponse as number) === 1) {
        banners = [banners[0]];
      }

      //Imagen inexistente
      if ((typeResponse as number) === 2) {
        banners = banners.map((data, index) => {
          if (index === 0) {
            data.path = '/banners/notfound.jpg';
          }
          return data;
        });
      }

      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        banners,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al obtener banners',
      });
    }
  }

  @Get('/buzon')
  async getBuzon(@Req() req, @Res() res: Response) {
    const typeResponse = 0;

    const pageNumber = parseInt(req.query.pageNumber) + 1;
    const records = req.query.records;

    try {
      if (typeResponse > 0) {
        throw 'Error';
      }

      await this.lowdbService.initDatabase(
        './src/modules/configuracion-APPWEB-mock/json/buzon.json',
      );
      const buzon = await this.lowdbService.findAll('buzon');

      /**Filtros de ser necesarios */

      if (buzon.length) {
        const cantidadTotal = buzon.length;

        const cantidadPaginas = Math.ceil(cantidadTotal / records);

        //Se devuelve datos con paginacion
        const buzonFiltrados = buzon.slice(
          records * (pageNumber - 1),
          records * pageNumber,
        );

        return res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          paginasTotales: cantidadPaginas,
          buzon: buzonFiltrados.map((data) => {
            const {
              archivosBuzonId,
              tipo,
              archivoUrl,
              estado,
              parametrosJson,
            } = data;
            return {
              fechaHora: new Date(),
              disponibleHasta: new Date(),
              archivosBuzonId,
              tipo,
              archivoUrl,
              estado,
              parametrosJson,
            };
          }),
        });
      }
    } catch (error) {
      if ((typeResponse as number) === 1) {
        return res.status(406).json({
          codigoResultado: '31',
          descripcionResultado: 'No hay archivos para descargar',
        });
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al obtener archivos para descarga',
        });
      }
    }
  }

  @Delete('/buzon/archivos')
  eliminar(@Res() res: Response): void {
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

  @Put('/buzon/estado/descarga')
  updateDescarga(@Res() res: Response): void {
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

  // Obtener contexto para conectar con APPWEB 2.5
  @Get('/contexto/productos')
  getContexto25(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          contextos: [
            { bancoID: 29, productoID: 30, contexto: 'ciudad' },
            { bancoID: 29, productoID: 32, contexto: 'ciudad2' },
            { bancoID: 247, productoID: 30, contexto: 'roela' },
            { bancoID: 247, productoID: 32, contexto: 'roela2' },
          ],
        });
        break;
      case 1:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado:
            'No se puede realizar la accion en este momento, intente nuevamente en unos minutos',
        });
        break;
    }
  }

  @Get('/tareas')
  async getTareasPendientes(@Res() res: Response) {
    try {
      const typeResponse = 0;
      if (typeResponse > 1) {
        throw 'Error';
      }
      await this.lowdbService.initDatabase(
        './src/modules/configuracion-APPWEB-mock/json/tareas-pendientes.json',
      );
      const tareasPendientes = await this.lowdbService.findAll(
        'tareasPendientes',
      );
      switch (typeResponse as number) {
        case 0:
          res.status(HttpStatus.OK).json({
            codigoResultado: '00',
            descripcionResultado: 'OK',
            tareasPendientes,
          });
          break;
        case 1:
          res.status(406).json({
            codigoResultado: '99',
            descripcionResultado:
              'Hubo un error al intentar conseguir las tareas pendientes',
          });
          break;
      }
    } catch (error) {
      res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        tareasPendientes: [],
      });
    }
  }

  @Get('/guia')
  async getGuias(@Res() res: Response) {
    try {
      const typeResponse = 0;
      if (typeResponse > 1) {
        throw 'Error';
      }
      res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        modulo: ['DASHBOARD', 'ECHEQ', 'AFIP'],
      });
    } catch (error) {
      res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
      });
    }
  }
}
