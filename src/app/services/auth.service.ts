import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';


// Estructura del JSON que devuelve el Login
export interface SesionUsuario {
  mensaje: string;
  id_usuario: number;
  usuario: string;
  rol: string;
  estado: string;
  primer_ingreso: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // URLs de tus endpoints
  private urlLogin = 'http://127.0.0.1:8000/usuarios/login';
  private urlPanel = 'http://127.0.0.1:8000/consultas/panel';
  private urlCompletar = 'http://127.0.0.1:8000/usuarios/completar-registro';
  private urlPreCrear = 'http://127.0.0.1:8000/usuarios/pre-crear';
  private urlPersonas = 'http://127.0.0.1:8000/personas';
  private urlAutorizaciones = 'http://127.0.0.1:8000/autorizaciones';

  // Variable en memoria donde queda almacenada la sesión
  public sesionActual: SesionUsuario | null = null;

  constructor(private http: HttpClient) {
    // Al iniciar, recupera la sesión si ya existía en el navegador
    const sesionGuardada = localStorage.getItem('sesion_activa');
    if (sesionGuardada) {
      this.sesionActual = JSON.parse(sesionGuardada);
    }
  }

  crearPersona(datosPersona: any): Observable<any> {
    return this.http.post(this.urlPersonas, datosPersona);
  }
  crearAutorizacion(datosAutorizacion: any): Observable<any> {
  return this.http.post(this.urlAutorizaciones, datosAutorizacion);
}

  // En AuthService:
    preCrearUsuario(datos: { Usuario: string; Contrasena: string; PermisosRol: string }): Observable<any> {
      return this.http.post(this.urlPreCrear, datos);
    }

  /**
   * 1. Realiza la autenticación y guarda la respuesta
   */
  iniciarSesion(credenciales: { Usuario: string; Contrasena: string }): Observable<SesionUsuario> {
    return this.http.post<SesionUsuario>(this.urlLogin, credenciales).pipe(
      tap((respuesta: SesionUsuario) => {
        // Guardamos en la variable de la clase
        this.sesionActual = respuesta;
        // Guardamos en localStorage para no perder la sesión al recargar la página
        localStorage.setItem('sesion_activa', JSON.stringify(respuesta));
      })
    );
  }

  // 2. AQUÍ VA EL MÉTODO: Completar Registro
  completarRegistro(datos: {
    Usuario: string;
    NombreCompleto: string;
    CorreoInstitucional: string;
    NuevaContrasena: string;
    Profesion?: string;
  }): Observable<any> {
    // Si en FastAPI lo dejaste con @router.put, usa this.http.put; si le pusiste @router.post, usa this.http.post
    return this.http.put(this.urlCompletar, datos);
  }

  /**
   * 3. Función que toma el JSON guardado y lo envía al endpoint del panel
   */

obtenerDatosPanel(datosSesion?: SesionUsuario | null): Observable<any> {
  const sesionRecuperada = datosSesion || this.sesionActual || JSON.parse(localStorage.getItem('sesion_activa') || '{}');
  return this.http.post<any>(this.urlPanel, sesionRecuperada);
}



  /**
   * 4. Limpiar sesión (Cerrar sesión)
   */
  cerrarSesion(): void {
    this.sesionActual = null;
    localStorage.removeItem('sesion_activa');
  }
}