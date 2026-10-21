import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, SesionUsuario } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  // Modelo del formulario
  credenciales = {
    Usuario: '',
    Contrasena: ''
  };

  mensajeError: string = '';
  cargando: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}


onSubmit(): void {
    this.mensajeError = '';
    this.cargando = true;

    this.authService.iniciarSesion(this.credenciales).subscribe({
      next: (sesion: SesionUsuario) => {
        this.cargando = false;

        if (sesion.primer_ingreso) {
          this.router.navigate(['/completar-registro']);
        } else {
          this.router.navigate(['/panel']);
        }
      },
      error: (err) => {
        this.cargando = false;
        if (err.status === 401) {
          this.mensajeError = 'Usuario o contraseña incorrectos.';
        } else if (err.status === 403) {
          this.mensajeError = 'El usuario se encuentra inactivo.';
        } else {
          this.mensajeError = err.error?.detail || 'Error de conexión con el servidor.';
        }
      }
    });
  }
}