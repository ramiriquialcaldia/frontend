// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-completar-registro',
//   imports: [],
//   templateUrl: './completar-registro.component.html',
//   styleUrl: './completar-registro.component.css'
// })
// export class CompletarRegistroComponent {

// }








import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-completar-registro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './completar-registro.component.html',
  styleUrls: ['./completar-registro.component.css']
})
export class CompletarRegistroComponent implements OnInit {
  formulario = {
    Usuario: '',
    NombreCompleto: '',
    CorreoInstitucional: '',
    Profesion: '',
    NuevaContrasena: ''
  };

  mensajeExito: string = '';
  mensajeError: string = '';
  cargando: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    const sesion = this.authService.sesionActual;

    // Si no ha iniciado sesión o si NO es primer ingreso, no debe estar aquí
    if (!sesion) {
      this.router.navigate(['/login']);
      return;
    }
    if (!sesion.primer_ingreso) {
      this.router.navigate(['/panel']);
      return;
    }

    // Pre-cargamos el nombre de usuario
    this.formulario.Usuario = sesion.usuario;
  }

  guardarDatos(): void {
    this.mensajeError = '';
    this.cargando = true;

    this.authService.completarRegistro(this.formulario).subscribe({
      next: () => {
        this.cargando = false;
        this.mensajeExito = '¡Registro completado exitosamente! Inicia sesión con tu nueva contraseña.';

        // Limpiamos la sesión temporal para que inicie con su nueva clave
        this.authService.cerrarSesion();

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeError = err.error?.detail || 'Error al actualizar los datos.';
      }
    });
  }
}