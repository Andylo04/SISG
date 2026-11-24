
const API_URL = 'http://localhost:3000';

export interface Usuario {
  usuario_id: number;
  email: string;
  rol: 'ADMINISTRADOR' | 'MEDICO' | 'HOSPITAL';
  medico_id: number | null;
  hospital_id: number | null;
  debe_cambiar_password: boolean;
}

interface LoginResponse {
  mensaje: string;
  access_token: string;
  usuario: Usuario;
}

// INICIAR SESIÓN
export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const respuesta = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.message || 'No fue posible iniciar sesión');
  }

  localStorage.setItem('access_token', datos.access_token);
  localStorage.setItem('usuario', JSON.stringify(datos.usuario));

  return datos;
}

// OBTENER TOKEN
export function obtenerToken(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem('access_token');
}

// OBTENER USUARIO
export function obtenerUsuario(): Usuario | null {
  if (typeof window === 'undefined') return null;

  const usuario = localStorage.getItem('usuario');

  if (!usuario) return null;

  try {
    return JSON.parse(usuario) as Usuario;
  } catch {
    return null;
  }
}

// CERRAR SESIÓN
export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('usuario');

  window.location.href = '/login';
}

// PETICIONES AUTENTICADAS
export async function fetchAutenticado(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = obtenerToken();

  if (!token) {
    throw new Error('No existe una sesión activa. Inicia sesión nuevamente.');
  }

  const headers = new Headers(options.headers);

  headers.set('Authorization', `Bearer ${token}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}
