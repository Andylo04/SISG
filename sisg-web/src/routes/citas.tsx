
import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import {
  fetchAutenticado,
  obtenerUsuario,
} from '../lib/auth.js';

export const Route = createFileRoute('/citas')({
  component: CitasPage,
});

interface Paciente {
  pacienteId: number;
  sexo: string | null;
}

interface Medico {
  medicoId: number;
  nombres: string;
  apellidos: string;
  activo?: boolean;
}

interface Hospital {
  hospitalId: number;
  nombre: string;
  activo: boolean;
}

interface Cita {
  citaId: number;
  pacienteId: number;
  medicoId: number;
  hospitalId: number;
  fechaHoraProgramada: string;
  estado: string | null;
  paciente?: Paciente;
  medico?: Medico;
  hospital?: Hospital;
}

const formularioInicial = {
  pacienteId: '',
  medicoId: '',
  hospitalId: '',
  fechaHoraProgramada: '',
  estado: 'Pendiente',
};

const estados = [
  'Pendiente',
  'Confirmada',
  'Atendida',
  'Cancelada',
];

function fechaActualLocal() {
  const fecha = new Date();
  const diferencia = fecha.getTimezoneOffset() * 60000;

  return new Date(fecha.getTime() - diferencia)
    .toISOString()
    .slice(0, 16);
}

