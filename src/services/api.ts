// Servicio de API para el frontend
// En desarrollo local, usar ruta relativa para aprovechar el proxy de React
// En producción (build), usar la IP del servidor de producción
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_API_BASE_URL || 'http://10.12.46.229:8000/api/v1')
  : (process.env.REACT_APP_API_BASE_URL || '/api/v1');

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    username: string;
    email?: string;
    first_name: string;
    last_name: string;
    role: string;
    is_admin: boolean;
    is_evaluador: boolean;
  };
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface AreaSupervisor {
  id: number;
  full_name: string;
  role: string;
  role_display: string;
}

export interface Area {
  id: number;
  name: string;
  grupos: Grupo[];
  posiciones: Posicion[];
  supervisores?: AreaSupervisor[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Grupo {
  id: number;
  name: string;
  area: number;
  posiciones: Posicion[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Posicion {
  id: number;
  name: string;
  area: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NivelPosicion {
  id: number;
  posicion: number;
  posicion_name: string;
  area_name: string;
  nivel: number;
  nivel_display: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NivelPosicionCreate {
  posicion: number;
  nivel: number;
  is_active?: boolean;
}

export interface NivelPosicionUpdate {
  nivel: number;
  is_active: boolean;
}

export interface NivelesPosicionListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NivelPosicion[];
}


export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  role_display: string;
  areas: number[];
  areas_list: string[];
  posicion: number | null;
  grupo: number | null;
  numero_empleado: string | null;
  fecha_ingreso: string | null;
  signature: string | null;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface UserCreate {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
  role: string;
  areas: number[];
  posicion: number | null;
  grupo: number | null;
  numero_empleado: string | null;
  fecha_ingreso: string | null;
  is_active: boolean;
}

export interface UserUpdate {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  areas: number[];
  posicion: number | null;
  grupo: number | null;
  numero_empleado: string | null;
  fecha_ingreso: string | null;
  is_active: boolean;
}

export interface ChangePassword {
  new_password: string;
  new_password_confirm: string;
}

export interface ListaAsistencia {
  id: number;
  nombre: string;
  supervisor: number | null;
  supervisor_name?: string;
  instructor: number | null;
  instructor_name?: string;
  fecha: string;
  usuarios_regulares: number[];
  usuarios_regulares_list?: string[];
  usuarios_count?: number;
  area: number;
  area_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListaAsistenciaCreate {
  nombre: string;
  supervisor: number | null;
  instructor: number | null;
  fecha: string;
  usuarios_regulares: number[];
  area: number;
  is_active?: boolean;
}

export interface ListaAsistenciaUpdate {
  nombre: string;
  supervisor: number | null;
  instructor: number | null;
  fecha: string;
  usuarios_regulares: number[];
  is_active?: boolean;
}

export interface ListasAsistenciaListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ListaAsistencia[];
}

export interface GrupoCreate {
  name: string;
  area: number;
  is_active?: boolean;
}

export interface GrupoUpdate {
  name: string;
  is_active?: boolean;
}

export interface PosicionCreate {
  name: string;
  area: number;
  is_active?: boolean;
}

export interface PosicionUpdate {
  name: string;
  is_active?: boolean;
}

export interface PosicionNested {
  id?: number;
  name: string;
  is_active?: boolean;
}

export interface GrupoNested {
  name: string;
  is_active?: boolean;
}

export interface AreaCreateWithGroups {
  name: string;
  grupos?: GrupoNested[];
  posiciones?: PosicionNested[];
  supervisores?: number[];
  is_active?: boolean;
}

export interface AreaUpdateWithGroups {
  name: string;
  grupos?: GrupoNested[];
  posiciones?: PosicionNested[];
  supervisores?: number[];
  is_active?: boolean;
}

export interface UsersListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

export interface AreasListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Area[];
}

export interface GruposListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Grupo[];
}

export interface PosicionesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Posicion[];
}

export interface PuntoEvaluacion {
  id: number;
  pregunta: string;
  puntuacion: number | null;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface CriterioEvaluacion {
  id: number;
  criterio: string;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface FirmaEvaluacion {
  id: number;
  tipo_firma: string;
  tipo_firma_display: string;
  nombre: string;
  usuario: number | null;
  usuario_nombre: string;
  esta_firmado: boolean;
  fecha_firma: string | null;
  created_at: string;
  updated_at: string;
}

export interface Evaluacion {
  id: number;
  nombre: string;
  es_plantilla: boolean;
  posicion: number | null;
  posicion_name: string | null;
  nivel_posicion: number | null;
  nivel_posicion_data: NivelPosicion | null;
  plantilla: number | null;
  plantilla_nombre: string | null;
  area_name: string | null;
  supervisor: number | null;
  supervisor_name: string | null;
  nivel: number | null;
  nivel_display: string | null;
  minimo_aprobatorio: number;
  fecha_evaluacion: string | null;
  resultado: number | null;
  is_active: boolean;
  puntos_evaluacion: PuntoEvaluacion[];
  criterios_evaluacion: CriterioEvaluacion[];
  firmas: FirmaEvaluacion[];
  created_at: string;
  updated_at: string;
}

export interface EvaluacionCreate {
  nombre: string;
  es_plantilla: boolean;
  posicion?: number | null;
  nivel_posicion?: number | null;
  plantilla?: number | null;
  supervisor: number | null;
  nivel?: number | null;
  minimo_aprobatorio: number;
  fecha_evaluacion?: string | null;
  is_active?: boolean;
  puntos_evaluacion?: Array<{ pregunta: string; orden: number }>;
  criterios_evaluacion?: Array<{ criterio: string; orden: number }>;
}

export interface EvaluacionUpdate {
  nombre: string;
  posicion: number;
  supervisor: number | null;
  nivel: number;
  minimo_aprobatorio: number;
  fecha_evaluacion: string;
  is_active: boolean;
}

export interface EvaluacionesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Evaluacion[];
}

export interface PuntoEvaluacionCreate {
  pregunta: string;
  orden: number;
}

export interface PuntoEvaluacionUpdate {
  pregunta: string;
  orden: number;
}

export interface CriterioEvaluacionCreate {
  criterio: string;
  orden: number;
}

export interface CriterioEvaluacionUpdate {
  criterio: string;
  orden: number;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private getCsrfToken(): string | null {
    const name = 'csrftoken';
    let cookieValue: string | null = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {};

    // Solo establecer Content-Type si no es FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Copiar headers existentes
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });
    }

    // Agregar token CSRF para métodos que no sean GET
    const csrfToken = this.getCsrfToken();
    if (csrfToken && options.method && options.method !== 'GET') {
      headers['X-CSRFToken'] = csrfToken;
    }
    
    const config: RequestInit = {
      headers,
      credentials: 'include', // Incluir cookies de sesión
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Manejar errores de autenticación (401, 403)
      if (response.status === 401 || response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        
        // Solo redirigir si es un 401 (No autenticado) o si el error específicamente indica problemas de autenticación
        const errorMessage = (errorData.detail || errorData.message || '').toLowerCase();
        const isAuthError = errorMessage.includes('credenciales') || 
                           errorMessage.includes('autenticación') || 
                           errorMessage.includes('authentication') ||
                           errorMessage.includes('not authenticated') ||
                           errorMessage.includes('no autenticado') ||
                           errorMessage.includes('no se proveyeron') ||
                           response.status === 401;
        
        // Redirigir para errores de autenticación reales (401 o 403 con mensaje de autenticación)
        if (isAuthError && (response.status === 401 || (response.status === 403 && isAuthError))) {
          // Limpiar localStorage
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          
          // Redirigir al login solo si no estamos ya en la página de login
          if (!window.location.pathname.includes('login') && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/csrf')) {
            // Usar setTimeout para evitar redirecciones múltiples
            setTimeout(() => {
              window.location.href = '/';
            }, 100);
            return {} as T; // Retornar objeto vacío para evitar procesar más
          }
        }
        
        // Crear un error personalizado que preserve la estructura de Django
        const customError = new Error();
        customError.name = 'ValidationError';
        customError.message = JSON.stringify(errorData);
        
        // Agregar el objeto original como propiedad
        (customError as any).errorData = errorData;
        (customError as any).status = response.status;
        
        throw customError;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Crear un error personalizado que preserve la estructura de Django
        const customError = new Error();
        customError.name = 'ValidationError';
        customError.message = JSON.stringify(errorData); // Convertir a string para preservar el objeto
        
        // Agregar el objeto original como propiedad
        (customError as any).errorData = errorData;
        (customError as any).status = response.status;
        
        throw customError;
      }

      // Verificar si la respuesta tiene contenido antes de intentar parsear JSON
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      // Si no hay contenido o no es JSON, devolver un objeto vacío
      if (contentLength === '0' || !contentType?.includes('application/json')) {
        return {} as T;
      }

      // Intentar parsear JSON, pero manejar respuestas vacías
      try {
        const text = await response.text();
        if (!text || text.trim() === '') {
          return {} as T;
        }
        return JSON.parse(text);
      } catch (jsonError) {
        // Si falla el parsing, devolver objeto vacío
        return {} as T;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') {
        throw error;
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error de conexión con el servidor');
    }
  }

  // Obtener token CSRF
  async getCsrf(): Promise<{ csrfToken: string }> {
    return this.request<{ csrfToken: string }>('/auth/csrf/');
  }

  // Autenticación
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Obtener token CSRF antes de hacer login
    await this.getCsrf();
    
    const response = await this.request<LoginResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // Esperar un momento para asegurar que las cookies se establezcan
    // Esto es necesario porque el navegador necesita tiempo para procesar las cookies
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verificar que las cookies se hayan establecido haciendo una petición simple
    // Esto fuerza al navegador a enviar las cookies
    try {
      await this.request<{ csrfToken: string }>('/auth/csrf/');
    } catch (error) {
      console.warn('Warning: Could not verify session after login', error);
    }
    
    return response;
  }

