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
  private urlValoracion = 'http://127.0.0.1:8000/valoracion';

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
  
  crearValoracion(datos: any): Observable<any> {
    return this.http.post(this.urlValoracion, datos);
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

// Agrega este método dentro de la clase AuthService:
actualizarEstadoPersona(personaId: number, nuevoEstado: string, rolUsuario: string): Observable<any> {
  return this.http.patch(`http://127.0.0.1:8000/personas/${personaId}/estado`, {
    Estado: nuevoEstado,
    RolUsuario: rolUsuario
  });
}

// 1. Obtener coordenadas del navegador
  obtenerCoordenadas(): Promise<string> {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude.toFixed(6);
            const lng = pos.coords.longitude.toFixed(6);
            resolve(`${lat}, ${lng}`);
          },
          () => resolve('GPS No Autorizado')
        );
      } else {
        resolve('GPS No Soportado');
      }
    });
  }

  // 2. Registrar evento en la tabla TRAZABILIDAD_AUDITORIA
  async registrarAccionAuditoria(accion: string, tabla: string, detalleExtra?: string): Promise<void> {
    const ubicacion = await this.obtenerCoordenadas();

    // Priorizar el id_usuario numérico de la sesión para la columna int de SQL Server
    const idUsuario = this.sesionActual?.id_usuario || null;

    const payload = {
      UsuarioId: idUsuario,
      AccionRealizada: accion,
      TablaAfectada: tabla,
      UbicacionGeo: ubicacion,
      Dispositivo: detalleExtra || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Web')
    };

    this.http.post('http://127.0.0.1:8000/trazabilidad', payload).subscribe({
      next: () => console.log(`🔒 Auditoría registrada: ${accion}`),
      error: (err) => console.error('Error al registrar auditoría:', err)
    });
  }

  /**
   * 4. Limpiar sesión (Cerrar sesión)
   */
  cerrarSesion(): void {
    this.sesionActual = null;
    localStorage.removeItem('sesion_activa');
  }

  // Subir foto (desde cámara web o archivo) -> retorna la URL para guardar en BD
  subirFotoPersona(archivo: File | Blob, nombreArchivo: string = 'foto.jpg'): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', archivo, nombreArchivo);
    return this.http.post<{ url: string }>('http://127.0.0.1:8000/archivos/subir-foto', formData);
  }

  // Subir PDF o documento soporte -> retorna la URL para guardar en BD
  subirDocumentoPdf(archivo: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', archivo);
    return this.http.post<{ url: string }>('http://127.0.0.1:8000/archivos/subir-documento', formData);
  }

  actualizarDocumentoAutorizacion(personaId: number, urlPdf: string): Observable<any> {
    return this.http.patch(
      `http://127.0.0.1:8000/autorizaciones/persona/${personaId}/documento`,
      { UbicacionDocumentoFisico: urlPdf }
    );
  }
  
// Registrar documento PDF en la tabla DOCUMENTOS_PERSONAS (con trazabilidad)
  registrarDocumentoPersona(datos: {
    PersonaId: number;
    NombrePaciente: string;
    NombreArchivo: string;
    TipoDocumento?: string;
    UrlDocumento: string;
    SubidoPor?: string;
  }): Observable<any> {
    return this.http.post('http://127.0.0.1:8000/documentos', datos);
  }

  // Listar todos los documentos PDF de una persona
  obtenerDocumentosPersona(personaId: number): Observable<any> {
    return this.http.get(`http://127.0.0.1:8000/documentos/persona/${personaId}`);
  }

  descargarHojaVidaWord(personaId: number): Observable<Blob> {
    return this.http.get(`http://127.0.0.1:8000/exportar/hoja-vida/${personaId}`, {
      responseType: 'blob'
    });
  }

  descargarValoracionesWord(personaId: number): Observable<Blob> {
    return this.http.get(`http://127.0.0.1:8000/exportar/valoraciones/${personaId}`, {
      responseType: 'blob'
    });
  }

  generarIndicadorIA(personaId: number): Observable<any> {
    return this.http.post(`http://127.0.0.1:8000/indicadores/generar/${personaId}`, {});
  }
  
  listarUsuariosGestion(): Observable<any> {
    return this.http.get('http://127.0.0.1:8000/usuarios/gestion');
  }

  cambiarEstadoUsuario(usuarioId: number, estadoActivo: boolean): Observable<any> {
    return this.http.patch(`http://127.0.0.1:8000/usuarios/${usuarioId}/estado`, {
      EstadoActivo: estadoActivo,
      UsuarioResponsableId: this.sesionActual?.id_usuario || null
    });
  }


}