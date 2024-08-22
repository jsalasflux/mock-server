import {
  Controller,
  Post,
  Req,
  Res,
  HttpStatus,
  Get,
  Put,
  Delete,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { LowdbService } from '../../lowdb/lowdb.service';
import { getUserNameFromJWTToken } from '../../utils/functions/getUserNameFromJWTToken';

@Controller('usuarios-APPWEB/rest-api')
export class UsuariosAPPWEBMockController {
  constructor(private readonly lowdbService: LowdbService) {}
  //Login
  @Post('/usuario/sesion')
  async postUsuarioSesion(@Req() req: Request, @Res() res: Response) {
    const usuario = req.body.usuario;
    switch (usuario) {
      case 'usuarioerroneo':
        res.status(406).json({
          codigoResultado: '05',
          descripcionResultado: 'Datos ingresados incorrectos',
          mostrarCaptcha: false,
        });
        break;
      case 'requierecaptcha':
        res.status(406).json({
          codigoResultado: '02',
          descripcionResultado:
            'Datos ingresados incorrectos, requiere captcha',
          mostrarCaptcha: true,
        });
        break;
      case 'passwordvencida':
        res.status(406).json({
          codigoResultado: '07',
          descripcionResultado: 'Posee la clave vencida',
          mostrarCaptcha: false,
        });
        break;
      case 'sesionactiva':
        res.status(406).json({
          codigoResultado: '08',
          descripcionResultado: 'Ya posee una sesion activa',
          mostrarCaptcha: false,
        });
        break;
      case 'usuariobloqueado':
        res.status(406).json({
          codigoResultado: '06',
          descripcionResultado: 'El usuario se encuentra bloqueado',
          mostrarCaptcha: false,
        });
        break;
      default:
        try {
          await this.lowdbService.initDatabase(
            './src/modules/usuarios-APPWEB-mock/json/usuarios.json',
          );

          const usuarios = await this.lowdbService.findAll('usuarios');

          const usuarioEncontrado = usuarios.find((element) => {
            return element.alias === usuario;
          });

          console.log('usuarioEncontrado: ', usuarioEncontrado);

          if (usuarioEncontrado) {
            console.log('paso1');

            const miusuario = {
              codigoResultado: '00',
              descripcionResultado: 'OK',
              jwtToken: usuarioEncontrado.jwtToken + '-' + 123456,
              jwtTokenRefresh: usuarioEncontrado.jwtTokenRefresh + '-' + 123456,
              timeExpireSeconds: usuarioEncontrado.timeExpireSeconds,
              nombreApellido: `${usuarioEncontrado.nombre} ${usuarioEncontrado.apellido}`,
              alias: usuarioEncontrado.alias,
              ultimaConexion: new Date(),
            };
            console.log('miusuario: ', miusuario);
            return res.status(HttpStatus.OK).json(miusuario);
          } else {
            console.log('paso2');

            res.status(HttpStatus.OK).json({
              codigoResultado: '00',
              descripcionResultado: 'OK',
              jwtToken: usuarios[0].jwtToken + '-' + randomUUID(),
              jwtTokenRefresh: usuarios[0].jwtTokenRefresh + '-' + randomUUID(),
              timeExpireSeconds: usuarios[0].timeExpireSeconds,
              nombreApellido: `${usuarios[0].nombre} ${usuarios[0].apellido}`,
              alias: usuarios[0].alias,
              ultimaConexion: new Date(),
            });
          }
        } catch (error) {
          return res.status(406).json({
            codigoResultado: '99',
            descripcionResultado: 'Error en el login',
          });
        }
        break;
    }
  }

  // Logout
  @Delete('/usuario/sesion')
  deleteUsuarioSesion(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
        });
        break;
      case 1:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al realizar logout',
        });
        break;
    }
  }

  // Refresh token de sesion
  @Post('/usuario/sesion/token')
  async postSesionToken(@Req() req: Request, @Res() res: Response) {
    const jwtRefresh = req.headers.authorization;
    const typeResponse = 0;

    if (typeResponse > 0) {
      throw 'Error';
    }

    try {
      await this.lowdbService.initDatabase(
        './src/modules/usuarios-APPWEB-mock/json/usuarios.json',
      );

      const usuarios = await this.lowdbService.findAll('usuarios');

      const usuarioEncontrado = usuarios.find((element) => {
        return (
          element.jwtTokenRefresh ===
          getUserNameFromJWTToken(jwtRefresh).toLocaleUpperCase()
        );
      });

      if (usuarioEncontrado) {
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          jwtToken: usuarioEncontrado.jwtToken + '-' + randomUUID(),
          jwtTokenRefresh:
            usuarioEncontrado.jwtTokenRefresh + '-' + randomUUID(),
          timeExpireSeconds: 90,
        });
      } else {
        throw 'Error';
      }
    } catch (error) {
      res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al refrescar token',
      });
    }
  }

  // Obtiene las empresas para el usuario logueado
  @Get('/usuario/empresas')
  async getEmpresas(@Req() req: Request, @Res() res: Response) {
    const jwtToken = req.headers.authorization;
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw 'Error';
      }
      await this.lowdbService.initDatabase(
        './src/modules/usuarios-APPWEB-mock/json/usuarios.json',
      );

      const aliasUsuarioLogueado = getUserNameFromJWTToken(jwtToken);

      const usuario = await this.lowdbService.find(
        { alias: aliasUsuarioLogueado },
        'usuarios',
      );

      await this.lowdbService.initDatabase(
        './src/modules/usuarios-APPWEB-mock/json/empresas.json',
      );

      const empresas = await this.lowdbService.findAll('empresas');

      const empresasDelUsuario = empresas.filter((empresa) => {
        return usuario.empresas.some((data) => {
          return data.cuit === empresa.cuit;
        });
      });

      return res.status(HttpStatus.OK).json({
        codigoResultado: '200',
        descripcionResultado: 'OK',
        empresas: empresasDelUsuario,
      });
    } catch (error) {
      return res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al obtener empresas',
      });
    }
  }

  // Obtiene la configuracion para composicion de clave
  @Get('/usuario/clave/formato')
  getConfiguracionClave(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          longMaxPass: 12,
          longMinPass: 8,
          minusMinPass: 2,
          mayusMinPass: 2,
          numMinPass: 2,
          caracteresEspecialesPass: '!#$/=_-.+*&@?¿¡',
          maxCaractRepetidos: 2,
          resultCode: 'RESULTADO_OK',
          resultDescription: '',
        });
        break;
      case 1:
        res
          .status(406)
          .send(
            '{"codigoResultado":"99","descripcionResultado":"Error al obtener reglas de contraseña"}',
          );
        break;
    }
  }

  // Cambio de clave vencida
  @Put('/usuario/clave')
  putClave(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          emailEnviado: 'm*******li@mail.com.ar',
        });
        break;
      case 1:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al confirmar contraseña',
        });
        break;
    }
  }

  // Genera un nuevo codigo CIU
  @Post('/usuario/clave/ciu/generacion')
  postGenerateNuevoCodigoCiu(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          email: 'm*******li@mail.com.ar',
          telefono: null,
        });
        break;
      case 1:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          email: null,
          telefono: '11*******78',
        });
        break;
      case 2:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al generar clave ciu',
        });
        break;
    }
  }

  // Valida la CIU ingresada y el cuil. responde si el usuario esta unificado o no
  @Post('/usuario/clave/ciu')
  postCalveCiu(@Req() req: Request, @Res() res: Response) {
    const cuil = req.body.cuil;
    const ciu = req.body.ciu;
    const customResponse: any = {
      codigoResultado: '00',
      descripcionResultado: 'OK',
    };
    if (cuil === '20000000001') {
      customResponse.vinculaEmpresa = 'plazosfijos3';
    } else {
      customResponse.vinculaEmpresa = null;
    }
    if (ciu === '00000') {
      res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al verificar clave ciu',
        mostrarCaptcha: true,
      });
    } else {
      res.status(HttpStatus.OK).json(customResponse);
    }
  }

  // Obtiene configuracion para la composicion de usuario
  @Get('/usuario/formato')
  getFormato(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          longMinUsuario: 2,
          longMaxUsuario: 12,
        });
        break;
      case 1:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al obtener reglas de contraseña',
        });
        break;
    }
  }

  // Validacion de nombre de usuario disponible para usuario no unificado
  @Post('/usuario')
  postValidUsuarioNoUnificado(@Req() req: Request, @Res() res: Response) {
    const usuario = req.body.alias;
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw 'Error';
      }
      switch (usuario) {
        case 'link12':
          res
            .status(HttpStatus.OK)
            .json({ codigoResultado: '00', descripcionResultado: 'OK' });
          break;
        case 'red00':
          res
            .status(HttpStatus.OK)
            .json({ codigoResultado: '00', descripcionResultado: 'OK' });
          break;
        case 'mail1':
          res
            .status(HttpStatus.OK)
            .json({ codigoResultado: '00', descripcionResultado: 'OK' });
          break;
        case 'plazosfijos3':
          res
            .status(HttpStatus.OK)
            .json({ codigoResultado: '00', descripcionResultado: 'OK' });
          break;
        default:
          res.status(302).json({
            codigoResultado: '21',
            descripcionResultado:
              'Este nombre de usuario no está disponible. Escribí otro o seleccionalo de la lista',
            usuariosSugeridos: ['mail1', 'red00', 'link12'],
          });
          break;
      }
    } catch (error) {
      res.status(406).json({
        codigoResultado: '05',
        descripcionResultado: 'Error al validar usuario',
      });
    }
  }

  // Validacion de clave para usuario unificado y no unificado
  @Post('/usuario/clave')
  postValidClave(@Res() res: Response) {
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
          descripcionResultado: 'Error al confirmar contraseña',
        });
        break;
    }
  }

  // Validacion del usuario para recupero de usuario y clave
  @Post('/usuario/alias')
  async postValidAlias(@Req() req, @Res() res: Response) {
    const cuil = req.body.cuil;
    const alias = req.body.alias;
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw 'Error';
      }
      await this.lowdbService.initDatabase(
        './src/modules/usuarios-APPWEB-mock/json/usuarios.json',
      );

      const usuarios = await this.lowdbService.findAll('usuarios');

      const usuarioEncontrado = usuarios.find((usuario) => {
        if (alias) {
          return usuario.cuil === cuil && usuario.alias === alias;
        } else {
          return usuario.cuil === cuil;
        }
      });

      if (usuarioEncontrado) {
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          email: 'm*********o@gmail.com',
        });
      } else {
        throw 'Error';
      }
    } catch (error) {
      res.status(406).json({
        codigoResultado: '05',
        descripcionResultado: 'Error al validar usuario',
      });
    }
  }

  // Recupero de usuario
  @Post('/usuario/recupero')
  postRecupero(@Req() req: Request, @Res() res: Response) {
    const cuit = req.body.cuit;
    switch (cuit) {
      case '30000000007':
        res
          .status(406)
          .json({ codigoResultado: '05', descripcionResultado: 'Error' });
        break;
      default:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          email: 'm*******li@mail.com.ar',
          jwtReenvio: 'asd123',
        });
        break;
    }
  }

  // Reenvio de email para usuario recuperado
  countResendEmail = 1;
  @Post('/usuario/recupero/reenvio')
  postReenvioEmail(@Res() res: Response) {
    if (this.countResendEmail > 3) {
      res.status(406).json({
        codigoResultado: '30',
        descripcionResultado: 'Ya no puede reenviar el mail.',
      });
      this.countResendEmail = 1;
    } else {
      res.status(HttpStatus.OK).json({
        codigoResultado: '00',
        descripcionResultado: 'OK',
        jwtReenvio: 'asd124',
      });
      this.countResendEmail++;
    }
  }

  // Recupero de clave
  @Post('/usuario/clave/recupero')
  postClaveRecupero(@Req() req: Request, @Res() res: Response) {
    const cuit = req.body.cuit;
    switch (cuit) {
      case '30000000007':
        res
          .status(406)
          .json({ codigoResultado: '05', descripcionResultado: 'Error' });
        break;
      default:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          email: 'm*********o@gmail.com',
        });
        break;
    }
  }

  // Obtener zombie session para conectar con APPWEB 2.5
  @Post('/usuario/sesion/zombie')
  postSesionZombie(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          jwt: 'fasdfasdfasd',
        });
        break;
      case 1:
        res
          .status(406)
          .json({ codigoResultado: '99', descripcionResultado: 'Error' });
        break;
    }
  }

  // Obtiene la informacion del usuario
  @Get('/usuario')
  async getUsuarioInfo(@Req() req: Request, @Res() res: Response) {
    const jwtToken = req.headers.authorization;
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw 'Error';
      }
      await this.lowdbService.initDatabase(
        './src/modules/usuarios-APPWEB-mock/json/usuarios.json',
      );

      const aliasUsuarioLogueado = getUserNameFromJWTToken(jwtToken);

      const usuarioEncontrado = await this.lowdbService.find(
        { alias: aliasUsuarioLogueado },
        'usuarios',
      );

      if (usuarioEncontrado) {
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          nombreYapellido: `${usuarioEncontrado.detalleDatosCompletos.nombre} ${usuarioEncontrado.detalleDatosCompletos.apellido}`,
          cuil: usuarioEncontrado.detalleDatosCompletos.cuil,
          avatar: usuarioEncontrado.detalleDatosCompletos.avatar,
          celular: usuarioEncontrado.detalleDatosCompletos.celular,
          prefijoCelular:
            usuarioEncontrado.detalleDatosCompletos.prefijoCelular,
          email: usuarioEncontrado.detalleDatosCompletos.email,
          usuario: usuarioEncontrado.detalleDatosCompletos.usuario,
          datosContactoPendientes:
            usuarioEncontrado.detalleDatosCompletos.datosContactoPendientes,
        });
      } else {
        throw 'Error';
      }
    } catch (error) {
      res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error al buscar datos del usuario',
      });
    }
  }

  // Obtiene si puede modificar los datos del usuario
  @Get('/usuario/configuracion/datos')
  async getConfiguracionDatos(@Req() req: Request, @Res() res: Response) {
    const jwtToken = req.headers.authorization;
    const typeResponse = 0;
    try {
      if (typeResponse > 0) {
        throw 'Error';
      }
      await this.lowdbService.initDatabase(
        './src/modules/usuarios-APPWEB-mock/json/usuarios.json',
      );

      const aliasUsuarioLogueado = getUserNameFromJWTToken(jwtToken);

      const usuarioEncontrado = await this.lowdbService.find(
        { alias: aliasUsuarioLogueado },
        'usuarios',
      );

      if (usuarioEncontrado) {
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          puedeModificarDatos: usuarioEncontrado.puedeModificarDatosPersonales,
        });
      } else {
        throw 'Error';
      }
    } catch (error) {
      res.status(406).json({
        codigoResultado: '99',
        descripcionResultado: 'Error buscar permisos del usuario',
      });
    }
  }

  // Actualizacion de email
  @Put('/usuario/email')
  modificarEmailUsuario(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
        });
        break;
      case 1:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al actualizar el email',
        });
        break;
      case 2:
        res.status(500).json({
          codigoResultado: '99',
          descripcionResultado: 'Error genérico al actualizar email',
        });
        break;
    }
  }

  // Actualizacion de celular
  @Put('/usuario/telefono')
  modificarTelefonoUsuario(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
        });
        break;
      case 1:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al actualizar el celular',
        });
        break;
      case 2:
        res.status(500).json({
          codigoResultado: '99',
          descripcionResultado: 'Error genérico al actualizar celular',
        });
        break;
    }
  }

  // Cambio de clave del usuario con SFA
  countIntentosCambioClave = 0;
  @Put('/usuario/clave/sfa')
  putValidClaveSFA(@Res() res: Response) {
    let typeResponse = 0;

    if (this.countIntentosCambioClave > 2) {
      typeResponse = 2;
    }

    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          email: 'm*******li@mail.com.ar',
        });
        break;
      case 1:
        res.status(406).json({
          codigoResultado: '05',
          descripcionResultado: 'Los datos ingresados son incorrectos.',
        });
        this.countIntentosCambioClave++;
        break;
      case 2:
        res.status(406).json({
          codigoResultado: '06',
          descripcionResultado: 'El usuario se encuentra bloqueado.',
        });
        typeResponse = 0;
        break;
      case 3:
        res.status(500).json({
          codigoResultado: '99',
          descripcionResultado: 'Error generico al confirmar contraseña',
        });
        break;
    }
  }

  // Actualización de nombre de usuario
  @Put('/usuario')
  modificarAliasUsuarioTandem(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
        });
        break;
      case 1:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado: 'Error al modificar nombre usuario',
        });
        break;
    }
  }

  // Obtiene como respuesta si el usuario esta unificado
  @Get('/usuario/configuracion/unificacion')
  getConfiguracionUnificacion(@Res() res: Response) {
    const typeResponse = 0;
    switch (typeResponse as number) {
      case 0:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          unificado: true,
        });
        break;
      case 1:
        res.status(HttpStatus.OK).json({
          codigoResultado: '00',
          descripcionResultado: 'OK',
          unificado: false,
        });
        break;
      case 2:
        res.status(406).json({
          codigoResultado: '99',
          descripcionResultado: 'Error generico',
        });
        break;
    }
  }
}
