
import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { fetchAutenticado, obtenerUsuario } from '../lib/auth.js';

export const Route = createFileRoute('/pacientes')({
  component: PacientesPage,
});

interface Municipio {
  municipioId: number;
  nombre: string;
}

interface Paciente {
  pacienteId: number;
  sexo: string | null;
  fechaNacimiento: string | null;
  municipioId: number | null;
  fechaRegistro: string | null;
  municipio?: Municipio | null;
}

const formularioInicial = {
  dpi: '',
  sexo: '',
  fechaNacimiento: '',
  municipioId: '',
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100';

function fechaLocalActual() {
  const fecha = new Date();
  const diferencia = fecha.getTimezoneOffset() * 60000;

  return new Date(fecha.getTime() - diferencia)
    .toISOString()
    .slice(0, 10);
}

function PacientesPage() {
  const usuario = obtenerUsuario();
  const esAdministrador = usuario?.rol === 'ADMINISTRADOR';

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [pagina, setPagina] = useState(1);
  const porPagina = 8;

  // CARGAR PACIENTES Y MUNICIPIOS
  async function cargarDatos() {
    try {
      setCargando(true);
      setError('');

      const [respuestaPacientes, respuestaMunicipios] =
        await Promise.all([
          fetchAutenticado('/pacientes'),
          fetchAutenticado('/municipios'),
        ]);

      if (!respuestaPacientes.ok) {
        const detalle = await respuestaPacientes.text();

        throw new Error(
          `Error al consultar pacientes (${respuestaPacientes.status}): ${detalle}`,
        );
      }

      if (!respuestaMunicipios.ok) {
        const detalle = await respuestaMunicipios.text();

        throw new Error(
          `Error al consultar municipios (${respuestaMunicipios.status}): ${detalle}`,
        );
      }

      const datosPacientes: Paciente[] =
        await respuestaPacientes.json();

      const datosMunicipios: Municipio[] =
        await respuestaMunicipios.json();

      setPacientes(datosPacientes);
      setMunicipios(datosMunicipios);
      setPagina(1);
    } catch (err) {
      console.error('Error cargando pacientes:', err);

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
    cargarDatos();
  }, []);

  // INDICADORES
  const totalPacientes = pacientes.length;

  const pacientesMasculinos = pacientes.filter(
    (paciente) => paciente.sexo === 'M',
  ).length;

  const pacientesFemeninos = pacientes.filter(
    (paciente) => paciente.sexo === 'F',
  ).length;

  // BÚSQUEDA
  const pacientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return pacientes;

    return pacientes.filter((paciente) => {
      const municipio = paciente.municipio?.nombre || '';

      return (
        String(paciente.pacienteId).includes(texto) ||
        municipio.toLowerCase().includes(texto) ||
        (paciente.sexo || '').toLowerCase().includes(texto) ||
        (paciente.sexo === 'M' && 'masculino'.includes(texto)) ||
        (paciente.sexo === 'F' && 'femenino'.includes(texto))
      );
    });
  }, [pacientes, busqueda]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(pacientesFiltrados.length / porPagina),
  );

  const pacientesPagina = pacientesFiltrados.slice(
    (pagina - 1) * porPagina,
    pagina * porPagina,
  );

  // CAMBIAR CAMPOS
  function cambiarCampo(
    campo: keyof typeof formularioInicial,
    valor: string,
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  // LIMPIAR FORMULARIO
  function limpiarFormulario() {
    setFormulario(formularioInicial);
    setEditandoId(null);
    setError('');
  }

  // REGISTRAR O ACTUALIZAR PACIENTE
  async function guardarPaciente(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!esAdministrador) {
      setError('No tienes permisos para modificar pacientes.');
      return;
    }

    setError('');
    setMensaje('');

    if (!editandoId && !/^\d{13}$/.test(formulario.dpi)) {
      setError('El DPI debe contener exactamente 13 dígitos.');
      return;
    }

    if (!formulario.sexo) {
      setError('Selecciona el sexo del paciente.');
      return;
    }

    if (
      formulario.fechaNacimiento &&
      formulario.fechaNacimiento > fechaLocalActual()
    ) {
      setError('La fecha de nacimiento no puede ser futura.');
      return;
    }

    try {
      setGuardando(true);

      const endpoint = editandoId
        ? `/pacientes/${editandoId}`
        : '/pacientes';

      const metodo = editandoId ? 'PATCH' : 'POST';

      const datos = editandoId
        ? {
            sexo: formulario.sexo,
            fechaNacimiento: formulario.fechaNacimiento || null,
            municipioId: formulario.municipioId
              ? Number(formulario.municipioId)
              : null,
          }
        : {
            dpi: formulario.dpi,
            sexo: formulario.sexo,
            fechaNacimiento:
              formulario.fechaNacimiento || undefined,
            municipioId: formulario.municipioId
              ? Number(formulario.municipioId)
              : undefined,
          };

      const respuesta = await fetchAutenticado(endpoint, {
        method: metodo,
        body: JSON.stringify(datos),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.message || 'No fue posible guardar el paciente.',
        );
      }

      setMensaje(
        editandoId
          ? 'Paciente actualizado correctamente.'
          : 'Paciente registrado correctamente.',
      );

      limpiarFormulario();
      setPagina(1);

      await cargarDatos();
    } catch (err) {
      console.error('Error guardando paciente:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar.',
      );
    } finally {
      setGuardando(false);
    }
  }

  // EDITAR PACIENTE
  function editarPaciente(paciente: Paciente) {
    if (!esAdministrador) return;

    setEditandoId(paciente.pacienteId);

    setFormulario({
      dpi: '',
      sexo: paciente.sexo || '',
      fechaNacimiento:
        paciente.fechaNacimiento?.slice(0, 10) || '',
      municipioId: paciente.municipioId
        ? String(paciente.municipioId)
        : '',
    });

    setMensaje('');
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  return (
    <div className="mx-auto max-w-[1600px] p-5 sm:p-8">

      {/* ENCABEZADO */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs text-slate-400">
            SISG / Pacientes
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#12343B]">
            Gestión de pacientes
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Consulta, registra y administra la información de los pacientes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="w-fit rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
            {pacientes.length} pacientes registrados
          </span>

          <button
            type="button"
            onClick={cargarDatos}
            disabled={cargando}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#12343B] transition hover:bg-teal-50 disabled:opacity-50"
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* INDICADORES */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total de pacientes
          </p>

          <h2 className="mt-3 text-3xl font-bold text-[#12343B]">
            {cargando ? '...' : totalPacientes}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Registros en el sistema
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Pacientes masculinos
          </p>

          <h2 className="mt-3 text-3xl font-bold text-blue-600">
            {cargando ? '...' : pacientesMasculinos}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Según los datos registrados
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Pacientes femeninos
          </p>

          <h2 className="mt-3 text-3xl font-bold text-pink-600">
            {cargando ? '...' : pacientesFemeninos}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Según los datos registrados
          </p>
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

      {/* FORMULARIO: SOLO ADMINISTRADOR */}
      {esAdministrador && (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-[#12343B]">
                {editandoId ? 'Editar paciente' : 'Registrar paciente'}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {editandoId
                  ? 'Actualiza la información del paciente.'
                  : 'Completa los datos para registrar un nuevo paciente.'}
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

          <form onSubmit={guardarPaciente}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

              {/* DPI */}
              {!editandoId && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#12343B]">
                    DPI *
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    pattern="[0-9]{13}"
                    value={formulario.dpi}
                    onChange={(e) =>
                      cambiarCampo(
                        'dpi',
                        e.target.value.replace(/\D/g, '').slice(0, 13),
                      )
                    }
                    placeholder="Ingrese los 13 dígitos"
                    required
                    className={inputClass}
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Se almacenará como hash, no como DPI original.
                  </p>
                </div>
              )}

              {/* SEXO */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#12343B]">
                  Sexo *
                </label>

                <select
                  value={formulario.sexo}
                  onChange={(e) =>
                    cambiarCampo('sexo', e.target.value)
                  }
                  required
                  className={inputClass}
                >
                  <option value="">Seleccionar sexo</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* FECHA DE NACIMIENTO */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#12343B]">
                  Fecha de nacimiento
                </label>

                <input
                  type="date"
                  value={formulario.fechaNacimiento}
                  max={fechaLocalActual()}
                  onChange={(e) =>
                    cambiarCampo('fechaNacimiento', e.target.value)
                  }
                  className={inputClass}
                />
              </div>

              {/* MUNICIPIO */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#12343B]">
                  Municipio
                </label>

                <select
                  value={formulario.municipioId}
                  onChange={(e) =>
                    cambiarCampo('municipioId', e.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Seleccionar municipio</option>

                  {municipios.map((municipio) => (
                    <option
                      key={municipio.municipioId}
                      value={municipio.municipioId}
                    >
                      {municipio.nombre}
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
                className="rounded-xl bg-[#176B69] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#125653] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando
                  ? 'Guardando...'
                  : editandoId
                    ? 'Guardar cambios'
                    : 'Registrar paciente'}
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

      {/* DIRECTORIO DE PACIENTES */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#12343B]">
            Directorio de pacientes
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Información de los pacientes registrados en SISG.
          </p>
        </div>

        {/* BUSCADOR */}
        <div className="mb-6">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por ID, sexo o municipio..."
            className={inputClass}
          />
        </div>

        {/* TABLA */}
        {cargando ? (
          <p className="py-10 text-center text-slate-500">
            Cargando pacientes...
          </p>
        ) : error ? (
          <p className="py-10 text-center text-red-600">
            No fue posible cargar el directorio.
          </p>
        ) : pacientesFiltrados.length === 0 ? (
          <p className="py-10 text-center text-slate-500">
            No se encontraron pacientes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">

              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="px-4 py-4">Código</th>
                  <th className="px-4 py-4">Sexo</th>
                  <th className="px-4 py-4">Nacimiento</th>
                  <th className="px-4 py-4">Municipio</th>
                  <th className="px-4 py-4">Registro</th>
                  {esAdministrador && (
                    <th className="px-4 py-4 text-center">Acciones</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {pacientesPagina.map((paciente) => (
                  <tr
                    key={paciente.pacienteId}
                    className="border-b border-slate-100 transition hover:bg-teal-50/40"
                  >
                    <td className="px-4 py-4 font-semibold text-[#12343B]">
                      #{paciente.pacienteId}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {paciente.sexo === 'M'
                        ? 'Masculino'
                        : paciente.sexo === 'F'
                          ? 'Femenino'
                          : paciente.sexo || 'No especificado'}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {paciente.fechaNacimiento
                        ? paciente.fechaNacimiento.slice(0, 10)
                        : 'No registrado'}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {paciente.municipio?.nombre || 'No asignado'}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {paciente.fechaRegistro
                        ? paciente.fechaRegistro.slice(0, 10)
                        : 'No disponible'}
                    </td>

                    {esAdministrador && (
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => editarPaciente(paciente)}
                          className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
                        >
                          Editar
                        </button>
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
            {pacientesFiltrados.length === 0
              ? 0
              : (pagina - 1) * porPagina + 1}
            {' - '}
            {Math.min(
              pagina * porPagina,
              pacientesFiltrados.length,
            )}
            {' de '}
            {pacientesFiltrados.length} pacientes.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagina === 1}
              onClick={() => setPagina((actual) => actual - 1)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Mostrando {pacientesFiltrados.length} de {pacientes.length} pacientes registrados.
        </p>
      </section>
    </div>
  );
}
