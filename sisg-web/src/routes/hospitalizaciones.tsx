
import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  fetchAutenticado,
  obtenerUsuario,
} from '../lib/auth.js';

type Paciente = {
  pacienteId: number;
  sexo?: string | null;
  fechaNacimiento?: string | null;
};

type Medico = {
  medicoId: number;
  nombres: string;
  apellidos: string;
  activo: boolean | number;
};

type Hospital = {
  hospitalId: number;
  nombre: string;
  activo: boolean | number;
};

type Hospitalizacion = {
  hospitalizacionId: number;
  pacienteId: number;
  medicoId: number;
  hospitalId: number;
  cie10Ingreso: string | null;
  fechaIngreso: string;
  fechaEgreso: string | null;
  tipoEgreso: string | null;
  montoFacturado: string | number | null;
  codigoAseguradora: string | null;
  paciente: Paciente | null;
  medico: Medico | null;
  hospital: Hospital | null;
};

const formularioInicial = {
  pacienteId: '',
  medicoId: '',
  hospitalId: '',
  cie10Ingreso: '',
  fechaIngreso: '',
  montoFacturado: '',
  codigoAseguradora: '',
};

function esActivo(valor: boolean | number | undefined) {
  return valor === true || valor === 1;
}

function fechaActualLocal() {
  const fecha = new Date();
  const diferencia = fecha.getTimezoneOffset() * 60000;

  return new Date(fecha.getTime() - diferencia)
    .toISOString()
    .slice(0, 16);
}

async function leerRespuesta(response: Response) {
  const texto = await response.text();

  let data: any = {};

  try {
    data = texto ? JSON.parse(texto) : {};
  } catch {
    data = { message: texto };
  }

  if (!response.ok) {
    const mensaje = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || `Error HTTP ${response.status}`;

    throw new Error(mensaje);
  }

  return data;
}

