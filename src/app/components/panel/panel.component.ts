import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, SesionUsuario } from '../../services/auth.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';


@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.css']
})
export class PanelComponent implements OnInit {

  // Referencias para la cámara web del PC (#3)
  @ViewChild('videoCamara') videoCamara!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasFoto') canvasFoto!: ElementRef<HTMLCanvasElement>;
  camaraActiva: boolean = false;
  streamCamara: MediaStream | null = null;
  subiendoFoto: boolean = false;

  // Variables para carga y visualización de PDF (#5)
  subiendoPdf: boolean = false;
  urlPdfVisor: SafeResourceUrl | null = null;
  urlPdfTexto: string = '';

  generandoIA: boolean = false;

  // Sesión y datos del backend
  sesion: SesionUsuario | null = null;
  datosPanel: any = null;

  // Permisos según el rol
  esAdmin: boolean = false;
  puedeVerTrazabilidad: boolean = false;
  puedeCrearUsuarios: boolean = false;
  puedeRegistrarPersona: boolean = false;
  esSoloContratista: boolean = false;
  puedeVerAutorizacion: boolean = false;



  // 1. Declarar la variable de permiso en la clase:
  puedeCambiarEstado: boolean = false;

  // Control de vistas del menú
 pestanaActiva: 'general' | 'trazabilidad' | 'usuarios' = 'general';
  listaUsuarios: any[] = [];

  // Persona seleccionada para la vista en 3 partes
  personaSeleccionada: any = null;
  autorizacionPersona: any = null;
  valoracionesPersona: any[] = [];
  indicadoresIAPersona: any[] = [];

  documentosPersona: any[] = [];

  // ==========================================
  // MODAL 1: PRE-CREAR USUARIO (Solo Admin)
  // ==========================================
  mostrarModalCrear: boolean = false;
  nuevoUsuario = { Usuario: '', Contrasena: '', PermisosRol: 'CONTRATISTA' };
  mensajeCreacion: string = '';
  errorCreacion: string = '';
    cargandoCreacion: boolean = false;
  
  // ==========================================
  // MODAL 2: REGISTRAR PERSONA (Admin / Supervisor)
  // ==========================================
  mostrarModalPersona: boolean = false;
  cargandoPersona: boolean = false;
  mensajePersona: string = '';
  errorPersona: string = '';

  nuevaPersona: any = {
    Nombres: '',
    Apellidos: '',
    TipoDocumento: 'CC',
    NumeroDocumento: '',
    FechaNacimiento: '',
    Sexo: 'MASCULINO',
    Telefono: '',
    Direccion: '',
    Eps: '',
    GrupoSanguineo: '',
    CondicionDiscapacidad: 'NO',
    PerteneceGrupoEtnico: 'NINGUNO',
    Religion: '',
    VictimaConflicto: 'NO',
    Peso: null,
    Altura: null,
    Estudio: 'PRIMARIA',
    ConQuienVive: '',
    DiagnosticoPrincipal: '',
    CirugiasRealizadas: '',
    MedicamentosConsume: '',
    HijosYCuantosResponden: '',
    NombreEmergencia: '',
    NumeroEmergencia: '',
    ObservacionGeneral: '',
    Estado: 'ACTIVO'
  };

  nuevaAutorizacion: any = {
    NombreUsuarioAutoriza: '',
    SeInformoAdultoMayor: 'Sí',
    ManifestoAutorizacion: 'Sí',
    ExisteSoporteDocumental: 'Sí',
    FechaAutorizacion: new Date().toISOString().substring(0, 10),
    UbicacionDocumentoFisico: '',
    SupervisorVerifico: ''
  };

  // 1. Objeto para almacenar los valores de búsqueda por columna
  filtrosPersonas = {
    documento: '',
    nombres: '',
    apellidos: '',
    direccion: '',
    estado: ''
  };

  // ==========================================
  // MODAL 3: NUEVA VALORACIÓN (Solo Contratista)
  // ==========================================
  mostrarModalValoracion: boolean = false;
  cargandoValoracion: boolean = false;
  mensajeValoracion: string = '';
  errorValoracion: string = '';

