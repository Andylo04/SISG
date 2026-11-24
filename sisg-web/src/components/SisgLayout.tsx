
import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useRouterState,
  useNavigate,
} from '@tanstack/react-router';

import {
  obtenerUsuario,
  obtenerToken,
  logout,
  type Usuario,
} from '../lib/auth.js';

type Rol = 'ADMINISTRADOR' | 'MEDICO' | 'HOSPITAL';

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  roles: Rol[];
}

const TODOS: Rol[] = ['ADMINISTRADOR', 'MEDICO', 'HOSPITAL'];

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: '▦',
    roles: TODOS,
  },
  {
    label: 'Médicos',
    href: '/medicos',
    icon: '⚕',
    roles: TODOS,
  },
  {
    label: 'Hospitales',
    href: '/hospitales',
    icon: '✚',
    roles: ['ADMINISTRADOR'],
  },
  {
    label: 'Pacientes',
    href: '/pacientes',
    icon: '♙',
    roles: TODOS,
  },
  {
    label: 'Citas médicas',
    href: '/citas',
    icon: '▣',
    roles: TODOS,
  },
  {
    label: 'Consultas',
    href: '/consultas',
    icon: '▤',
    roles: TODOS,
  },
  {
    label: 'Hospitalizaciones',
    href: '/hospitalizaciones',
    icon: '▧',
    roles: TODOS,
  },
  {
    label: 'Red de Instituciones',
    href: '/integraciones',
    icon: '⇄',
    roles: ['ADMINISTRADOR'],
  },
  {
    label: 'Auditoría',
    href: '/auditoria',
    icon: '◷',
    roles: ['ADMINISTRADOR', 'HOSPITAL'],
  },
];

const nombresRoles: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  MEDICO: 'Médico',
  HOSPITAL: 'Hospital',
};

const descripcionesRoles: Record<string, string> = {
  ADMINISTRADOR: 'Gestión del sistema',
  MEDICO: 'Acceso profesional médico',
  HOSPITAL: 'Gestión hospitalaria',
};

export default function SisgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  // ==========================================
  // RECUPERAR USUARIO AUTENTICADO
  // ==========================================

  useEffect(() => {
    const token = obtenerToken();
    const usuarioGuardado = obtenerUsuario();

    if (!token || !usuarioGuardado) {
      navigate({ to: '/login', replace: true });
      return;
    }

    setUsuario(usuarioGuardado);
    setVerificandoSesion(false);
  }, [navigate]);

  // ==========================================
  // NORMALIZAR ROL
  // ==========================================

  const rol = (usuario?.rol ?? '').toUpperCase() as Rol;

  // ==========================================
  // FILTRAR MENÚ SEGÚN EL ROL
  // ==========================================

  const menuPermitido = useMemo(() => {
    return menuItems.filter((item) =>
      item.roles.includes(rol),
    );
  }, [rol]);

  // ==========================================
  // VERIFICAR ACCESO A LA RUTA
  // ==========================================

  const rutaPermitida = menuItems.some(
    (item) =>
      item.href === pathname &&
      item.roles.includes(rol),
  );

  useEffect(() => {
    if (!usuario || verificandoSesion) return;

    if (!rutaPermitida) {
      navigate({
        to: '/',
        replace: true,
      });
    }
  }, [usuario, verificandoSesion, rutaPermitida, navigate]);

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  const cerrarSesion = () => {
    logout();
  };

  // ==========================================
  // INFORMACIÓN DEL USUARIO
  // ==========================================

  const currentPage =
    menuPermitido.find((item) => item.href === pathname)?.label ?? 'Dashboard';

  const nombreRol =
    nombresRoles[rol] ?? 'Usuario';

  const descripcionRol =
    descripcionesRoles[rol] ?? 'Usuario SISG';

  const inicial = nombreRol.charAt(0).toUpperCase();

  // ==========================================
  // VERIFICACIÓN INICIAL
  // ==========================================

  if (
    verificandoSesion ||
    !usuario ||
    !rutaPermitida
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F7F8]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" />

          <p className="text-sm text-slate-500">
            Verificando permisos de SISG...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F7F8] text-slate-800">
      <div className="flex min-h-screen">

        {/* ================================== */}
        {/* MENÚ LATERAL */}
        {/* ================================== */}

        <aside className="hidden w-64 shrink-0 flex-col bg-[#12343B] text-white lg:flex">

          {/* LOGO SISG */}

          <div className="flex h-32 items-center justify-center border-b border-white/10 px-5">
            <Link
              to="/"
              className="flex w-full items-center justify-center"
            >
              <img
                src="/images/sisg-logo.png"
                alt="SISG - Sistema de Información de Salud de Guatemala"
                className="max-h-28 w-full object-contain"
              />
            </Link>
          </div>

          {/* NAVEGACIÓN FILTRADA */}

          <nav className="flex-1 px-5 pt-8">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[2px] text-slate-400">
              Menú principal
            </p>

            <div className="space-y-1">
              {menuPermitido.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? 'bg-teal-500 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="w-5 text-center text-lg">
                      {item.icon}
                    </span>

                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* INFORMACIÓN DEL SISTEMA */}

          <div className="border-t border-white/10 p-5">
            <div className="rounded-xl bg-white/5 p-4">
              <p className="text-xs font-semibold text-teal-200">
                SISG Guatemala
              </p>

              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                Sistema de información y gestión de servicios de salud.
              </p>
            </div>

            <p className="mt-5 text-center text-[10px] text-slate-500">
              SISG · Versión 1.0
            </p>
          </div>
        </aside>

        {/* ================================== */}
        {/* CONTENIDO PRINCIPAL */}
        {/* ================================== */}

        <main className="min-w-0 flex-1">

          {/* ENCABEZADO */}

          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
            <div>
              <p className="text-xs text-slate-400">
                SISG / {nombreRol}
              </p>

              <h2 className="text-lg font-bold text-[#12343B]">
                {currentPage}
              </h2>
            </div>

            {/* USUARIO AUTENTICADO */}

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-700">
                  {nombreRol}
                </p>

                <p className="text-xs text-slate-400">
                  {usuario.email}
                </p>

                <p className="text-[11px] text-teal-700">
                  {descripcionRol}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800">
                {inicial}
              </div>

              {/* CERRAR SESIÓN */}

              <button
                type="button"
                onClick={cerrarSesion}
                title="Cerrar sesión"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                Salir
              </button>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