function CitasPage() {
  const usuario = obtenerUsuario();

  const rol = usuario?.rol?.toUpperCase();

  const esAdministrador = rol === 'ADMINISTRADOR';
  const esHospital = rol === 'HOSPITAL';
  const esMedico = rol === 'MEDICO';

  // Los tres perfiles pueden gestionar citas.
  const puedeGestionarCitas =
    esAdministrador || esHospital || esMedico;

  // El médico siempre trabaja con su propio identificador.
  const datosUsuario = usuario as any;

  const medicoIdUsuario = Number(
    datosUsuario?.medico_id ?? datosUsuario?.medicoId,
  );

  const hospitalIdUsuario = Number(
    datosUsuario?.hospital_id ?? datosUsuario?.hospitalId,
  );

  const [citas, setCitas] = useState<Cita[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [hospitales, setHospitales] = useState<Hospital[]>([]);

  const [formulario, setFormulario] = useState(formularioInicial);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [pagina, setPagina] = useState(1);
  const porPagina = 8;

  // ==========================================
  // CARGAR INFORMACIÓN
  // ==========================================

  async function cargarDatos() {
    try {
      setCargando(true);
      setError('');

      const respuestaCitas = await fetchAutenticado('/citas');

      if (!respuestaCitas.ok) {
        throw new Error(
          `Error al cargar citas: ${await respuestaCitas.text()}`,
        );
      }

      const datosCitas: Cita[] = await respuestaCitas.json();
      setCitas(datosCitas);

      if (puedeGestionarCitas) {
        const [
          respuestaPacientes,
          respuestaMedicos,
          respuestaHospitales,
        ] = await Promise.all([
          fetchAutenticado('/pacientes'),
          fetchAutenticado('/medicos'),
          fetchAutenticado('/hospitales?estado=activo'),
        ]);

        if (!respuestaPacientes.ok) {
          throw new Error(
            `No fue posible cargar los pacientes: ${await respuestaPacientes.text()}`,
          );
        }

        if (!respuestaMedicos.ok) {
          throw new Error(
            `No fue posible cargar los médicos: ${await respuestaMedicos.text()}`,
          );
        }

        if (!respuestaHospitales.ok) {
          throw new Error(
            `No fue posible cargar los hospitales: ${await respuestaHospitales.text()}`,
          );
        }

        const [
          datosPacientes,
          datosMedicos,
          datosHospitales,
        ] = await Promise.all([
          respuestaPacientes.json(),
          respuestaMedicos.json(),
          respuestaHospitales.json(),
        ]);

        setPacientes(datosPacientes);
        setMedicos(datosMedicos);
        setHospitales(datosHospitales);

        // Completar automáticamente los campos del médico.
        if (esMedico) {
          if (!medicoIdUsuario) {
            throw new Error(
              'Tu cuenta no tiene un médico asociado. Contacta al administrador.',
            );
          }

          setFormulario((anterior) => ({
            ...anterior,
            medicoId: String(medicoIdUsuario),
          }));
        }

        // El hospital solo puede trabajar dentro de su institución.
        if (esHospital) {
          if (!hospitalIdUsuario) {
            throw new Error(
              'La cuenta del hospital no tiene una institución asociada.',
            );
          }

          setFormulario((anterior) => ({
            ...anterior,
            hospitalId: String(hospitalIdUsuario),
          }));
        }
      }
    } catch (err) {
      console.error('Error cargando citas:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible conectar con SISG API.',
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarDatos();
  }, []);

  // ==========================================
  // INDICADORES
  // ==========================================

  const totalCitas = citas.length;

  const pendientes = citas.filter(
    (cita) => cita.estado === 'Pendiente',
  ).length;

  const confirmadas = citas.filter(
    (cita) => cita.estado === 'Confirmada',
  ).length;

  const atendidas = citas.filter(
    (cita) => cita.estado === 'Atendida',
  ).length;

  const canceladas = citas.filter(
    (cita) => cita.estado === 'Cancelada',
  ).length;

  // ==========================================
  // BÚSQUEDA Y FILTROS
  // ==========================================

  const citasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return citas.filter((cita) => {
      const coincideBusqueda =
        !texto ||
        String(cita.citaId).includes(texto) ||
        String(cita.pacienteId).includes(texto) ||
        String(cita.medicoId).includes(texto) ||
        String(cita.hospitalId).includes(texto) ||
        (cita.medico?.nombres || '').toLowerCase().includes(texto) ||
        (cita.medico?.apellidos || '').toLowerCase().includes(texto) ||
        (cita.hospital?.nombre || '').toLowerCase().includes(texto);

      const coincideEstado =
        !filtroEstado || cita.estado === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [citas, busqueda, filtroEstado]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(citasFiltradas.length / porPagina),
  );

  const citasPagina = citasFiltradas.slice(
    (pagina - 1) * porPagina,
    pagina * porPagina,
  );

  // ==========================================
  // CAMBIAR FORMULARIO
  // ==========================================

  function cambiarCampo(
    campo: keyof typeof formularioInicial,
    valor: string,
  ) {
    // El médico no puede seleccionar otro médico.
    if (esMedico && campo === 'medicoId') return;

    // El hospital no puede seleccionar otra institución.
    if (esHospital && campo === 'hospitalId') return;

    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  // ==========================================
  // LIMPIAR FORMULARIO
  // ==========================================

  function limpiarFormulario() {
    setFormulario({
      ...formularioInicial,
      medicoId: esMedico ? String(medicoIdUsuario) : '',
      hospitalId: esHospital ? String(hospitalIdUsuario) : '',
    });

    setEditandoId(null);
    setError('');
  }

  // ==========================================
  // REGISTRAR O ACTUALIZAR
  // ==========================================

  async function guardarCita(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!puedeGestionarCitas) {
      setError('No tienes permisos para gestionar citas.');
      return;
    }

    setError('');
    setMensaje('');

    const pacienteId = Number(formulario.pacienteId);

    // El médico nunca puede modificar su propio medicoId.
    const medicoId = esMedico
      ? medicoIdUsuario
      : Number(formulario.medicoId);

    // El hospital trabaja exclusivamente con su hospitalId.
    const hospitalId = esHospital
      ? hospitalIdUsuario
      : Number(formulario.hospitalId);

    if (
      !Number.isInteger(pacienteId) || pacienteId <= 0 ||
      !Number.isInteger(medicoId) || medicoId <= 0 ||
      !Number.isInteger(hospitalId) || hospitalId <= 0
    ) {
      setError('Selecciona un paciente, médico y hospital válidos.');
      return;
    }

    if (!formulario.fechaHoraProgramada) {
      setError('La fecha y hora son obligatorias.');
      return;
    }

    if (
      !editandoId &&
      formulario.fechaHoraProgramada < fechaActualLocal()
    ) {
      setError('La fecha de la cita no puede estar en el pasado.');
      return;
    }

    try {
      setGuardando(true);

      const datos = {
        pacienteId,
        medicoId,
        hospitalId,
        fechaHoraProgramada: formulario.fechaHoraProgramada,
        estado: formulario.estado || 'Pendiente',
      };

      const endpoint = editandoId
        ? `/citas/${editandoId}`
        : '/citas';

      const respuesta = await fetchAutenticado(endpoint, {
        method: editandoId ? 'PATCH' : 'POST',
        body: JSON.stringify(datos),
      });

      const texto = await respuesta.text();

      let resultado: any = {};

      try {
        resultado = texto ? JSON.parse(texto) : {};
      } catch {
        resultado = { message: texto };
      }

      if (!respuesta.ok) {
        throw new Error(
          Array.isArray(resultado.message)
            ? resultado.message.join(', ')
            : resultado.message || `Error ${respuesta.status}`,
        );
      }

      setMensaje(
        editandoId
          ? 'Cita actualizada correctamente.'
          : `Cita #${resultado.citaId} registrada correctamente.`,
      );

      limpiarFormulario();
      setPagina(1);

      await cargarDatos();
    } catch (err) {
      console.error('Error guardando cita:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar.',
      );
    } finally {
      setGuardando(false);
    }
  }

  // ==========================================
  // EDITAR CITA
  // ==========================================

  function editarCita(cita: Cita) {
    if (!puedeGestionarCitas) return;

    if (cita.estado === 'Cancelada') {
      setError('No puedes editar una cita cancelada.');
      return;
    }

    // Validación adicional en el frontend.
    if (esMedico && cita.medicoId !== medicoIdUsuario) {
      setError('Solo puedes editar tus propias citas.');
      return;
    }

    if (esHospital && cita.hospitalId !== hospitalIdUsuario) {
      setError('Solo puedes editar citas de tu hospital.');
      return;
    }

    setEditandoId(cita.citaId);

    const fecha = new Date(cita.fechaHoraProgramada);
    const diferencia = fecha.getTimezoneOffset() * 60000;

    const fechaLocal = new Date(fecha.getTime() - diferencia)
      .toISOString()
      .slice(0, 16);

    setFormulario({
      pacienteId: String(cita.pacienteId),
      medicoId: String(cita.medicoId),
      hospitalId: String(cita.hospitalId),
      fechaHoraProgramada: fechaLocal,
      estado: cita.estado || 'Pendiente',
    });

    setMensaje('');
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  // ==========================================
  // CANCELAR CITA
  // ==========================================

  async function cancelarCita(id: number) {
    if (!puedeGestionarCitas) return;

    const cita = citas.find((item) => item.citaId === id);

    if (!cita) return;

    if (esMedico && cita.medicoId !== medicoIdUsuario) {
      setError('Solo puedes cancelar tus propias citas.');
      return;
    }

    if (esHospital && cita.hospitalId !== hospitalIdUsuario) {
      setError('Solo puedes cancelar citas de tu hospital.');
      return;
    }

    const confirmar = window.confirm(
      '¿Estás seguro de que deseas cancelar esta cita?',
    );

    if (!confirmar) return;

    try {
      setError('');
      setMensaje('');

      const respuesta = await fetchAutenticado(
        `/citas/${id}/cancelar`,
        { method: 'PUT' },
      );

      const texto = await respuesta.text();

      let resultado: any = {};

      try {
        resultado = texto ? JSON.parse(texto) : {};
      } catch {
        resultado = { message: texto };
      }

      if (!respuesta.ok) {
        throw new Error(
          resultado.message || 'No fue posible cancelar la cita.',
        );
      }

      setMensaje('Cita cancelada correctamente.');
      await cargarDatos();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al cancelar.',
      );
    }
  }

  // ==========================================
  // ESTADO VISUAL
  // ==========================================

  function colorEstado(estado: string | null) {
    switch (estado) {
      case 'Confirmada':
        return 'bg-blue-50 text-blue-700';
      case 'Atendida':
        return 'bg-green-50 text-green-700';
      case 'Cancelada':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-amber-50 text-amber-700';
    }
  }

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="mx-auto max-w-[1600px] p-5 sm:p-8">

      {/* ENCABEZADO */}

      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs text-slate-400">
            SISG / Gestión de citas
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#12343B]">
            Gestión de citas
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Programa, consulta y administra las citas médicas.
          </p>

          {esMedico && (
            <p className="mt-2 text-sm font-semibold text-teal-700">
              Gestiona las citas asignadas a tu cuenta médica.
            </p>
          )}

          {esHospital && (
            <p className="mt-2 text-sm font-semibold text-teal-700">
              Gestiona las citas de tu institución.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="w-fit rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
            {citas.length} citas registradas
          </span>

          <button
            type="button"
            onClick={() => void cargarDatos()}
            disabled={cargando}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#12343B] transition hover:bg-teal-50 disabled:opacity-50"
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* INDICADORES */}

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total de citas</p>
          <h2 className="mt-3 text-3xl font-bold text-[#12343B]">
            {cargando ? '...' : totalCitas}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pendientes</p>
          <h2 className="mt-3 text-3xl font-bold text-amber-600">
            {cargando ? '...' : pendientes}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Confirmadas</p>
          <h2 className="mt-3 text-3xl font-bold text-blue-600">
            {cargando ? '...' : confirmadas}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Atendidas</p>
          <h2 className="mt-3 text-3xl font-bold text-green-600">
            {cargando ? '...' : atendidas}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Canceladas</p>
          <h2 className="mt-3 text-3xl font-bold text-red-500">
            {cargando ? '...' : canceladas}
          </h2>
        </div>
      </div>

      {/* MENSAJES */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      {/* FORMULARIO */}

      {puedeGestionarCitas && (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-[#12343B]">
                {editandoId ? 'Editar cita' : 'Programar nueva cita'}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {esMedico
                  ? 'Registra una cita para uno de tus pacientes.'
                  : 'Selecciona cuidadosamente al médico y hospital.'}
              </p>
            </div>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="w-fit rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar edición
              </button>
            )}
          </div>

          <form onSubmit={guardarCita}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

              {/* PACIENTE */}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#12343B]">
                  Paciente *
                </label>

                <select
                  value={formulario.pacienteId}
                  onChange={(e) =>
                    cambiarCampo('pacienteId', e.target.value)
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-500 focus:bg-white"
                >
                  <option value="">Seleccionar paciente</option>

                  {pacientes.map((paciente) => (
                    <option
                      key={paciente.pacienteId}
                      value={paciente.pacienteId}
                    >
                      Paciente #{paciente.pacienteId}
                    </option>
                  ))}
                </select>
              </div>

              {/* MÉDICO */}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#12343B]">
                  Médico *
                </label>

                {esMedico ? (
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
                    Médico asignado a tu cuenta · ID #{medicoIdUsuario}
                  </div>
                ) : (
                  <select
                    value={formulario.medicoId}
                    onChange={(e) =>
                      cambiarCampo('medicoId', e.target.value)
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-500 focus:bg-white"
                  >
                    <option value="">Seleccionar médico</option>

                    {medicos
                      .filter((medico) => medico.activo !== false)
                      .map((medico) => (
                        <option
                          key={medico.medicoId}
                          value={medico.medicoId}
                        >
                          ID #{medico.medicoId} - Dr. {medico.nombres} {medico.apellidos}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* HOSPITAL */}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#12343B]">
                  Hospital *
                </label>

                {esHospital ? (
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600">
                    {hospitales.find(
                      (h) => h.hospitalId === hospitalIdUsuario,
                    )?.nombre ?? `Hospital #${hospitalIdUsuario}`}
                  </div>
                ) : (
                  <select
                    value={formulario.hospitalId}
                    onChange={(e) =>
                      cambiarCampo('hospitalId', e.target.value)
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-500 focus:bg-white"
                  >
                    <option value="">Seleccionar hospital</option>

                    {hospitales
                      .filter((hospital) => hospital.activo !== false)
                      .map((hospital) => (
                        <option
                          key={hospital.hospitalId}
                          value={hospital.hospitalId}
                        >
                          {hospital.nombre}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* FECHA */}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#12343B]">
                  Fecha y hora *
                </label>

                <input
                  type="datetime-local"
                  value={formulario.fechaHoraProgramada}
                  onChange={(e) =>
                    cambiarCampo('fechaHoraProgramada', e.target.value)
                  }
                  required
                  min={editandoId ? undefined : fechaActualLocal()}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              {/* ESTADO */}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#12343B]">
                  Estado de la cita
                </label>

                <select
                  value={formulario.estado}
                  onChange={(e) =>
                    cambiarCampo('estado', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-500 focus:bg-white"
                >
                  {estados
                    .filter((estado) => estado !== 'Cancelada')
                    .map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* BOTONES */}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-xl bg-[#176B69] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#125653] disabled:opacity-50"
              >
                {guardando
                  ? 'Guardando...'
                  : editandoId
                    ? 'Guardar cambios'
                    : 'Programar cita'}
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* DIRECTORIO */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#12343B]">
            Directorio de citas
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Consulta las citas médicas registradas en el sistema.
          </p>
        </div>

        {/* BUSCADOR */}

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <input
              type="search"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar por ID, paciente, médico u hospital..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setPagina(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-500"
            >
              <option value="">Todos los estados</option>

              {estados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TABLA */}

        {cargando ? (
          <p className="py-10 text-center text-slate-500">
            Cargando citas...
          </p>
        ) : citasFiltradas.length === 0 ? (
          <p className="py-10 text-center text-slate-500">
            No se encontraron citas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="px-4 py-4">Código</th>
                  <th className="px-4 py-4">Paciente</th>
                  <th className="px-4 py-4">Médico</th>
                  <th className="px-4 py-4">Hospital</th>
                  <th className="px-4 py-4">Fecha y hora</th>
                  <th className="px-4 py-4">Estado</th>
                  {puedeGestionarCitas && (
                    <th className="px-4 py-4 text-center">Acciones</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {citasPagina.map((cita) => (
                  <tr
                    key={cita.citaId}
                    className="border-b border-slate-100 transition hover:bg-teal-50/40"
                  >
                    <td className="px-4 py-4 font-semibold text-[#12343B]">
                      #{cita.citaId}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      Paciente #{cita.pacienteId}
                    </td>

                    <td className="px-4 py-4 font-medium text-[#12343B]">
                      {cita.medico
                        ? `Dr. ${cita.medico.nombres} ${cita.medico.apellidos}`
                        : `Médico #${cita.medicoId}`}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {cita.hospital?.nombre ||
                        `Hospital #${cita.hospitalId}`}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {new Date(cita.fechaHoraProgramada).toLocaleString(
                        'es-GT',
                        {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        },
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${colorEstado(cita.estado)}`}
                      >
                        {cita.estado || 'Pendiente'}
                      </span>
                    </td>

                    {puedeGestionarCitas && (
                      <td className="px-4 py-4">
                        <div className="flex justify-center gap-2">
                          {cita.estado !== 'Cancelada' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => editarCita(cita)}
                                className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => void cancelarCita(cita.citaId)}
                                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Sin acciones
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINACIÓN */}

        <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
          <p className="text-xs text-slate-400">
            Mostrando{' '}
            {citasFiltradas.length === 0
              ? 0
              : (pagina - 1) * porPagina + 1}
            {' - '}
            {Math.min(
              pagina * porPagina,
              citasFiltradas.length,
            )}
            {' de '}
            {citasFiltradas.length} citas.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagina === 1}
              onClick={() => setPagina((actual) => actual - 1)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-teal-50 disabled:opacity-40"
            >
              Anterior
            </button>

            <span className="px-3 text-sm font-medium text-[#12343B]">
              {pagina} / {totalPaginas}
            </span>

            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((actual) => actual + 1)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-teal-50 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Mostrando {citasFiltradas.length} de {citas.length} citas registradas.
        </p>
      </section>
    </div>
  );
}
