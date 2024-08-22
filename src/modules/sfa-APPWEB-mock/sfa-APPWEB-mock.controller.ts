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

@Controller('/sfa-APPWEB/rest-api')
export class SfaAPPWEBMockController {
  constructor(private readonly lowdbService: LowdbService) {}

  // Obtener sfa con alias usuario
  @Post('/sfa/alias')
  async obtenerSfaAlias(@Req() req: Request, @Res() res: Response) {
    const cuil = req.body.cuil;
    const transacciones = req.body.transacciones;

    this.getSfa(res, cuil, transacciones);
  }

  // Obtener Sfa sin alias usuario
  @Post('/sfa')
  async obtenerSfaSinAlias(@Req() req: Request, @Res() res: Response) {
    const cuil = req.body.cuil;
    const transacciones = req.body.transacciones;

    this.getSfa(res, cuil, transacciones);
  }

  // Obtener Sfa usuario con sesion activa (usuario logueado)
  @Post('/sfa/auth')
  async obtenerSfaConSesionActiva(@Req() req: Request, @Res() res: Response) {
    const alias = getUserNameFromJWTToken(req.headers.authorization);
    const transacciones = req.body.transacciones;

    try {
      await this.lowdbService.initDatabase(
        './src/modules/usuarios-APPWEB-mock/json/usuarios.json',
      );

      const usuarios = await this.lowdbService.findAll('usuarios');

      const usuarioEncontrado = usuarios.find((element) => {
        return element.alias === alias;
      });

      if (usuarioEncontrado) {
        this.getSfa(res, usuarioEncontrado.cuil, transacciones);
      } else {
        throw 'error';
      }
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al obtener SFA para este usuario',
      });
    }
  }

  async getSfa(res: Response, cuil: number, transacciones: string[] = []) {
    const typeResponse = 0;

    try {
      await this.lowdbService.initDatabase(
        './src/modules/sfa-APPWEB-mock/json/sfa-conf-trx.json',
      );

      if (typeResponse > 0) {
        throw {
          status: 406,
          codigoResultado: '99',
          descripcionResultado: 'Error al obtener SFA disponibles.',
        };
      }

      let sfaEncontrados = await this.lowdbService.findAll('sfa-conf-trx');

      sfaEncontrados = sfaEncontrados.filter((sfa) =>
        transacciones.includes(sfa.transaccion),
      );

      if (!sfaEncontrados.length) {
        throw {
          status: 406,
          codigoResultado: '24',
          descripcionResultado: 'No necesita SFA.',
        };
      }

      let usaClave = false;
      let usaOTP = false;
      sfaEncontrados.forEach((sfa) => {
        if (!sfa.habilitadoTRX) {
          throw {
            status: 406,
            codigoResultado: '28',
            descripcionResultado:
              'El segundo factor de autenticación requerido para esta transacción no se encuentra activo',
          };
        }
        usaClave = usaClave || sfa.usaClave;
        usaOTP = usaOTP || sfa.usaOTP;
      });

      if (usaOTP) {
        await this.lowdbService.initDatabase(
          './src/modules/sfa-APPWEB-mock/json/sfa-usuario.json',
        );

        const sfaDelUsuario = await this.lowdbService.find(
          { cuil },
          'sfa-usuario',
        );

        if (!sfaDelUsuario) {
          throw {
            status: 406,
            codigoResultado: '03',
            descripcionResultado: 'No pudimos validar tus datos de usuario',
          };
        }

        if (!sfaDelUsuario.sfaDisponible) {
          throw {
            status: 406,
            codigoResultado: '28',
            descripcionResultado: 'No hay SFA disponibles.',
          };
        }

        if (sfaDelUsuario.sfaDisponible.bloqueado) {
          throw {
            status: 406,
            codigoResultado: '27',
            descripcionResultado: 'Su SFA se encuentra bloqueado.',
          };
        }

        return res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          sfaToken: 'Aee4',
          sfaDisponible: sfaDelUsuario.sfaDisponible,
          usaClave: usaClave,
        });
      } else {
        return res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          sfaToken: 'Aee4',
          sfaDisponible: null,
          usaClave: usaClave,
        });
      }
    } catch (error) {
      return res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Obtener codigo OTP
  @Get('/sfa/otp')
  async obtenerCodigoOtp(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;
    const tipo = req.query.tipoOTP;
    try {
      await this.lowdbService.initDatabase(
        './src/modules/sfa-APPWEB-mock/json/tipos-otp.json',
      );

      if (typeResponse > 0) {
        throw 'Error';
      }
      const tipoOTP = await this.lowdbService.find({ tipo }, 'tiposOTP');

      return res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        sfaToken: tipoOTP.sfaToken,
        destino: tipoOTP.destino,
      });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '71',
        descripcionResultado:
          'No se pudo enviar el código de segundo factor. Intentalo de nuevo en unos minutos.',
      });
    }
  }

  countClaveBloqueda = 1;
  countOtpBloquedo = 1;
  // Validar codigo OTP
  @Post('/sfa/otp')
  validarOtp(@Req() req: Request, @Res() res: Response) {
    const codigoOTP = req.body.otp;
    const clave = req.body.clave;
    if (this.countClaveBloqueda > 3) {
      res.status(406).json({
        codigoResultado: '06',
        descripcionResultado: 'La clave se encuentra bloqueada.',
      });
    }
    if (this.countOtpBloquedo > 3) {
      res.status(406).json({
        codigoResultado: '33',
        descripcionResultado:
          'Alcanzaste el máximo de intentos. SFA bloqueado temporalmente.',
      });
    }
    if (clave === '0000') {
      res.status(406).json({
        codigoResultado: '05',
        descripcionResultado: 'La clave ingresada es incorrecta.',
      });
      this.countClaveBloqueda++;
    } else {
      switch (codigoOTP) {
        case '1111':
          res.status(406).json({
            codigoResultado: '26',
            descripcionResultado:
              'Codigo incorrecto. Vuelva a ingresar su OTP.',
          });
          this.countOtpBloquedo++;
          break;
        case '0000':
          res.status(406).json({
            codigoResultado: '99',
            descripcionResultado: 'Error generico del sistema.',
          });
          break;
        default:
          res.status(HttpStatus.OK).json({
            codigoResultado: '00',
            descripcionResultado: 'OK',
            sfaToken: 'Aee4-y0-50y-s4baler0',
          });
          this.countClaveBloqueda = 1;
          this.countOtpBloquedo = 1;
          break;
      }
    }
  }

  //Validar clave autenticacion
  @Post('/clave')
  ValidarClave(@Req() req: Request, @Res() res: Response) {
    const clave = req.body.clave;
    if (this.countClaveBloqueda > 3) {
      res.status(406).json({
        codigoResultado: '06',
        descripcionResultado: 'La clave se encuentra bloqueada.',
      });
    }
    if (clave == '0000') {
      res.status(406).json({
        codigoResultado: '05',
        descripcionResultado: 'La clave ingresada es incorrecta.',
      });
      this.countClaveBloqueda++;
    } else {
      res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        sfaToken: 'Aee4-y0-50y-s4baler0',
      });
      this.countClaveBloqueda = 1;
    }
  }

  @Get('/sfa/configuracion')
  async getConfiguracionSfa(@Headers() headers, @Res() res: Response) {
    const error98 = {
      status: 406,
      codigoResultado: '98',
      descripcionResultado: 'No mostrar enrolamiento',
    };
    const error99 = {
      status: 406,
      codigoResultado: '99',
      descripcionResultado: 'Error al obtener configuracion',
    };
    const typeResponse = 0;
    try {
      const usuario = await this.getUsuario(headers.authorization);
      await this.lowdbService.initDatabase(
        './src/modules/sfa-APPWEB-mock/json/sfa-usuario.json',
      );

      if ((typeResponse as number) === 98) {
        throw error98;
      }
      if ((typeResponse as number) === 99) {
        throw error99;
      }
      const sfaUsuario = await this.lowdbService.find(
        { cuil: usuario.cuil },
        'sfa-usuario',
      );
      const typeSFA = 4;
      const sfaDisponibles = [];
      switch (typeSFA as number) {
        case 0:
          sfaDisponibles.push('OTP_SMS');
          break;
        case 1:
          sfaDisponibles.push('OTP_EMAIL');
          break;
        case 2:
          sfaDisponibles.push('OTP_SOFT_TOKEN');
          break;
        case 3:
          sfaDisponibles.push('OTP_SMS');
          sfaDisponibles.push('OTP_EMAIL');
          break;
        case 4:
          sfaDisponibles.push('OTP_SMS');
          sfaDisponibles.push('OTP_SOFT_TOKEN');
          break;
        case 5:
          sfaDisponibles.push('OTP_SOFT_TOKEN');
          sfaDisponibles.push('OTP_EMAIL');
          break;
        case 6:
          sfaDisponibles.push('OTP_SOFT_TOKEN');
          sfaDisponibles.push('OTP_EMAIL');
          sfaDisponibles.push('OTP_SMS');
          break;
      }
      res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        sfaDisponibles: sfaDisponibles,
        tieneSFAViejo: sfaUsuario.tieneSFAViejo,
        habilitarEnrolamiento: sfaUsuario.habilitarEnrolamiento,
      });
    } catch (error) {
      res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Solicita un OTP Enrolamiento
  @Post('/otp/solicitud')
  solicitudOTPEnrolamiento(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;

    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
        });
        break;
      case 1:
        res.status(HttpStatus.BAD_REQUEST).json({
          codigoResultado: '99',
          descripcionResultado: 'Error generico',
        });
        break;
    }
  }

  // Setea si el usuario quiere ocultar el ofrecimiento de enrolamiento
  @Post('/sfa/enrolamiento/habilitacion')
  async mostrarSFAEnrolamiento(
    @Headers() headers,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const error99 = {
      status: 406,
      codigoResultado: '99',
      descripcionResultado: 'Error genérico.',
    };
    const typeResponse = 0;
    try {
      if ((typeResponse as number) === 99) {
        throw error99;
      }
      const usuarioLogeado = await this.getUsuario(headers.authorization);
      // Se actualiza la base de datos
      await this.lowdbService.initDatabase(
        './src/modules/sfa-APPWEB-mock/json/sfa-usuario.json',
      );
      const sfaUsuarios = await this.lowdbService.findAll('sfa-usuario');
      const index = sfaUsuarios.findIndex(
        (sfaUsuario) => usuarioLogeado.cuil === sfaUsuario.cuil,
      );
      sfaUsuarios[index].habilitarEnrolamiento = req.body.habilitado;
      await this.lowdbService.getDb().set('sfa-usuario', sfaUsuarios).write();
      res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
      });
    } catch (error) {
      res.status(error.status).json({
        codigoResultado: error.codigoResultado,
        descripcionResultado: error.descripcionResultado,
      });
    }
  }

  // Validar codigo OTP enrolamiento
  @Post('/otp')
  validarOtpEnrolamiento(@Req() req: Request, @Res() res: Response) {
    const codigoOTP = req.body.otp;
    const clave = req.body.clave;
    if (this.countClaveBloqueda > 3) {
      res.status(406).json({
        codigoResultado: '06',
        descripcionResultado: 'La clave se encuentra bloqueada.',
      });
    }

    if (clave === '0000') {
      res.status(406).json({
        codigoResultado: '05',
        descripcionResultado: 'La clave ingresada es incorrecta.',
      });
      this.countClaveBloqueda++;
    } else {
      switch (codigoOTP) {
        case '1111':
          res.status(406).json({
            codigoResultado: '26',
            descripcionResultado:
              'Codigo incorrecto. Vuelva a ingresar su OTP.',
          });
          break;
        case '0000':
          res.status(406).json({
            codigoResultado: '99',
            descripcionResultado: 'Error generico del sistema.',
          });
          break;
        default:
          res.status(HttpStatus.OK).json({
            codigoResultado: '00',
            descripcionResultado: 'OK',
            sfaToken: 'Aee4-y0-50y-s4baler0',
          });
          this.countClaveBloqueda = 1;
          break;
      }
    }
  }

  // Enrolar SFA
  @Post('/sfa/enrolamiento')
  enrolarSFA(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;

    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          estado: 'VE',
        });
        break;
      case 1:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          estado: 'AP',
        });
        break;
      case 2:
        res.status(HttpStatus.BAD_REQUEST).json({
          codigoResultado: '99',
          descripcionResultado: 'Error generico.',
        });
        break;
    }
  }

  // Desenrolar SFA
  @Delete('/sfa/enrolamiento')
  desenrolarSFA(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res
          .status(200)
          .json({ codigoResultado: '00', descripcionResultado: 'OK' });
        break;
      case 1:
        res.status(406).send();
        break;
      default:
        res.status(500).send();
        break;
    }
  }

  @Get('/sfa/configuracion/banco')
  getConfiguracionSFAByEntidad(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;
    const typeSFA = 4;
    const sfaId = [];
    switch (typeSFA as number) {
      case 0:
        sfaId.push('OTP_SMS');
        break;
      case 1:
        sfaId.push('OTP_EMAIL');
        break;
      case 2:
        sfaId.push('OTP_SOFT_TOKEN');
        break;
      case 3:
        sfaId.push('OTP_SMS');
        sfaId.push('OTP_EMAIL');
        break;
      case 4:
        sfaId.push('OTP_SMS');
        sfaId.push('OTP_SOFT_TOKEN');
        break;
      case 5:
        sfaId.push('OTP_SOFT_TOKEN');
        sfaId.push('OTP_EMAIL');
        break;
      case 6:
        sfaId.push('OTP_SOFT_TOKEN');
        sfaId.push('OTP_EMAIL');
        sfaId.push('OTP_SMS');
        break;
    }

    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          sfaId: sfaId,
        });
        break;
      case 1:
        res.status(HttpStatus.BAD_REQUEST).json({
          codigoResultado: '58',
          descripcionResultado: 'Error generico.',
        });
        break;
      case 2:
        res.status(HttpStatus.BAD_REQUEST).json({
          codigoResultado: '99',
          descripcionResultado: 'Error generico.',
        });
        break;
    }
  }

  // Detalle SFA
  @Get('/sfa/detalle')
  getDetalleSFA(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;

    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          estado: 'VE',
          tipoDeAutenticacion: 'OTP_SMS',
        });
        break;
      case 1:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          estado: 'AP',
          tipoDeAutenticacion: 'OTP_SMS',
        });
        break;
      case 2:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          estado: 'RE',
          tipoDeAutenticacion: 'OTP_SMS',
        });
        break;
      case 3:
        res.status(HttpStatus.BAD_REQUEST).json({
          codigoResultado: '59',
          descripcionResultado: 'No esta enrolado.',
        });
        break;
      case 4:
        res.status(HttpStatus.BAD_REQUEST).json({
          codigoResultado: '99',
          descripcionResultado: 'Error generico.',
        });
        break;
    }
  }

  @Put('sfa')
  modificatTipoSFA(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;

    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
        });
        break;
      case 1:
        res.status(HttpStatus.BAD_REQUEST).json({
          codigoResultado: '99',
          descripcionResultado: 'Error generico.',
        });
        break;
    }
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

  @Put('/sfa/formulario/descarga')
  descargaFormulario(@Req() req: Request, @Res() res: Response) {
    const typeResponse = 0;

    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        });
        break;
      case 1:
        res.status(HttpStatus.BAD_REQUEST).json({
          codigoResultado: '99',
          descripcionResultado: 'Error generico.',
        });
        break;
    }
  }

  @Post('/sfa/soft-token/desvinculacion')
  desvincularSFa(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res
          .status(200)
          .json({ codigoResultado: '00', descripcionResultado: 'OK' });
        break;
      case 1:
        res.status(406).send();
        break;
      default:
        res.status(500).send();
        break;
    }
  }
}