  // Verificar si la sesión está activa
  async checkSession(): Promise<boolean> {
    try {
      // Intentar hacer una petición simple que no requiere autenticación
      // pero que verifica que las cookies se estén enviando
      await this.request<{ csrfToken: string }>('/auth/csrf/');
      return true;
    } catch (error: any) {
      // Si obtenemos un 403 o 401, la sesión no está activa
      if (error.status === 401 || error.status === 403) {
        return false;
      }
      // Otros errores pueden ser de red, asumimos que la sesión está activa
      return true;
    }
  }

  async logout(): Promise<void> {
    return this.request<void>('/auth/logout/', {
      method: 'POST',
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string; version: string }> {
    return this.request<{ status: string; message: string; version: string }>('/health/');
  }

  // Información de la API
  async getApiInfo(): Promise<{ name: string; version: string; description: string }> {
    return this.request<{ name: string; version: string; description: string }>('/info/');
  }

  // Gestión de usuarios
  async getUsers(params?: { 
    search?: string; 
    role?: string; 
    is_active?: boolean;
    page?: number;
  }): Promise<UsersListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.role) searchParams.append('role', params.role);
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    
    const queryString = searchParams.toString();
    return this.request<UsersListResponse>(`/users/${queryString ? '?' + queryString : ''}`);
  }

