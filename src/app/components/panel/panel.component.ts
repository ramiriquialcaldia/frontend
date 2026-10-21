// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { Router } from '@angular/router';
// import { AuthService, SesionUsuario } from '../../services/auth.service';

// @Component({
//   selector: 'app-panel',
//   standalone: true,
//   imports: [CommonModule],
//   template: `
//     <div style="padding: 20px;" *ngIf="datosPanel">
//       <h2>Bienvenido, {{ sesion?.usuario }} (Rol: {{ sesion?.rol }})</h2>
//       <p>Tablas disponibles según tu perfil:</p>
//       <ul>
//         <li *ngFor="let tabla of obtenerNombresTablas()">
//           <strong>{{ tabla }}</strong> ({{ datosPanel.tablas[tabla].length }} registros)
//         </li>
//       </ul>
//       <button (click)="salir()">Cerrar Sesión</button>
//     </div>
//   `
// })
// export class PanelComponent implements OnInit {
//   sesion: SesionUsuario | null = null;
//   datosPanel: any = null;

//   constructor(private authService: AuthService, private router: Router) {}

//   ngOnInit(): void {
//     this.sesion = this.authService.sesionActual;

//     // Si no hay sesión activa, vuelve al login
//     if (!this.sesion) {
//       this.router.navigate(['/login']);
//       return;
//     }

//     // Llama al endpoint de panel usando la variable de sesión guardada
//     this.authService.obtenerDatosPanel().subscribe({
//       next: (respuesta) => {
//         this.datosPanel = respuesta;
//       },
//       error: (err) => {
//         console.error('Error al obtener datos del panel:', err);
//         this.router.navigate(['/login']);
//       }
//     });
//   }

//   obtenerNombresTablas(): string[] {
//     return this.datosPanel ? Object.keys(this.datosPanel.tablas) : [];
//   }

//   salir(): void {
//     this.authService.cerrarSesion();
//     this.router.navigate(['/login']);
//   }
// }









































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
  tablaSeleccionada: string = '';
  columnasTabla: string[] = [];

  // ==========================================
  // PARTE NUEVA: Control de permisos y modal
  // ==========================================
  esAdminOSupervisor: boolean = false;
  mostrarModalCrear: boolean = false;

  nuevoUsuario = {
    Usuario: '',
    Contrasena: '',
    PermisosRol: 'CONTRATISTA'
  };

  mensajeCreacion: string = '';
  errorCreacion: string = '';
  cargandoCreacion: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.sesion = this.authService.sesionActual || JSON.parse(localStorage.getItem('sesion_activa') || 'null');

    if (!this.sesion) {
      this.router.navigate(['/login']);
      return;
    }

    // ==========================================
    // PARTE NUEVA: Validación de rol
    // ==========================================
    const rol = this.sesion.rol.toUpperCase();
    this.esAdminOSupervisor = rol === 'ADMIN' || rol === 'ADMINISTRADOR' || rol === 'SUPERVISOR';

    // Cargar las tablas según el rol
    this.authService.obtenerDatosPanel(this.sesion).subscribe({
    next: (res) => {
      this.datosPanel = res;
    },
    error: (err) => {
      console.error('Error al cargar datos del panel:', err);
      this.router.navigate(['/login']);
    }
    });
  }

  obtenerNombresTablas(): string[] {
    return this.datosPanel?.tablas ? Object.keys(this.datosPanel.tablas) : [];
  }

  seleccionarTabla(event: any): void {
    this.tablaSeleccionada = event.target.value;
    const datos = this.datosPanel?.tablas[this.tablaSeleccionada];
    this.columnasTabla = datos && datos.length > 0 ? Object.keys(datos[0]) : [];
  }

  // ==========================================
  // PARTE NUEVA: Métodos para el modal y envío
  // ==========================================
  abrirModal(): void {
    this.mensajeCreacion = '';
    this.errorCreacion = '';
    this.nuevoUsuario = { Usuario: '', Contrasena: '', PermisosRol: 'CONTRATISTA' };
    this.mostrarModalCrear = true;
  }

  cerrarModal(): void {
    this.mostrarModalCrear = false;
  }

  guardarNuevoUsuario(): void {
    this.mensajeCreacion = '';
    this.errorCreacion = '';
    this.cargandoCreacion = true;

    this.authService.preCrearUsuario(this.nuevoUsuario).subscribe({
      next: (res) => {
        this.cargandoCreacion = false;
        this.mensajeCreacion = res.mensaje || '¡Usuario pre-creado exitosamente!';
        this.nuevoUsuario = { Usuario: '', Contrasena: '', PermisosRol: 'CONTRATISTA'};
      },
      error: (err) => {
        this.cargandoCreacion = false;
        this.errorCreacion = err.error?.detail || 'Error al pre-crear el usuario.';
      }
    });
  }

  salir(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}