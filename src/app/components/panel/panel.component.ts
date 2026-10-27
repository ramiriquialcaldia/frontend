import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, SesionUsuario } from '../../services/auth.service';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.css']
})
export class PanelComponent implements OnInit {
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

  // Control de vistas del menú
  pestanaActiva: 'general' | 'trazabilidad' = 'general';

  // Persona seleccionada para la vista en 3 partes
  personaSeleccionada: any = null;
  autorizacionPersona: any = null;
  valoracionesPersona: any[] = [];
  indicadoresIAPersona: any[] = [];

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
  constructor(private authService: AuthService, private router: Router) {}

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

  // 8. Consultar los datos del panel
  this.cargarDatos();
}

  cargarDatos(): void {
    this.authService.obtenerDatosPanel(this.sesion).subscribe({
      next: (res) => {
        this.datosPanel = res;
      },
      error: (err) => {
        console.error('Error al cargar datos del panel:', err);
      }
    });
  }


  // Al hacer clic en una persona de la tabla general
  seleccionarPersona(persona: any): void {
    this.personaSeleccionada = persona;

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
    this.cargandoCreacion = true;
    this.authService.preCrearUsuario(this.nuevoUsuario).subscribe({
      next: (res) => {
        this.cargandoCreacion = false;
        this.mensajeCreacion = 'Usuario creado con éxito';
        this.cargarDatos();
      },
      error: (err) => {
        this.cargandoCreacion = false;
        this.errorCreacion = err.error?.detail || 'Error al crear usuario';
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

  // Paso A: Guardar datos de la Persona
  this.authService.crearPersona(this.nuevaPersona).subscribe({
    next: (resPersona) => {
      const nuevoIdPersona = resPersona.id_persona;

      // Paso B: Asociar el nuevo ID y nombres si no se especificó otro
      const payloadAutorizacion = {
        ...this.nuevaAutorizacion,
        PersonaId: nuevoIdPersona,
        NombreUsuarioAutoriza: this.nuevaAutorizacion.NombreUsuarioAutoriza || `${this.nuevaPersona.Nombres} ${this.nuevaPersona.Apellidos}`.trim()
      };

      // Paso C: Guardar Autorización Médica vinculada
      this.authService.crearAutorizacion(payloadAutorizacion).subscribe({
        next: () => {
          this.cargandoPersona = false;
          this.mensajePersona = '¡Persona y Autorización registradas exitosamente!';
          this.cargarDatos(); // Refresca las tablas del panel
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

    // Envía la valoración a FastAPI
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
        next: () => {
          this.cargandoValoracion = false;
          this.mensajeValoracion = '¡Valoración guardada exitosamente!';
          this.cargarDatos(); // Refresca las listas para verla reflejada de inmediato
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
    // Evita que al hacer clic en el botón se seleccione la fila completa
    event.stopPropagation();

    const nombreCompleto = `${persona.Nombres || ''} ${persona.Apellidos || ''}`.trim();
    const estadoActual = (persona.Estado || 'ACTIVO').toUpperCase();
    const proximoEstado = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

    // Alerta de confirmación
    const mensajeConfirmacion = `ESTA ACCIÓN DEJA A ${proximoEstado} A LA PERSONA SELECCIONADA (${nombreCompleto}). ¿ESTÁS SEGURO/A DE LA ACCIÓN QUE VAS A REALIZAR?`;

    const confirmacion = window.confirm(mensajeConfirmacion);

    if (confirmacion) {
      this.authService.actualizarEstadoPersona(persona.Id, proximoEstado).subscribe({
        next: () => {
          // Actualiza el estado localmente para reflejar el cambio en la vista de inmediato
          persona.Estado = proximoEstado;
          if (this.personaSeleccionada && this.personaSeleccionada.Id === persona.Id) {
            this.personaSeleccionada.Estado = proximoEstado;
          }
        },
        error: (err: any) => {
          alert(err.error?.detail || 'Ocurrió un error al intentar cambiar el estado de la persona.');
        }
      });
    }
  }

  salir(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}