  async getUser(id: number): Promise<User> {
    return this.request<User>(`/users/${id}/`);
  }

  async createUser(userData: UserCreate): Promise<User> {
    return this.request<User>('/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: number, userData: UserUpdate): Promise<User> {
    return this.request<User>(`/users/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async updateUserProfile(id: number, formData: FormData): Promise<User> {
    return this.request<User>(`/users/${id}/profile/`, {
      method: 'PATCH',
      body: formData,
    });
  }

  async deleteUser(id: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/users/${id}/`, {
      method: 'DELETE',
    });
  }

  async deactivateUser(id: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/users/${id}/deactivate/`, {
      method: 'POST',
    });
  }

  async activateUser(id: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/users/${id}/activate/`, {
      method: 'POST',
    });
  }

  async changeUserPassword(id: number, passwordData: ChangePassword): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/users/${id}/change_password/`, {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  }

  // Gestión de áreas
  async getAreas(params?: { 
    search?: string; 
    is_active?: boolean;
    page?: number;
  }): Promise<AreasListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    
    const queryString = searchParams.toString();
    return this.request<AreasListResponse>(`/users/areas/${queryString ? '?' + queryString : ''}`);
  }

  async getArea(id: number): Promise<Area> {
    return this.request<Area>(`/users/areas/${id}/`);
  }

  async createArea(areaData: AreaCreateWithGroups): Promise<Area> {
    return this.request<Area>('/users/areas/', {
      method: 'POST',
      body: JSON.stringify(areaData),
    });
  }

  async updateArea(id: number, areaData: AreaUpdateWithGroups): Promise<Area> {
    return this.request<Area>(`/users/areas/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(areaData),
    });
  }

  async deleteArea(id: number): Promise<void> {
    try {
      await this.request<void>(`/users/areas/${id}/`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      // Si el error es de JSON parsing, ignorarlo ya que la eliminación fue exitosa
      if (error.message && error.message.includes('Unexpected end of JSON input')) {
        return; // La eliminación fue exitosa, solo hubo un problema con el parsing
      }
      throw error; // Re-lanzar otros errores
    }
  }

  async deactivateArea(id: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/users/areas/${id}/deactivate/`, {
      method: 'POST',
    });
  }

  async activateArea(id: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/users/areas/${id}/activate/`, {
      method: 'POST',
    });
  }

  // Gestión de grupos
  async getGrupos(params?: { 
    search?: string; 
    area?: number;
    is_active?: boolean;
    page?: number;
  }): Promise<GruposListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.area) searchParams.append('area', params.area.toString());
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    
    const queryString = searchParams.toString();
    return this.request<GruposListResponse>(`/users/grupos/${queryString ? '?' + queryString : ''}`);
  }

  async getGrupo(id: number): Promise<Grupo> {
    return this.request<Grupo>(`/users/grupos/${id}/`);
  }

  async createGrupo(grupoData: GrupoCreate): Promise<Grupo> {
    return this.request<Grupo>('/users/grupos/', {
      method: 'POST',
      body: JSON.stringify(grupoData),
    });
  }

  async updateGrupo(id: number, grupoData: GrupoUpdate): Promise<Grupo> {
    return this.request<Grupo>(`/users/grupos/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(grupoData),
    });
  }

  async deleteGrupo(id: number): Promise<void> {
    try {
      await this.request<void>(`/users/grupos/${id}/`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      if (error.message && error.message.includes('Unexpected end of JSON input')) {
        return;
      }
      throw error;
    }
  }

  async deactivateGrupo(id: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/users/grupos/${id}/deactivate/`, {
      method: 'POST',
    });
  }

  async activateGrupo(id: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/users/grupos/${id}/activate/`, {
      method: 'POST',
    });
  }

  // Gestión de posiciones
  async getPosiciones(params?: { 
    search?: string; 
    area?: number;
    is_active?: boolean;
    page?: number;
  }): Promise<PosicionesListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.area) searchParams.append('area', params.area.toString());
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    
    const queryString = searchParams.toString();
    return this.request<PosicionesListResponse>(`/users/posiciones/${queryString ? '?' + queryString : ''}`);
  }

  async getPosicion(id: number): Promise<Posicion> {
    return this.request<Posicion>(`/users/posiciones/${id}/`);
  }

  async createPosicion(posicionData: PosicionCreate): Promise<Posicion> {
    return this.request<Posicion>('/users/posiciones/', {
      method: 'POST',
      body: JSON.stringify(posicionData),
    });
  }

  async updatePosicion(id: number, posicionData: PosicionUpdate): Promise<Posicion> {
    return this.request<Posicion>(`/users/posiciones/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(posicionData),
    });
  }

  async deletePosicion(id: number): Promise<void> {
    try {
      await this.request<void>(`/users/posiciones/${id}/`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      if (error.message && error.message.includes('Unexpected end of JSON input')) {
        return;
      }
      throw error;
    }
  }

  async deactivatePosicion(id: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/users/posiciones/${id}/deactivate/`, {
      method: 'POST',
    });
  }

  async activatePosicion(id: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/users/posiciones/${id}/activate/`, {
      method: 'POST',
    });
  }

  // Gestión de niveles de posición
  async getNivelesPosicion(params?: {
    posicion_id?: number;
    area_id?: number;
    nivel?: number;
  }): Promise<NivelesPosicionListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.posicion_id) searchParams.append('posicion_id', params.posicion_id.toString());
    if (params?.area_id) searchParams.append('area_id', params.area_id.toString());
    if (params?.nivel) searchParams.append('nivel', params.nivel.toString());
    
    const queryString = searchParams.toString();
    return this.request<NivelesPosicionListResponse>(`/users/niveles-posicion/${queryString ? '?' + queryString : ''}`);
  }

  async getNivelPosicion(id: number): Promise<NivelPosicion> {
    return this.request<NivelPosicion>(`/users/niveles-posicion/${id}/`);
  }

  async createNivelPosicion(nivelData: NivelPosicionCreate): Promise<NivelPosicion> {
    return this.request<NivelPosicion>('/users/niveles-posicion/', {
      method: 'POST',
      body: JSON.stringify(nivelData),
    });
  }

  async updateNivelPosicion(id: number, nivelData: NivelPosicionUpdate): Promise<NivelPosicion> {
    return this.request<NivelPosicion>(`/users/niveles-posicion/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(nivelData),
    });
  }

  async deleteNivelPosicion(id: number): Promise<void> {
    try {
      await this.request<void>(`/users/niveles-posicion/${id}/`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      if (error.message && error.message.includes('Unexpected end of JSON input')) {
        return;
      }
      throw error;
    }
  }

  // Gestión de listas de asistencia
  async getListasAsistencia(params?: { 
    search?: string; 
    area?: number;
    is_active?: boolean;
    page?: number;
  }): Promise<ListasAsistenciaListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.area) searchParams.append('area', params.area.toString());
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    
    const queryString = searchParams.toString();
    return this.request<ListasAsistenciaListResponse>(`/users/listas-asistencia/${queryString ? '?' + queryString : ''}`);
  }

  async getListaAsistencia(id: number): Promise<ListaAsistencia> {
    return this.request<ListaAsistencia>(`/users/listas-asistencia/${id}/`);
  }

  async createListaAsistencia(listaData: ListaAsistenciaCreate): Promise<ListaAsistencia> {
    return this.request<ListaAsistencia>('/users/listas-asistencia/', {
      method: 'POST',
      body: JSON.stringify(listaData),
    });
  }

  async updateListaAsistencia(id: number, listaData: ListaAsistenciaUpdate): Promise<ListaAsistencia> {
    return this.request<ListaAsistencia>(`/users/listas-asistencia/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(listaData),
    });
  }

  async deleteListaAsistencia(id: number): Promise<void> {
    try {
      await this.request<void>(`/users/listas-asistencia/${id}/`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      if (error.message && error.message.includes('Unexpected end of JSON input')) {
        return;
      }
      throw error;
    }
  }

  async deactivateListaAsistencia(id: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/users/listas-asistencia/${id}/deactivate/`, {
      method: 'POST',
    });
  }

  async activateListaAsistencia(id: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/users/listas-asistencia/${id}/activate/`, {
      method: 'POST',
    });
  }

  // Gestión de evaluaciones
  async getEvaluaciones(params?: {
    area_id?: number;
    posicion_id?: number;
    supervisor_id?: number;
    nivel?: number;
    nivel_posicion_id?: number;
    plantilla_id?: number;
    es_plantilla?: boolean;
    search?: string;
    page?: number;
  }): Promise<EvaluacionesListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.area_id) searchParams.append('area_id', params.area_id.toString());
    if (params?.posicion_id) searchParams.append('posicion_id', params.posicion_id.toString());
    if (params?.supervisor_id) searchParams.append('supervisor_id', params.supervisor_id.toString());
    if (params?.nivel) searchParams.append('nivel', params.nivel.toString());
    if (params?.nivel_posicion_id) searchParams.append('nivel_posicion_id', params.nivel_posicion_id.toString());
    if (params?.plantilla_id) searchParams.append('plantilla_id', params.plantilla_id.toString());
    if (params?.es_plantilla !== undefined) searchParams.append('es_plantilla', params.es_plantilla.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page.toString());
    
    const queryString = searchParams.toString();
    return this.request<EvaluacionesListResponse>(`/users/evaluaciones/${queryString ? '?' + queryString : ''}`);
  }

  async getEvaluacion(id: number): Promise<Evaluacion> {
    return this.request<Evaluacion>(`/users/evaluaciones/${id}/`);
  }

  async createEvaluacion(evaluacionData: EvaluacionCreate): Promise<Evaluacion> {
    return this.request<Evaluacion>('/users/evaluaciones/', {
      method: 'POST',
      body: JSON.stringify(evaluacionData),
    });
  }

  async updateEvaluacion(id: number, evaluacionData: EvaluacionUpdate): Promise<Evaluacion> {
    return this.request<Evaluacion>(`/users/evaluaciones/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(evaluacionData),
    });
  }

  async deleteEvaluacion(id: number): Promise<void> {
    try {
      await this.request<void>(`/users/evaluaciones/${id}/`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      if (error.message && error.message.includes('Unexpected end of JSON input')) {
        return;
      }
      throw error;
    }
  }

  // Gestión de puntos de evaluación
  async agregarPuntoEvaluacion(evaluacionId: number, puntoData: PuntoEvaluacionCreate): Promise<PuntoEvaluacion> {
    return this.request<PuntoEvaluacion>(`/users/evaluaciones/${evaluacionId}/agregar_punto/`, {
      method: 'POST',
      body: JSON.stringify(puntoData),
    });
  }

  async updatePuntoEvaluacion(id: number, puntoData: PuntoEvaluacionUpdate): Promise<PuntoEvaluacion> {
    return this.request<PuntoEvaluacion>(`/users/puntos-evaluacion/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(puntoData),
    });
  }

  async deletePuntoEvaluacion(id: number): Promise<void> {
    try {
      await this.request<void>(`/users/puntos-evaluacion/${id}/`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      if (error.message && error.message.includes('Unexpected end of JSON input')) {
        return;
      }
      throw error;
    }
  }

  // Gestión de criterios de evaluación
  async agregarCriterioEvaluacion(evaluacionId: number, criterioData: CriterioEvaluacionCreate): Promise<CriterioEvaluacion> {
    return this.request<CriterioEvaluacion>(`/users/evaluaciones/${evaluacionId}/agregar_criterio/`, {
      method: 'POST',
      body: JSON.stringify(criterioData),
    });
  }

  async updateCriterioEvaluacion(id: number, criterioData: CriterioEvaluacionUpdate): Promise<CriterioEvaluacion> {
    return this.request<CriterioEvaluacion>(`/users/criterios-evaluacion/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(criterioData),
    });
  }

  async deleteCriterioEvaluacion(id: number): Promise<void> {
    try {
      await this.request<void>(`/users/criterios-evaluacion/${id}/`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      if (error.message && error.message.includes('Unexpected end of JSON input')) {
        return;
      }
      throw error;
    }
  }
}

export const apiService = new ApiService();

// Función helper para obtener URLs de media
export function getMediaUrl(path: string | null): string {
  if (!path) return '';
  // Si la ruta ya es una URL completa, retornarla tal cual
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // En desarrollo con proxy, usar ruta relativa
  // En producción (build), usar URL completa del servidor de producción
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? (process.env.REACT_APP_BACKEND_URL || 'http://10.12.46.229:8000')
    : (process.env.REACT_APP_BACKEND_URL || '');
  
  // Si comienza con /media/, usar la ruta directamente
  if (path.startsWith('/media/')) {
    return `${baseUrl}${path}`;
  }
  // Si no, asumir que es una ruta relativa y agregar /media/
  return `${baseUrl}/media/${path}`;
}
