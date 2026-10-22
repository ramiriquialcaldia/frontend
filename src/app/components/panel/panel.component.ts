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
  sesion: SesionUsuario | null = null;
  datosPanel: any = null;

  // Permisos según el rol
  esAdmin: boolean = false;
  puedeVerTrazabilidad: boolean = false;
  puedeCrearUsuarios: boolean = false;

  // Control de vistas del menú
  pestanaActiva: 'general' | 'trazabilidad' = 'general';

  // Persona seleccionada para la vista en 3 partes
  personaSeleccionada: any = null;
  autorizacionPersona: any = null;
  valoracionesPersona: any[] = [];
  indicadoresIAPersona: any[] = [];

  // Modal para crear usuarios (Solo Admin)
  mostrarModalCrear: boolean = false;
  nuevoUsuario = { Usuario: '', Contrasena: '', PermisosRol: 'CONTRATISTA' };
  mensajeCreacion: string = '';
  errorCreacion: string = '';
  cargandoCreacion: boolean = false;

  mostrarModalPersona: boolean = false;
cargandoPersona: boolean = false;
mensajePersona: string = '';
errorPersona: string = '';

// 1. En la definición de variables de la clase PanelComponent:
puedeRegistrarPersona: boolean = false;



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
  FechaAutorizacion: new Date().toISOString().substring(0, 10), // Fecha de hoy (YYYY-MM-DD)
  UbicacionDocumentoFisico: '',
  SupervisorVerifico: ''
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
  const rol = (this.sesion.rol || '').trim().toUpperCase();

  // 4. Permisos de Trazabilidad: SUPERVISOR, CONTROL y ADMIN
  this.puedeVerTrazabilidad = ['SUPERVISOR', 'CONTROL', 'ADMIN', 'ADMINISTRADOR'].includes(rol);

  // 5. Permiso de Crear Usuarios: ADMIN y SUPERVISOR (deja esta sola línea)
  this.puedeCrearUsuarios = ['ADMIN', 'ADMINISTRADOR', 'SUPERVISOR'].includes(rol);

  // NUEVA REGLA: Registrar Persona (Solo Administrador y Supervisor, CONTRATISTA queda excluido)
  this.puedeRegistrarPersona = ['ADMIN', 'ADMINISTRADOR', 'SUPERVISOR'].includes(rol);

  // 6. Consultar los datos del panel
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
    const autorizaciones = tablas['AUTORIZACION_FICHAMEDICA'] || [];
    this.autorizacionPersona = autorizaciones.find((a: any) => a.PersonaId === persona.Id) || null;

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

// guardarPersona(): void {
//   this.mensajePersona = '';
//   this.errorPersona = '';
//   this.cargandoPersona = true;

//   this.authService.crearPersona(this.nuevaPersona).subscribe({
//     next: (res) => {
//       this.cargandoPersona = false;
//       this.mensajePersona = '¡Persona registrada exitosamente!';
//       // Refrescamos los datos del panel para que aparezca en la tabla de inmediato
//       this.cargarDatos();
//       setTimeout(() => {
//         this.cerrarModalPersona();
//       }, 1500);
//     },
//     error: (err) => {
//       this.cargandoPersona = false;
//       this.errorPersona = err.error?.detail || 'Error al registrar la persona.';
//     }
//   });
// }

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

  salir(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}