  nuevaValoracion = {
    PersonaId: 0,
    NombrePersona: '',       // Se muestra en el modal (bloqueado)
    NombreProfesional: '',   // Usuario en sesión (bloqueado)
    ValoracionDetalle: ''    // Campo editable donde escribe la valoración
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
  // 1. Recuperar la sesión
  this.sesion = this.authService.sesionActual || JSON.parse(localStorage.getItem('sesion_activa') || 'null');

  // 2. Si no hay sesión, redirigir al login
  if (!this.sesion) {
    this.router.navigate(['/login']);
    return;
  }
  
  // 3. Obtener el rol en mayúsculas y sin espacios
  // const rol = (this.sesion.rol || '').trim().toUpperCase();
  const rol = (this.sesion?.rol || '').trim().toUpperCase();

  // 4. Permisos de Trazabilidad: SUPERVISOR, CONTROL y ADMIN
  this.puedeVerTrazabilidad = ['ADMIN', 'ADMINISTRADOR'].includes(rol);

    // 5. Permiso de Crear Usuarios: ADMIN y SUPERVISOR (deja esta sola línea)
  this.puedeCrearUsuarios = ['ADMIN', 'ADMINISTRADOR', 'SUPERVISOR'].includes(rol);

  // NUEVA REGLA: Registrar Persona (Solo Administrador y Supervisor, CONTRATISTA queda excluido)
  this.puedeRegistrarPersona = ['ADMIN', 'ADMINISTRADOR', 'SUPERVISOR'].includes(rol);

  // 7. Activa el botón de valoración para el contratista
  this.esSoloContratista = rol === 'CONTRATISTA';

  this.puedeVerAutorizacion = ['ADMIN', 'ADMINISTRADOR', 'SUPERVISOR'].includes(rol);


  this.puedeCambiarEstado = ['ADMIN', 'ADMINISTRADOR', 'SUPERVISOR'].includes(rol);

  this.puedeVerAutorizacion = ['ADMIN', 'ADMINISTRADOR', 'SUPERVISOR'].includes(rol);

  // 8. Consultar los datos del panel
  this.cargarDatos();
}

  cargarDatos(): void {
    this.authService.obtenerDatosPanel(this.sesion).subscribe({
      next: (res) => {
        this.datosPanel = res;

        // Si tienes una persona abierta en pantalla, actualiza sus listas en vivo
        if (this.personaSeleccionada) {
          this.seleccionarPersona(this.personaSeleccionada);
        }
      },
      error: (err) => {
        console.error('Error al cargar datos del panel:', err);
      }
    });
  }


  // Al hacer clic en una persona de la tabla general
  seleccionarPersona(persona: any): void {
    this.personaSeleccionada = persona;

    this.urlPdfVisor = null;
    this.cargarDocumentosDePersona(persona.Id);

    const tablas = this.datosPanel?.tablas || {};

    // 1. Autorización de esta persona
    // 1. Autorización de esta persona (comparación con == para evitar errores de tipo)
    const autorizaciones: any[] = tablas['AUTORIZACION_FICHAMEDICA'] || [];
    this.autorizacionPersona = autorizaciones.find((a: any) => a.PersonaId == persona.Id) || null;

    // 2. Valoraciones institucionales de esta persona
    const valoraciones = tablas['VALORACIONES_INSTITUCIONALES'] || [];
    this.valoracionesPersona = valoraciones.filter((v: any) => v.PersonaId === persona.Id);

    // 3. Indicadores IA de esta persona
    const indicadores = tablas['INDICADORES_IA'] || [];
    this.indicadoresIAPersona = indicadores.filter((i: any) => i.PersonaId === persona.Id);
  }

  limpiarSeleccion(): void {
    this.personaSeleccionada = null;
    this.autorizacionPersona = null;
    this.valoracionesPersona = [];
    this.indicadoresIAPersona = [];
  }

  // Modal Crear Usuario
  abrirModal(): void {
    this.nuevoUsuario = { Usuario: '', Contrasena: '', PermisosRol: 'CONTRATISTA' };
    this.mensajeCreacion = '';
    this.errorCreacion = '';
    this.mostrarModalCrear = true;
  }

  cerrarModal(): void {
    this.mostrarModalCrear = false;
  }