function Hospitalizaciones() {
  const usuario = obtenerUsuario();

  const esHospital = usuario?.rol === 'HOSPITAL';

  const puedeGestionar =
    usuario?.rol === 'ADMINISTRADOR' || esHospital;

  const [hospitalizaciones, setHospitalizaciones] =
    useState<Hospitalizacion[]>([]);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [hospitales, setHospitales] = useState<Hospital[]>([]);

  const [formulario, setFormulario] =
    useState(formularioInicial);

  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');

  const [editando, setEditando] = useState<number | null>(null);

  const [egresoId, setEgresoId] = useState<number | null>(null);
  const [fechaEgreso, setFechaEgreso] = useState('');
  const [tipoEgreso, setTipoEgreso] = useState('Alta médica');
  const [montoEgreso, setMontoEgreso] = useState('');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [catalogosCargados, setCatalogosCargados] =
    useState(false);

  // ==========================================
  // CARGAR CATÁLOGOS
  // ==========================================

  async function cargarCatalogos() {
    const [
      pacientesResponse,
      medicosResponse,
      hospitalesResponse,
    ] = await Promise.all([
      fetchAutenticado('/pacientes'),
      fetchAutenticado('/medicos'),
      fetchAutenticado('/hospitales?estado=activo'),
    ]);

    const [
      pacientesData,
      medicosData,
      hospitalesData,
    ] = await Promise.all([
      leerRespuesta(pacientesResponse),
      leerRespuesta(medicosResponse),
      leerRespuesta(hospitalesResponse),
    ]);

    const listaPacientes = Array.isArray(pacientesData)
      ? pacientesData
      : [];

    const listaMedicos = Array.isArray(medicosData)
      ? medicosData
      : [];

    const listaHospitales = Array.isArray(hospitalesData)
      ? hospitalesData
      : [];

    setPacientes(listaPacientes);
    setMedicos(listaMedicos);

    const hospitalesPermitidos = esHospital
      ? listaHospitales.filter(
          (hospital: Hospital) =>
            Number(hospital.hospitalId) ===
            Number(usuario?.hospital_id),
        )
      : listaHospitales;

    setHospitales(hospitalesPermitidos);

    if (esHospital && usuario?.hospital_id) {
      setFormulario((actual) => ({
        ...actual,
        hospitalId: String(usuario.hospital_id),
      }));
    }

    setCatalogosCargados(true);
  }

  // ==========================================
  // CARGAR HOSPITALIZACIONES
  // ==========================================

  async function cargarHospitalizaciones(
    mostrarCarga = true,
  ) {
    if (mostrarCarga) {
      setCargando(true);
    }

    setError('');

    try {
      const parametros = new URLSearchParams();

      if (busqueda.trim()) {
        parametros.set('busqueda', busqueda.trim());
      }

      if (estadoFiltro !== 'todos') {
        parametros.set('estado', estadoFiltro);
      }

      const query = parametros.toString();

      const endpoint = query
        ? `/hospitalizaciones?${query}`
        : '/hospitalizaciones';

      const response = await fetchAutenticado(endpoint);
      const data = await leerRespuesta(response);

      setHospitalizaciones(
        Array.isArray(data) ? data : [],
      );
    } catch (err) {
      console.error(
        'Error cargando hospitalizaciones:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las hospitalizaciones.',
      );
    } finally {
      if (mostrarCarga) {
        setCargando(false);
      }
    }
  }

  // ==========================================
  // INICIALIZAR MÓDULO
  // ==========================================

  useEffect(() => {
    let activo = true;

    async function inicializar() {
      setCargando(true);
      setError('');

      try {
        await cargarCatalogos();

        if (activo) {
          await cargarHospitalizaciones();
        }
      } catch (err) {
        console.error(
          'Error inicializando hospitalizaciones:',
          err,
        );

        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : 'Error al cargar el módulo.',
          );
          setCargando(false);
        }
      }
    }

    void inicializar();

    return () => {
      activo = false;
    };
  }, []);

  // ==========================================
  // ACTUALIZAR BÚSQUEDA Y FILTROS
  // ==========================================

  useEffect(() => {
    if (!catalogosCargados) return;

    const temporizador = window.setTimeout(() => {
      void cargarHospitalizaciones();
    }, 350);

    return () => window.clearTimeout(temporizador);
  }, [busqueda, estadoFiltro, catalogosCargados]);

  // ==========================================
  // ACTUALIZAR FORMULARIO
  // ==========================================

  function actualizarCampo(
    campo: keyof typeof formularioInicial,
    valor: string,
  ) {
    if (campo === 'hospitalId' && esHospital) {
      return;
    }

    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  // ==========================================
  // LIMPIAR FORMULARIO
  // ==========================================

  function limpiarFormulario() {
    setFormulario({
      ...formularioInicial,
      hospitalId:
        esHospital && usuario?.hospital_id
          ? String(usuario.hospital_id)
          : '',
    });

    setEditando(null);
  }

  // ==========================================
  // REGISTRAR O ACTUALIZAR
  // ==========================================

  async function guardarHospitalizacion(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (!puedeGestionar) {
      setError(
        'No tienes permisos para registrar hospitalizaciones.',
      );
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      const hospitalId = esHospital
        ? Number(usuario?.hospital_id)
        : Number(formulario.hospitalId);

      const payload = {
        pacienteId: Number(formulario.pacienteId),
        medicoId: Number(formulario.medicoId),
        hospitalId,
        cie10Ingreso:
          formulario.cie10Ingreso.trim() || null,
        fechaIngreso: formulario.fechaIngreso,
        montoFacturado:
          formulario.montoFacturado === ''
            ? null
            : Number(formulario.montoFacturado),
        codigoAseguradora:
          formulario.codigoAseguradora.trim() || null,
      };

      if (
        !payload.pacienteId ||
        !payload.medicoId ||
        !payload.hospitalId ||
        !payload.fechaIngreso
      ) {
        throw new Error(
          'Completa todos los campos obligatorios.',
        );
      }

      const endpoint = editando
        ? `/hospitalizaciones/${editando}`
        : '/hospitalizaciones';

      const response = await fetchAutenticado(endpoint, {
        method: editando ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      await leerRespuesta(response);

      setMensaje(
        editando
          ? 'Hospitalización actualizada correctamente.'
          : 'Ingreso hospitalario registrado correctamente.',
      );

      limpiarFormulario();

      await cargarHospitalizaciones();
    } catch (err) {
      console.error(
        'Error guardando hospitalización:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la hospitalización.',
      );
    } finally {
      setGuardando(false);
    }
  }

  // ==========================================
  // EDITAR
  // ==========================================

  function seleccionarEdicion(item: Hospitalizacion) {
    if (!puedeGestionar) return;

    setEditando(item.hospitalizacionId);

    setFormulario({
      pacienteId: String(item.pacienteId),
      medicoId: String(item.medicoId),
      hospitalId: String(item.hospitalId),
      cie10Ingreso: item.cie10Ingreso ?? '',
      fechaIngreso: item.fechaIngreso
        ? new Date(item.fechaIngreso)
            .toISOString()
            .slice(0, 16)
        : '',
      montoFacturado:
        item.montoFacturado === null
          ? ''
          : String(item.montoFacturado),
      codigoAseguradora:
        item.codigoAseguradora ?? '',
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  // ==========================================
  // ABRIR REGISTRO DE EGRESO
  // ==========================================

  function abrirEgreso(item: Hospitalizacion) {
    if (!puedeGestionar) return;

    setEgresoId(item.hospitalizacionId);
    setFechaEgreso(fechaActualLocal());
    setTipoEgreso('Alta médica');

    setMontoEgreso(
      item.montoFacturado === null
        ? ''
        : String(item.montoFacturado),
    );
  }

  // ==========================================
  // GUARDAR EGRESO
  // ==========================================

  async function guardarEgreso() {
    if (!egresoId || !fechaEgreso || !tipoEgreso.trim()) {
      setError(
        'Completa la fecha y el tipo de egreso.',
      );
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      const response = await fetchAutenticado(
        `/hospitalizaciones/${egresoId}/egreso`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            fechaEgreso,
            tipoEgreso,
            montoFacturado:
              montoEgreso === ''
                ? null
                : Number(montoEgreso),
          }),
        },
      );

      await leerRespuesta(response);

      setMensaje(
        'Egreso hospitalario registrado correctamente.',
      );

      setEgresoId(null);

      await cargarHospitalizaciones();
    } catch (err) {
      console.error('Error registrando egreso:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo registrar el egreso.',
      );
    } finally {
      setGuardando(false);
    }
  }

  // ==========================================
  // INDICADORES
  // ==========================================

  const activas = hospitalizaciones.filter(
    (item) => !item.fechaEgreso,
  );

  const egresadas = hospitalizaciones.filter(
    (item) => !!item.fechaEgreso,
  );

  const totalFacturado = hospitalizaciones.reduce(
    (total, item) =>
      total + Number(item.montoFacturado ?? 0),
    0,
  );

  const dinero = (valor: number) =>
    `Q ${valor.toLocaleString('es-GT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const fecha = (valor: string | null) =>
    valor
      ? new Date(valor).toLocaleString('es-GT')
      : 'Pendiente';

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="space-y-6 p-5 sm:p-8">

      {/* ENCABEZADO */}

      <div>
        <p className="text-sm font-medium text-teal-600">
          Gestión hospitalaria
        </p>

        <h1 className="mt-1 text-2xl font-bold text-[#12343B]">
          Hospitalizaciones
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Administración de ingresos, seguimiento y egresos hospitalarios.
        </p>

        {esHospital && (
          <p className="mt-2 text-sm font-semibold text-teal-700">
            Institución: Hospital Yarden
          </p>
        )}
      </div>

      {/* MENSAJES */}

      {mensaje && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>No se pudo completar la operación.</strong>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* INDICADORES */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total de ingresos',
            valor: hospitalizaciones.length,
          },
          {
            label: 'Hospitalizados actualmente',
            valor: activas.length,
          },
          {
            label: 'Egresos registrados',
            valor: egresadas.length,
          },
          {
            label: 'Monto facturado',
            valor: dinero(totalFacturado),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">
              {item.label}
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#12343B]">
              {item.valor}
            </h2>
          </div>
        ))}
      </section>

      {/* FORMULARIO */}

      {puedeGestionar && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#12343B]">
              {editando
                ? 'Editar hospitalización'
                : 'Registrar ingreso hospitalario'}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Completa la información del paciente y su ingreso.
            </p>
          </div>

          <form
            onSubmit={guardarHospitalizacion}
            className="space-y-5"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Paciente *
                </label>

                <select
                  required
                  value={formulario.pacienteId}
                  onChange={(e) =>
                    actualizarCampo('pacienteId', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="">
                    Seleccionar paciente
                  </option>

                  {pacientes.map((item) => (
                    <option
                      key={item.pacienteId}
                      value={item.pacienteId}
                    >
                      Paciente #{item.pacienteId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Médico responsable *
                </label>

                <select
                  required
                  value={formulario.medicoId}
                  onChange={(e) =>
                    actualizarCampo('medicoId', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="">
                    Seleccionar médico
                  </option>

                  {medicos
                    .filter((medico) => esActivo(medico.activo))
                    .map((item) => (
                      <option
                        key={item.medicoId}
                        value={item.medicoId}
                      >
                        {item.nombres} {item.apellidos}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Hospital *
                </label>

                <select
                  required
                  disabled={esHospital}
                  value={formulario.hospitalId}
                  onChange={(e) =>
                    actualizarCampo('hospitalId', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">
                    Seleccionar hospital
                  </option>

                  {hospitales
                    .filter((hospital) => esActivo(hospital.activo))
                    .map((item) => (
                      <option
                        key={item.hospitalId}
                        value={item.hospitalId}
                      >
                        {item.nombre}
                      </option>
                    ))}
                </select>

                {esHospital && (
                  <p className="mt-1 text-xs text-teal-700">
                    Tu institución está asignada automáticamente.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Código CIE-10 de ingreso
                </label>

                <input
                  value={formulario.cie10Ingreso}
                  onChange={(e) =>
                    actualizarCampo('cie10Ingreso', e.target.value)
                  }
                  placeholder="Ej. J18.9"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Fecha y hora de ingreso *
                </label>

                <input
                  type="datetime-local"
                  required
                  value={formulario.fechaIngreso}
                  onChange={(e) =>
                    actualizarCampo('fechaIngreso', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Monto facturado (Q)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formulario.montoFacturado}
                  onChange={(e) =>
                    actualizarCampo('montoFacturado', e.target.value)
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Código de aseguradora
                </label>

                <input
                  value={formulario.codigoAseguradora}
                  onChange={(e) =>
                    actualizarCampo('codigoAseguradora', e.target.value)
                  }
                  placeholder="Código de aseguradora"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={guardando || !catalogosCargados}
                className="rounded-xl bg-[#12343B] px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {guardando
                  ? 'Guardando...'
                  : editando
                    ? 'Actualizar hospitalización'
                    : 'Registrar ingreso'}
              </button>

              {editando && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {/* BÚSQUEDA Y FILTROS */}

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por hospital, médico o código..."
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm"
        />

        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
        >
          <option value="todos">Todos los registros</option>
          <option value="activa">Hospitalizados</option>
          <option value="egresada">Egresados</option>
        </select>

        <button
          type="button"
          onClick={() => void cargarHospitalizaciones()}
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
        >
          Actualizar
        </button>
      </section>

      {/* TABLA */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-[#12343B]">
            Directorio de hospitalizaciones
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Consulta y administra los ingresos hospitalarios registrados.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Registro</th>
                <th className="px-5 py-4">Paciente</th>
                <th className="px-5 py-4">Médico</th>
                <th className="px-5 py-4">Hospital</th>
                <th className="px-5 py-4">Ingreso</th>
                <th className="px-5 py-4">Egreso</th>
                <th className="px-5 py-4">Estado</th>
                {puedeGestionar && (
                  <th className="px-5 py-4">Acciones</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {hospitalizaciones.map((item) => (
                <tr
                  key={item.hospitalizacionId}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-semibold text-[#12343B]">
                    HOSP-{String(item.hospitalizacionId).padStart(4, '0')}
                  </td>

                  <td className="px-5 py-4">
                    Paciente #{item.pacienteId}
                  </td>

                  <td className="px-5 py-4">
                    {item.medico
                      ? `${item.medico.nombres} ${item.medico.apellidos}`
                      : `Médico #${item.medicoId}`}
                  </td>

                  <td className="px-5 py-4">
                    {item.hospital?.nombre ??
                      `Hospital #${item.hospitalId}`}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4">
                    {fecha(item.fechaIngreso)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4">
                    {fecha(item.fechaEgreso)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.fechaEgreso
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {item.fechaEgreso
                        ? 'Egresado'
                        : 'Hospitalizado'}
                    </span>
                  </td>

                  {puedeGestionar && (
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => seleccionarEdicion(item)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                        >
                          Editar
                        </button>

                        {!item.fechaEgreso && (
                          <button
                            type="button"
                            onClick={() => abrirEgreso(item)}
                            className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                          >
                            Registrar egreso
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {hospitalizaciones.length === 0 && (
                <tr>
                  <td
                    colSpan={puedeGestionar ? 8 : 7}
                    className="px-5 py-12 text-center text-slate-400"
                  >
                    {cargando
                      ? 'Cargando hospitalizaciones...'
                      : 'No hay hospitalizaciones registradas.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL DE EGRESO */}

      {egresoId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-[#12343B]">
              Registrar egreso hospitalario
            </h2>

            <p className="mb-5 mt-2 text-sm text-slate-500">
              Hospitalización HOSP-{String(egresoId).padStart(4, '0')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Fecha y hora de egreso *
                </label>

                <input
                  type="datetime-local"
                  value={fechaEgreso}
                  onChange={(e) => setFechaEgreso(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Tipo de egreso *
                </label>

                <select
                  value={tipoEgreso}
                  onChange={(e) => setTipoEgreso(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option>Alta médica</option>
                  <option>Traslado</option>
                  <option>Referencia</option>
                  <option>Defunción</option>
                  <option>Retiro voluntario</option>
                  <option>Otro</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Monto facturado final (Q)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoEgreso}
                  onChange={(e) => setMontoEgreso(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setEgresoId(null)}
                disabled={guardando}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void guardarEgreso()}
                disabled={guardando}
                className="rounded-xl bg-[#12343B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {guardando
                  ? 'Guardando...'
                  : 'Confirmar egreso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/hospitalizaciones')({
  component: Hospitalizaciones,
});
