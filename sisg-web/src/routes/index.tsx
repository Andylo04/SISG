
import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  fetchAutenticado,
  obtenerUsuario,
  logout,
} from '../lib/auth.js';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

interface Medico {
  medicoId: number;
  nombres: string;
  apellidos: string;
  activo?: boolean | number | string;
}

interface Hospital {
  hospitalId: number;
  nombre: string;
  activo?: boolean;
}

interface HealthResponse {
  backend: {
    connected: boolean;
    message: string;
  };
  database: {
    connected: boolean;
    database: string | null;
    message: string;
  };
  timestamp: string;
}

function Dashboard() {
  const usuario = obtenerUsuario();

  const rol = usuario?.rol;

  const esAdministrador = rol === 'ADMINISTRADOR';
  const esMedico = rol === 'MEDICO';
  const esHospital = rol === 'HOSPITAL';

  const medicoId = usuario?.medico_id;
  const hospitalId = usuario?.hospital_id;

  // ==========================================
  // PERSONALIZACIÓN DEL USUARIO
  // ==========================================

  const [nombrePersonalizado, setNombrePersonalizado] = useState('');
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState('');

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  const [totalMedicos, setTotalMedicos] = useState<number | null>(null);
  const [medicosActivos, setMedicosActivos] = useState<number | null>(null);
  const [totalHospitales, setTotalHospitales] = useState<number | null>(null);
  const [totalPacientes, setTotalPacientes] = useState<number | null>(null);

  const [cargando, setCargando] = useState(true);
  const [errorEstadisticas, setErrorEstadisticas] = useState('');

  // ==========================================
  // ESTADO DEL SISTEMA
  // ==========================================

  const [backendActivo, setBackendActivo] = useState(false);
  const [baseDatosActiva, setBaseDatosActiva] = useState(false);
  const [cargandoEstado, setCargandoEstado] = useState(true);
  const [nombreBaseDatos, setNombreBaseDatos] = useState<string | null>(null);
  const [ultimaComprobacion, setUltimaComprobacion] = useState<string | null>(null);

  // ==========================================
  // MÓDULOS Y RUTAS
  // ==========================================

  const modules = [
    {
      icon: '⚕',
      title: 'Médicos',
      description: 'Registro y especialidades médicas',
      href: '/medicos',
    },
    {
      icon: '✚',
      title: 'Hospitales',
      description: 'Gestión de establecimientos de salud',
      href: '/hospitales',
    },
    {
      icon: '♙',
      title: 'Pacientes',
      description: 'Información y registros de pacientes',
      href: '/pacientes',
    },
    {
      icon: '▣',
      title: 'Citas médicas',
      description: 'Programación de atención médica',
      href: '/citas',
    },
    {
      icon: '▤',
      title: 'Consultas',
      description: 'Gestión de consultas médicas',
      href: '/consultas',
    },
    {
      icon: '▧',
      title: 'Hospitalizaciones',
      description: 'Control de ingresos hospitalarios',
      href: '/hospitalizaciones',
    },
    {
      icon: '◷',
      title: 'Auditoría',
      description: 'Seguimiento de actividades del sistema',
      href: '/auditoria',
    },
  ];

  // ==========================================
  // OBTENER NOMBRE DEL MÉDICO U HOSPITAL
  // ==========================================

  useEffect(() => {
    let activo = true;

    async function cargarPerfil() {
      setCargandoPerfil(true);
      setErrorPerfil('');

      try {
        if (esMedico && medicoId) {
          const respuesta = await fetchAutenticado(
            `/medicos/${medicoId}`,
          );

          if (!respuesta.ok) {
            throw new Error(
              'No fue posible consultar el perfil del médico.',
            );
          }

          const medico: Medico = await respuesta.json();

          if (!activo) return;

          const nombre = `${medico.nombres ?? ''} ${medico.apellidos ?? ''}`.trim();

          setNombrePersonalizado(
            nombre ? `Dr. ${nombre}` : 'Médico',
          );
        } else if (esHospital && hospitalId) {
          const respuesta = await fetchAutenticado(
            `/hospitales/${hospitalId}`,
          );

          if (!respuesta.ok) {
            throw new Error(
              'No fue posible consultar el perfil del hospital.',
            );
          }

          const hospital: Hospital = await respuesta.json();

          if (!activo) return;

          setNombrePersonalizado(
            hospital.nombre || 'Hospital',
          );
        } else if (esMedico) {
          throw new Error(
            'Tu cuenta no tiene un médico asociado.',
          );
        } else if (esHospital) {
          throw new Error(
            'Tu cuenta no tiene un hospital asociado.',
          );
        }
      } catch (error) {
        console.error('Error cargando perfil:', error);

        if (!activo) return;

        setErrorPerfil(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar tu perfil.',
        );

        setNombrePersonalizado(
          esMedico
            ? 'Médico'
            : esHospital
              ? 'Hospital'
              : '',
        );
      } finally {
        if (activo) {
          setCargandoPerfil(false);
        }
      }
    }

    cargarPerfil();

    return () => {
      activo = false;
    };
  }, [medicoId, hospitalId, esMedico, esHospital]);

  // ==========================================
  // ESTADÍSTICAS DEL ADMINISTRADOR
  // ==========================================

  useEffect(() => {
    let activo = true;

    async function obtenerEstadisticas() {
      if (!esAdministrador) {
        setCargando(false);
        return;
      }

      setCargando(true);
      setErrorEstadisticas('');

      try {
        const [
          respuestaMedicos,
          respuestaHospitales,
          respuestaPacientes,
        ] = await Promise.all([
          fetchAutenticado('/medicos'),
          fetchAutenticado('/hospitales'),
          fetchAutenticado('/pacientes'),
        ]);

        if (
          respuestaMedicos.status === 401 ||
          respuestaHospitales.status === 401 ||
          respuestaPacientes.status === 401
        ) {
          logout();
          return;
        }

        if (
          !respuestaMedicos.ok ||
          !respuestaHospitales.ok ||
          !respuestaPacientes.ok
        ) {
          throw new Error(
            'Error al consultar los módulos del sistema.',
          );
        }

        const [medicos, hospitales, pacientes] = await Promise.all([
          respuestaMedicos.json(),
          respuestaHospitales.json(),
          respuestaPacientes.json(),
        ]);

        if (!activo) return;

        if (
          !Array.isArray(medicos) ||
          !Array.isArray(hospitales) ||
          !Array.isArray(pacientes)
        ) {
          throw new Error(
            'La API no devolvió listas válidas.',
          );
        }

        setTotalMedicos(medicos.length);

        setMedicosActivos(
          medicos.filter((medico: Medico) =>
            medico.activo === true ||
            medico.activo === 1 ||
            medico.activo === '1',
          ).length,
        );

        setTotalHospitales(hospitales.length);
        setTotalPacientes(pacientes.length);

      } catch (error) {
        console.error('Error al cargar estadísticas:', error);

        if (!activo) return;

        setTotalMedicos(null);
        setMedicosActivos(null);
        setTotalHospitales(null);
        setTotalPacientes(null);

        setErrorEstadisticas(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar las estadísticas.',
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    obtenerEstadisticas();

    return () => {
      activo = false;
    };
  }, [esAdministrador]);

  // ==========================================
  // COMPROBAR BACKEND Y MYSQL
  // ==========================================

  useEffect(() => {
    let activo = true;

    async function obtenerEstadoSistema() {
      try {
        const respuesta = await fetch(
          'http://localhost:3000/health',
          {
            method: 'GET',
            cache: 'no-store',
          },
        );

        if (!respuesta.ok) {
          throw new Error(
            'No fue posible consultar el estado del backend.',
          );
        }

        const datos: HealthResponse = await respuesta.json();

        if (!activo) return;

        setBackendActivo(datos.backend?.connected === true);
        setBaseDatosActiva(datos.database?.connected === true);
        setNombreBaseDatos(datos.database?.database ?? null);
        setUltimaComprobacion(
          datos.timestamp ?? new Date().toISOString(),
        );

      } catch (error) {
        console.error('Error al comprobar SISG:', error);

        if (!activo) return;

        setBackendActivo(false);
        setBaseDatosActiva(false);
        setNombreBaseDatos(null);
        setUltimaComprobacion(new Date().toISOString());

      } finally {
        if (activo) {
          setCargandoEstado(false);
        }
      }
    }

    obtenerEstadoSistema();

    const intervalo = window.setInterval(
      obtenerEstadoSistema,
      10000,
    );

    return () => {
      activo = false;
      window.clearInterval(intervalo);
    };
  }, []);

  // ==========================================
  // INDICADORES
  // ==========================================

  const statistics = [
    {
      label: 'Médicos registrados',
      value: cargando ? '...' : totalMedicos ?? '—',
      detail: 'Profesionales registrados',
      icon: '⚕',
      color: 'bg-teal-50 text-teal-700',
    },
    {
      label: 'Médicos activos',
      value: cargando ? '...' : medicosActivos ?? '—',
      detail: 'Profesionales disponibles',
      icon: '✓',
      color: 'bg-green-50 text-green-700',
    },
    {
      label: 'Hospitales',
      value: cargando ? '...' : totalHospitales ?? '—',
      detail: 'Establecimientos de salud',
      icon: '✚',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Pacientes',
      value: cargando ? '...' : totalPacientes ?? '—',
      detail: 'Pacientes registrados',
      icon: '♙',
      color: 'bg-purple-50 text-purple-700',
    },
  ];

  // ==========================================
  // BIENVENIDA PERSONALIZADA
  // ==========================================

  const tituloBienvenida = esAdministrador
    ? '¡Bienvenido al sistema!'
    : esHospital
      ? `¡Bienvenido a ${nombrePersonalizado || 'tu hospital'}!`
      : esMedico
        ? `¡Bienvenido, ${nombrePersonalizado || 'Doctor'}!`
        : 'Bienvenido al sistema';

  const descripcionBienvenida = esAdministrador
    ? 'Administra y consulta la información de médicos, hospitales, pacientes y servicios de salud desde una sola plataforma.'
    : esHospital
      ? 'Administra la información de tu institución, consulta pacientes y coordina los servicios y citas médicas de tu hospital.'
      : 'Consulta y administra tus pacientes, revisa tu agenda médica y gestiona las citas asignadas a tu cuenta profesional.';

  const horaComprobacion = ultimaComprobacion
    ? new Date(ultimaComprobacion).toLocaleTimeString('es-GT')
    : null;

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="mx-auto max-w-[1600px] p-5 sm:p-8">

      {/* BIENVENIDA */}

      <section className="mb-8 flex flex-col justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#12343B] to-[#176B69] p-6 text-white shadow-lg sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[2px] text-teal-200">
            SISG · Guatemala
          </p>

          <h1 className="text-2xl font-bold sm:text-3xl">
            {cargandoPerfil && !esAdministrador
              ? 'Cargando bienvenida...'
              : tituloBienvenida}
          </h1>

          {!esAdministrador && !cargandoPerfil && nombrePersonalizado && (
            <p className="mt-3 text-lg font-bold text-[#8EF3D1]">
              {nombrePersonalizado}
            </p>
          )}

          <p className="mt-3 max-w-xl text-sm leading-6 text-teal-50/90">
            {descripcionBienvenida}
          </p>

          {errorPerfil && (
            <p className="mt-3 text-xs text-amber-200">
              No se pudo consultar el nombre desde el servidor. Verifica los permisos del perfil.
            </p>
          )}
        </div>

        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-4xl">
          {esHospital ? '✚' : esMedico ? '⚕' : '✚'}
        </div>
      </section>

      {/* INDICADORES DEL ADMINISTRADOR */}

      {esAdministrador && (
        <section className="mb-8">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#12343B]">
              Resumen general
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Indicadores principales del sistema de salud.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {statistics.map((stat) => (
              <article
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>

                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>

                <h3 className="mt-5 text-3xl font-bold text-[#12343B]">
                  {stat.value}
                </h3>

                <p className="mt-2 text-xs text-slate-400">
                  {stat.detail}
                </p>
              </article>
            ))}
          </div>

          {errorEstadisticas && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">
                No se pudieron cargar las estadísticas.
              </p>

              <p className="mt-1 text-xs text-red-600">
                {errorEstadisticas}
              </p>
            </div>
          )}
        </section>
      )}

      {/* MÓDULOS INTERACTIVOS */}

      {esAdministrador && (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">

          <div className="mb-6">
            <h2 className="font-bold text-[#12343B]">
              Módulos del sistema
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Selecciona un módulo para acceder directamente a sus funciones.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

            {modules.map((module) => (
              <Link
                key={module.title}
                to={module.href as any}
                className="group flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:border-teal-300 hover:bg-teal-50/60 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-2xl text-teal-700 transition group-hover:bg-[#176B69] group-hover:text-white">
                  {module.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-700 transition group-hover:text-[#176B69]">
                    {module.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    {module.description}
                  </p>
                </div>

                <div className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#176B69]">
                  →
                </div>
              </Link>
            ))}

          </div>
        </section>
      )}

      {/* INFORMACIÓN PARA MÉDICO Y HOSPITAL */}

      {(esMedico || esHospital) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold text-[#12343B]">
            {esMedico ? 'Tu espacio profesional' : 'Tu institución'}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {esMedico
              ? 'Desde el menú lateral puedes consultar tus pacientes, administrar tus citas y acceder a tus módulos profesionales.'
              : 'Desde el menú lateral puedes consultar los pacientes, médicos, citas y servicios relacionados con tu institución.'}
          </p>

          <div className="mt-5 rounded-xl bg-teal-50 p-4">
            <p className="text-xs font-semibold text-teal-800">
              {esMedico ? 'Médico autenticado' : 'Institución autenticada'}
            </p>

            <p className="mt-2 text-lg font-bold text-[#176B69]">
              {cargandoPerfil
                ? 'Consultando información...'
                : nombrePersonalizado || 'Información no disponible'}
            </p>

            <p className="mt-1 text-xs text-teal-700">
              {esMedico
                ? `Identificador médico: ${medicoId ?? 'No asignado'}`
                : `Identificador hospital: ${hospitalId ?? 'No asignado'}`}
            </p>
          </div>
        </section>
      )}

      {/* ESTADO DEL SISTEMA */}

      {esAdministrador && (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold text-[#12343B]">
            Estado del sistema
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Estado de los servicios de SISG.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-sm text-slate-600">
                Frontend
              </span>

              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                Activo
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-sm text-slate-600">
                Backend
              </span>

              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                cargandoEstado
                  ? 'bg-yellow-50 text-yellow-700'
                  : backendActivo
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
              }`}>
                {cargandoEstado
                  ? 'Comprobando...'
                  : backendActivo
                    ? 'Activo'
                    : 'Sin conexión'}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-sm text-slate-600">
                Base de datos
              </span>

              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                cargandoEstado
                  ? 'bg-yellow-50 text-yellow-700'
                  : baseDatosActiva
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
              }`}>
                {cargandoEstado
                  ? 'Comprobando...'
                  : baseDatosActiva
                    ? 'Conectada'
                    : 'Sin conexión'}
              </span>
            </div>

          </div>

          <div className="mt-5 rounded-xl bg-teal-50 p-4">
            <p className="text-xs font-semibold text-teal-800">
              Información de conexión
            </p>

            <p className="mt-2 text-xs leading-5 text-teal-700">
              {cargandoEstado
                ? 'Comprobando la conexión con SISG...'
                : backendActivo && baseDatosActiva
                  ? `Conexión exitosa con ${nombreBaseDatos ?? 'MySQL'}.`
                  : backendActivo
                    ? 'El backend está activo, pero MySQL no responde.'
                    : 'No fue posible conectar con el backend.'}
            </p>

            {horaComprobacion && (
              <p className="mt-2 text-xs text-teal-600">
                Última comprobación: {horaComprobacion}
              </p>
            )}

            <p className="mt-1 text-xs text-teal-600">
              Actualización automática cada 10 segundos.
            </p>
          </div>
        </section>
      )}

      {/* FOOTER */}

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        SISG · Sistema de Información de Salud de Guatemala

        <p className="mt-1">
          Plataforma de gestión de información sanitaria · Versión 1.0
        </p>
      </footer>

    </div>
  );
}