  guardarNuevoUsuario(): void {
  this.mensajeCreacion = '';
  this.errorCreacion = '';
  this.cargandoCreacion = true;

  const payload = {
    ...this.nuevoUsuario,
    AdminUsuarioId: this.sesion?.id_usuario || null // Envía el ID del administrador en sesión
  };

  this.authService.preCrearUsuario(payload).subscribe({
    next: (res) => {
      this.cargandoCreacion = false;
      this.mensajeCreacion = res.mensaje || '¡Usuario pre-creado exitosamente!';
      this.nuevoUsuario = {
        Usuario: '',
        Contrasena: '',
        PermisosRol: 'CONTRATISTA'
      };
      this.cargarDatos(); // Refresca las tablas para ver el evento en trazabilidad
    },
    error: (err) => {
      this.cargandoCreacion = false;
      this.errorCreacion = err.error?.detail || 'Error al pre-crear el usuario.';
    }
  });
}

  //crear usuario lo ase el supervisor
abrirModalPersona(): void {
  this.mensajePersona = '';
  this.errorPersona = '';

  // Limpiar campos de la persona
  this.nuevaPersona = {
    Nombres: '',
    Apellidos: '',
    TipoDocumento: 'CC',
    NumeroDocumento: '',
    FechaNacimiento: '',
    Sexo: 'MASCULINO',
    Telefono: '',
    Direccion: '',
    Eps: '',
    CondicionDiscapacidad: 'NO',
    PerteneceGrupoEtnico: 'NINGUNO',
    Religion: '',
    VictimaConflicto: 'NO',
    Peso: null,
    Altura: null,
    Estudio: 'PRIMARIA',
    ConQuienVive: '',
    DiagnosticoPrincipal: '',
    CirugiasRealizadas: '',
    MedicamentosConsume: '',
    HijosYCuantosResponden: '',
    NombreEmergencia: '',
    NumeroEmergencia: '',
    ObservacionGeneral: '',
    Estado: 'ACTIVO'
  };

  // Limpiar y preparar la autorización
  this.nuevaAutorizacion = {
    NombreUsuarioAutoriza: '',
    SeInformoAdultoMayor: 'Sí',
    ManifestoAutorizacion: 'Sí',
    ExisteSoporteDocumental: 'Sí',
    FechaAutorizacion: new Date().toISOString().substring(0, 10),
    UbicacionDocumentoFisico: '',
    SupervisorVerifico: this.sesion?.usuario || ''
  };

  this.mostrarModalPersona = true;
}

cerrarModalPersona(): void {
  this.mostrarModalPersona = false;
}

// 2. Método que filtra en tiempo real la tabla de PERSONAS
obtenerPersonasFiltradasTabla(): any[] {
  const personas: any[] = this.datosPanel?.tablas?.['PERSONAS'] || [];

  return personas.filter(p => {
    // Normalizar valores a texto en minúsculas
    const doc = (p.NumeroDocumento || p.Cedula || '').toString().toLowerCase();
    const nom = (p.Nombres || '').toLowerCase();
    const ape = (p.Apellidos || '').toLowerCase();
    const dir = (p.DireccionResidencia || p.Direccion || '').toLowerCase();
    const est = (p.Estado || 'ACTIVO').toLowerCase();

    // Comprobar coincidencia con cada filtro
    const coincideDoc = doc.includes(this.filtrosPersonas.documento.toLowerCase().trim());
    const coincideNom = nom.includes(this.filtrosPersonas.nombres.toLowerCase().trim());
    const coincideApe = ape.includes(this.filtrosPersonas.apellidos.toLowerCase().trim());
    const coincideDir = dir.includes(this.filtrosPersonas.direccion.toLowerCase().trim());
    const coincideEst = this.filtrosPersonas.estado === '' || est === this.filtrosPersonas.estado.toLowerCase().trim();

    return coincideDoc && coincideNom && coincideApe && coincideDir && coincideEst;
  });
}

// 3. Método opcional para limpiar todos los filtros de una vez
limpiarFiltros(): void {
  this.filtrosPersonas = {
    documento: '',
    nombres: '',
    apellidos: '',
    direccion: '',
    estado: ''
  };
}

guardarPersona(): void {
    this.mensajePersona = '';
    this.errorPersona = '';
    this.cargandoPersona = true;

    this.authService.crearPersona(this.nuevaPersona).subscribe({
      next: (resPersona) => {
        const nuevoIdPersona = resPersona.id_persona;

        const payloadAutorizacion = {
          ...this.nuevaAutorizacion,
          PersonaId: nuevoIdPersona,
          NombreUsuarioAutoriza: this.nuevaAutorizacion.NombreUsuarioAutoriza || `${this.nuevaPersona.Nombres} ${this.nuevaPersona.Apellidos}`.trim()
        };

        this.authService.crearAutorizacion(payloadAutorizacion).subscribe({
          next: () => {
            this.cargandoPersona = false;
            this.mensajePersona = '¡Persona y Autorización registradas exitosamente!';

            // >>> DISPARO DE AUDITORÍA CON GPS Y USUARIO <<<
            // this.authService.registrarAccionAuditoria(
            //   `CREAR_PERSONA_ID_${nuevoIdPersona}`,
            //   'PERSONAS',
            //   `Doc: ${this.nuevaPersona.NumeroDocumento} | ${this.nuevaPersona.Nombres} ${this.nuevaPersona.Apellidos}`
            // );

            this.cargarDatos();
            setTimeout(() => {
              this.cerrarModalPersona();
            }, 1500);
          },
          error: (errAut) => {
            this.cargandoPersona = false;
            this.errorPersona = 'Se creó la persona, pero falló la autorización: ' + (errAut.error?.detail || errAut.message);
          }
        });
      },
      error: (errPer) => {
        this.cargandoPersona = false;
        this.errorPersona = errPer.error?.detail || 'Error al registrar los datos de la persona.';
      }
    });
  }

    actualizarNombreAutoriza(): void {
      const nombres = (this.nuevaPersona.Nombres || '').trim();
      const apellidos = (this.nuevaPersona.Apellidos || '').trim();
      
      // Concatena automáticamente "Nombres Apellidos"
      this.nuevaAutorizacion.NombreUsuarioAutoriza = `${nombres} ${apellidos}`.trim();
    }

    // Abre el modal asignando los datos bloqueados de la persona seleccionada
    abrirModalValoracionDirecta(): void {
      if (!this.personaSeleccionada) return;

      this.mensajeValoracion = '';
      this.errorValoracion = '';

      const nombres = this.personaSeleccionada.Nombres || '';
      const apellidos = this.personaSeleccionada.Apellidos || '';

      this.nuevaValoracion = {
        PersonaId: this.personaSeleccionada.Id,
        NombrePersona: `${nombres} ${apellidos}`.trim(),
        NombreProfesional: this.sesion?.usuario || '',
        ValoracionDetalle: ''
      };

      this.mostrarModalValoracion = true;
    }

    cerrarModalValoracion(): void {
      this.mostrarModalValoracion = false;
    }

    guardarValoracion(): void {
    if (!this.nuevaValoracion.ValoracionDetalle.trim()) {
      this.errorValoracion = 'Por favor ingrese el detalle de la valoración.';
      return;
    }

    this.cargandoValoracion = true;
    this.mensajeValoracion = '';
    this.errorValoracion = '';

    const payload = {
      PersonaId: this.nuevaValoracion.PersonaId,
      NombreProfesional: this.nuevaValoracion.NombreProfesional,
      ValoracionDetalle: this.nuevaValoracion.ValoracionDetalle
    };

    this.authService.crearValoracion(payload).subscribe({
      next: (res: any) => {
        this.cargandoValoracion = false;
        this.mensajeValoracion = '¡Valoración guardada exitosamente!';

        // >>> DISPARO DE AUDITORÍA CON GPS Y USUARIO <<<
        // this.authService.registrarAccionAuditoria(
        //   `CREAR_VALORACION_ID_${res.id_valoracion || this.nuevaValoracion.PersonaId}`,
        //   'VALORACIONES_INSTITUCIONALES',
        //   `PersonaId: ${this.nuevaValoracion.PersonaId} | Paciente: ${this.nuevaValoracion.NombrePersona}`
        // );

        this.cargarDatos();
        setTimeout(() => {
          this.cerrarModalValoracion();
        }, 1500);
      },
      error: (err) => {
        this.cargandoValoracion = false;
        this.errorValoracion = err.error?.detail || 'Error al guardar la valoración.';
      }
    });
  }

// ==========================================
  // CAMBIAR ESTADO DE LA PERSONA (ACTIVO / INACTIVO)
  // ==========================================
cambiarEstadoPersona(persona: any, event: MouseEvent): void {
    event.stopPropagation();

    if (!this.puedeCambiarEstado) {
      alert('No tienes permisos para modificar el estado de los adultos mayores.');
      return;
    }

    const nombreCompleto = `${persona.Nombres || ''} ${persona.Apellidos || ''}`.trim();
    const estadoActual = (persona.Estado || 'ACTIVO').toUpperCase();
    const proximoEstado = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    const mensaje = `ESTA ACCIÓN DEJA A ${proximoEstado} A LA PERSONA SELECCIONADA (${nombreCompleto}). ¿ESTÁS SEGURO/A DE LA ACCIÓN QUE VAS A REALIZAR?`;

    if (window.confirm(mensaje)) {
      // Enviar el ROL real ('SUPERVISOR' o 'ADMIN') para validar permisos en FastAPI
      const rolActual = (this.sesion?.rol || '').trim().toUpperCase();
      
      this.authService.actualizarEstadoPersona(persona.Id, proximoEstado, rolActual).subscribe({
        next: () => {
          persona.Estado = proximoEstado;
          if (this.personaSeleccionada && this.personaSeleccionada.Id === persona.Id) {
            this.personaSeleccionada.Estado = proximoEstado;
          }

          // Registrar auditoría con GPS y el ID del usuario en sesión (superjuan)
          // this.authService.registrarAccionAuditoria(
          //   `CAMBIO_ESTADO_${proximoEstado}_ID_${persona.Id}`,
          //   'PERSONAS',
          //   `Persona: ${nombreCompleto}`
          // );

          this.cargarDatos();
        },
        error: (err) => {
          alert(err.error?.detail || 'Error al actualizar el estado.');
        }
      });
    }
  }

  // ==========================================
  // #3 y #4: TOMAR O SUBIR FOTO Y GUARDAR URL
  // ==========================================

  // Opción A: Subir foto desde explorador de archivos
  alSeleccionarFotoArchivo(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    this.subiendoFoto = true;
    this.authService.subirFotoPersona(file, file.name).subscribe({
      next: (res) => {
        this.subiendoFoto = false;
        // Guarda únicamente la dirección/URL en el modelo que va a SQL Server
        this.nuevaPersona.Foto = res.url;
      },
      error: (err) => {
        this.subiendoFoto = false;
        this.errorPersona = err.error?.detail || 'Error al subir la fotografía.';
      }
    });
  }

  // Opción B: Encender cámara web del PC
  async iniciarCamara(): Promise<void> {
    try {
      this.camaraActiva = true;
      this.streamCamara = await navigator.mediaDevices.getUserMedia({ video: true });
      setTimeout(() => {
        if (this.videoCamara?.nativeElement) {
          this.videoCamara.nativeElement.srcObject = this.streamCamara;
        }
      }, 100);
    } catch (error) {
      this.camaraActiva = false;
      this.errorPersona = 'No se pudo acceder a la cámara del equipo. Verifica los permisos del navegador.';
    }
  }

  // Capturar fotograma de la cámara y subirlo al servidor
  capturarFotoCamara(): void {
    if (!this.videoCamara || !this.canvasFoto) return;

    const video = this.videoCamara.nativeElement;
    const canvas = this.canvasFoto.nativeElement;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          this.subiendoFoto = true;
          this.authService.subirFotoPersona(blob, 'captura_camara.jpg').subscribe({
            next: (res) => {
              this.subiendoFoto = false;
              this.nuevaPersona.Foto = res.url; // Dirección guardada para la BD
              this.detenerCamara();
            },
            error: (err) => {
              this.subiendoFoto = false;
              this.errorPersona = err.error?.detail || 'Error al guardar la captura.';
            }
          });
        }
      }, 'image/jpeg', 0.85);
    }
  }

  detenerCamara(): void {
    if (this.streamCamara) {
      this.streamCamara.getTracks().forEach(track => track.stop());
      this.streamCamara = null;
    }
    this.camaraActiva = false;
  }

  // ==========================================
  // #5: AÑADIR PDF Y VISUALIZAR PDF
  // ==========================================
  cargarDocumentosDePersona(personaId: number): void {
    this.authService.obtenerDocumentosPersona(personaId).subscribe({
      next: (res) => {
        this.documentosPersona = res.data || [];
      },
      error: (err) => console.error('Error al cargar documentos:', err)
    });
  }

  alSeleccionarPdf(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    this.subiendoPdf = true;
    this.authService.subirDocumentoPdf(file).subscribe({
      next: (res) => {
        this.urlPdfTexto = res.url;
        this.urlPdfVisor = this.sanitizer.bypassSecurityTrustResourceUrl(res.url);

        // Si estamos dentro del expediente de una persona, guardamos en DOCUMENTOS_PERSONAS
        if (this.personaSeleccionada && this.personaSeleccionada.Id) {
          const nombreCompleto = `${this.personaSeleccionada.Nombres || ''} ${this.personaSeleccionada.Apellidos || ''}`.trim();

          this.authService.registrarDocumentoPersona({
            PersonaId: this.personaSeleccionada.Id,
            NombrePaciente: nombreCompleto,
            NombreArchivo: file.name,
            TipoDocumento: 'Soporte PDF',
            UrlDocumento: res.url,
            SubidoPor: this.sesion?.usuario || ''
          }).subscribe({
            next: () => {
              this.subiendoPdf = false;
              this.cargarDocumentosDePersona(this.personaSeleccionada.Id); // Refresca la galería de PDFs
              this.cargarDatos(); // Refresca la tabla de trazabilidad
              event.target.value = ''; // Limpia el selector de archivo
            },
            error: (err) => {
              this.subiendoPdf = false;
              alert(err.error?.detail || 'Error al registrar el PDF en la base de datos.');
            }
          });
        } else {
          // Si está en el modal de creación de persona nueva
          this.nuevaAutorizacion.UbicacionDocumentoFisico = res.url;
          this.subiendoPdf = false;
        }
      },
      error: (err) => {
        this.subiendoPdf = false;
        alert(err.error?.detail || 'Error al subir el documento PDF.');
      }
    });
  }

  // Función para abrir cualquier URL de PDF guardada en la BD dentro del visor
  verPdfEnVisor(url: string): void {
    if (!url) return;
    this.urlPdfTexto = url;
    this.urlPdfVisor = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  exportarWordHojaVida(): void {
    if (!this.personaSeleccionada) return;
    const docNum = this.personaSeleccionada.NumeroDocumento || this.personaSeleccionada.Id;

    this.authService.descargarHojaVidaWord(this.personaSeleccionada.Id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Hoja_de_Vida_${docNum}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('Error al generar el documento Word de la Hoja de Vida.')
    });
  }

  exportarWordValoraciones(): void {
    if (!this.personaSeleccionada) return;
    const docNum = this.personaSeleccionada.NumeroDocumento || this.personaSeleccionada.Id;

    this.authService.descargarValoracionesWord(this.personaSeleccionada.Id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Valoraciones_${docNum}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('Error al generar el reporte Word de Valoraciones.')
    });
  }

 ejecutarAnalisisIA(): void {
    if (!this.personaSeleccionada) return;
    this.generandoIA = true;

    this.authService.generarIndicadorIA(this.personaSeleccionada.Id).subscribe({
      next: (res: any) => {
        this.generandoIA = false;

        // Pintar el resultado al instante en la tarjeta abierta
        this.indicadoresIAPersona = [{
          Id: res.id_indicador,
          PersonaId: this.personaSeleccionada.Id,
          NombrePersona: res.nombre_persona,
          ResumenInformacion: res.resumen,
          FechaGeneracion: new Date().toISOString()
        }];

        // Sincronizar también la tabla general en memoria
        this.cargarDatos();
      },
      error: (err) => {
        this.generandoIA = false;
        alert(err.error?.detail || 'Error al actualizar el indicador.');
      }
    });
  }

  abrirGestionUsuarios(): void {
    this.pestanaActiva = 'usuarios';
    this.authService.listarUsuariosGestion().subscribe({
      next: (res) => {
        this.listaUsuarios = res.data || [];
      },
      error: (err) => console.error('Error al listar usuarios:', err)
    });
  }

  alternarAccesoUsuario(usr: any): void {
    const accion = usr.EstadoActivo ? 'QUITAR EL ACCESO (desactivar)' : 'REACTIVAR EL ACCESO';
    const confirmar = window.confirm(
      `¿Estás seguro de ${accion} al usuario "${usr.Usuario}" (${usr.PermisosRol})?`
    );
    if (!confirmar) return;

    const nuevoEstado = !usr.EstadoActivo;
    this.authService.cambiarEstadoUsuario(usr.Id, nuevoEstado).subscribe({
      next: () => {
        this.abrirGestionUsuarios(); // Actualiza la tabla de usuarios
        this.cargarDatos();          // Refresca la tabla de Trazabilidad en memoria
      },
      error: (err) => {
        alert(err.error?.detail || 'No se pudo cambiar el estado del usuario.');
      }
    });
  }


  salir(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}