
import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { fetchAutenticado, obtenerUsuario } from '../lib/auth.js';

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril',
  'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

type Evento = {
  eventoId: number;
  usuarioNombre: string | null;
  usuarioRol?: string | null;
  hospitalId?: number | null;
  modulo: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  codigoRespuesta: number;
  fechaEvento: string;
};

type Resumen = {
  mes: number;
  año: number;
  totalEventos: number;
  porModulo: Record<string, number>;
  porAccion: Record<string, number>;
  eventos: Evento[];
};

type AuditoriaMensual = {
  auditoriaId: number;
  mes: number;
  año: number;
  estado: string;
  observaciones: string | null;
  conclusiones: string | null;
  recomendaciones: string | null;
  revisadoPor: string | null;
};

type Usuario = {
  rol?: string;
  hospitalId?: number | null;
  email?: string;
};

function Auditoria() {
  const hoy = new Date();
  const usuario = obtenerUsuario() as Usuario | null;

  const rol = usuario?.rol?.toUpperCase() ?? '';
  const esAdministrador = rol === 'ADMINISTRADOR';
  const esHospital = rol === 'HOSPITAL';

  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [año, setAño] = useState(hoy.getFullYear());

  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [auditoria, setAuditoria] = useState<AuditoriaMensual | null>(null);
  const [historial, setHistorial] = useState<AuditoriaMensual[]>([]);

  const [observaciones, setObservaciones] = useState('');
  const [conclusiones, setConclusiones] = useState('');
  const [recomendaciones, setRecomendaciones] = useState('');
  const [revisadoPor, setRevisadoPor] = useState('');

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cerrada = auditoria?.estado === 'Cerrada';

  async function leerRespuesta(response: Response) {
    const texto = await response.text();

    let data: any = {};

    try {
      data = texto ? JSON.parse(texto) : {};
    } catch {
      data = { message: texto };
    }

    if (!response.ok) {
      throw new Error(
        data.message || `Error ${response.status} al consultar auditoría.`,
      );
    }

    return data;
  }

  async function cargarDatos() {
    if (!esAdministrador && !esHospital) {
      setError('Tu usuario no tiene permisos para consultar auditoría.');
      return;
    }

    setCargando(true);
    setError('');
    setMensaje('');

    try {
      const parametros = new URLSearchParams({
        mes: String(mes),
        año: String(año),
      });

      // Todos los usuarios autorizados consultan sus movimientos.
      const resumenResponse = await fetchAutenticado(
        `/auditoria/resumen?${parametros.toString()}`,
      );

      const resumenData: Resumen = await leerRespuesta(resumenResponse);

      setResumen(resumenData);

      // El hospital no consulta ni modifica la revisión mensual global.
      if (esAdministrador) {
        const [auditoriaResponse, historialResponse] = await Promise.all([
          fetchAutenticado(
            `/auditoria/mensual/${mes}/${año}`,
          ),
          fetchAutenticado('/auditoria/historial'),
        ]);

        const auditoriaData = await leerRespuesta(auditoriaResponse);
        const historialData = await leerRespuesta(historialResponse);

        setAuditoria(auditoriaData.auditoria ?? null);
        setHistorial(Array.isArray(historialData) ? historialData : []);

        setObservaciones(
          auditoriaData.auditoria?.observaciones ?? '',
        );
        setConclusiones(
          auditoriaData.auditoria?.conclusiones ?? '',
        );
        setRecomendaciones(
          auditoriaData.auditoria?.recomendaciones ?? '',
        );
        setRevisadoPor(
          auditoriaData.auditoria?.revisadoPor ?? '',
        );
      } else {
        setAuditoria(null);
        setHistorial([]);
        setObservaciones('');
        setConclusiones('');
        setRecomendaciones('');
        setRevisadoPor('');
      }
    } catch (err) {
      console.error('Error al cargar auditoría:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible consultar la auditoría.',
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarDatos();
  }, [mes, año]);

  async function guardarRevision() {
    if (!esAdministrador) {
      setError('Solo el administrador puede guardar revisiones.');
      return;
    }

    if (
      !observaciones.trim() ||
      !conclusiones.trim()
    ) {
      setError('Completa las observaciones y conclusiones.');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      const response = await fetchAutenticado(
        `/auditoria/revision/${mes}/${año}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            observaciones,
            conclusiones,
            recomendaciones,
          }),
        },
      );

      await leerRespuesta(response);

      setMensaje('La revisión mensual se guardó correctamente.');
      await cargarDatos();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar.',
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cerrarAuditoria() {
    if (!esAdministrador) {
      setError('Solo el administrador puede cerrar auditorías.');
      return;
    }

    if (
      !window.confirm(
        `¿Deseas cerrar la auditoría de ${meses[mes - 1]} ${año}?`,
      )
    ) {
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      const response = await fetchAutenticado(
        `/auditoria/cerrar/${mes}/${año}`,
        { method: 'PUT' },
      );

      await leerRespuesta(response);

      setMensaje('La auditoría mensual se cerró correctamente.');
      await cargarDatos();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cerrar.',
      );
    } finally {
      setGuardando(false);
    }
  }

  const total = resumen?.totalEventos ?? 0;

  const indicadores = [
    {
      label: 'Total de movimientos',
      value: total,
    },
    {
      label: 'Módulos con actividad',
      value: Object.keys(resumen?.porModulo ?? {}).length,
    },
    {
      label: 'Tipos de acciones',
      value: Object.keys(resumen?.porAccion ?? {}).length,
    },
    ...(esAdministrador
      ? [{
          label: 'Estado de auditoría',
          value: auditoria?.estado ?? 'Pendiente',
        }]
      : []),
  ];

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <div>
        <p className="text-sm font-medium text-teal-600">
          {esAdministrador
            ? 'Administración del sistema'
            : 'Gestión hospitalaria'}
        </p>

        <h1 className="mt-1 text-2xl font-bold text-[#12343B]">
          {esAdministrador ? 'Auditoría mensual' : 'Auditoría hospitalaria'}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {esAdministrador
            ? 'Control y revisión de las operaciones registradas en SISG.'
            : 'Consulta de los movimientos relacionados con tu establecimiento.'}
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Mes
            </label>

            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              {meses.map((nombre, index) => (
                <option key={index} value={index + 1}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Año
            </label>

            <select
              value={año}
              onChange={(e) => setAño(Number(e.target.value))}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              {Array.from(
                { length: 6 },
                (_, i) => hoy.getFullYear() - i,
              ).map((valorAño) => (
                <option key={valorAño} value={valorAño}>
                  {valorAño}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={cargarDatos}
            disabled={cargando}
            className="rounded-xl bg-[#12343B] px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {cargando ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </section>

      {mensaje && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className={`grid gap-4 sm:grid-cols-2 ${esAdministrador ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        {indicadores.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <h2 className="mt-2 text-2xl font-bold text-[#12343B]">
              {cargando ? '...' : item.value}
            </h2>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#12343B]">
          Actividad por módulo
        </h2>

        <div className="mt-5 space-y-4">
          {Object.entries(resumen?.porModulo ?? {}).map(
            ([nombre, cantidad]) => {
              const porcentaje = total
                ? (cantidad / total) * 100
                : 0;

              return (
                <div key={nombre}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium capitalize">{nombre}</span>
                    <span className="font-bold">{cantidad}</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-500"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            },
          )}

          {total === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              {cargando
                ? 'Cargando movimientos...'
                : 'No hay movimientos registrados en este período.'}
            </p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-[#12343B]">
            Registro de movimientos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Operaciones realizadas durante el período.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Fecha</th>
                <th className="px-5 py-4">Módulo</th>
                <th className="px-5 py-4">Acción</th>
                <th className="px-5 py-4">Registro</th>
                <th className="px-5 py-4">Usuario</th>
                <th className="px-5 py-4">Resultado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {(resumen?.eventos ?? []).map((evento) => (
                <tr key={evento.eventoId} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                    {new Date(evento.fechaEvento).toLocaleString('es-GT')}
                  </td>

                  <td className="px-5 py-4 font-medium capitalize">
                    {evento.modulo}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                      {evento.accion}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {evento.entidad}
                    {evento.entidadId ? ` #${evento.entidadId}` : ''}
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {evento.usuarioNombre ?? 'No identificado'}
                  </td>

                  <td className="px-5 py-4 font-semibold text-green-700">
                    {evento.codigoRespuesta}
                  </td>
                </tr>
              ))}

              {total === 0 && !cargando && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-400"
                  >
                    No hay movimientos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {esAdministrador && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#12343B]">
              Revisión administrativa mensual
            </h2>

            <p className="mb-5 mt-1 text-sm text-slate-500">
              Registra las observaciones y conclusiones del período.
            </p>

            {cerrada && (
              <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                Esta auditoría está cerrada.
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Responsable de la revisión
                </label>

                <input
                  value={usuario?.email ?? revisadoPor}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Observaciones
                </label>

                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  disabled={cerrada}
                  rows={4}
                  placeholder="Describe los movimientos importantes..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Conclusiones
                </label>

                <textarea
                  value={conclusiones}
                  onChange={(e) => setConclusiones(e.target.value)}
                  disabled={cerrada}
                  rows={4}
                  placeholder="Escribe las conclusiones..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Recomendaciones
                </label>

                <textarea
                  value={recomendaciones}
                  onChange={(e) => setRecomendaciones(e.target.value)}
                  disabled={cerrada}
                  rows={4}
                  placeholder="Describe las mejoras recomendadas..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
                />
              </div>

              {!cerrada && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={guardarRevision}
                    disabled={guardando}
                    className="rounded-xl bg-[#12343B] px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                  >
                    {guardando ? 'Guardando...' : 'Guardar revisión'}
                  </button>

                  <button
                    onClick={cerrarAuditoria}
                    disabled={guardando || !auditoria}
                    className="rounded-xl border border-teal-600 px-5 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                  >
                    Cerrar auditoría
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#12343B]">
              Historial de auditorías
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Consulta los períodos revisados anteriormente.
            </p>

            <div className="mt-5 space-y-3">
              {historial.map((item) => (
                <button
                  key={item.auditoriaId}
                  onClick={() => {
                    setMes(item.mes);
                    setAño(item.año);
                  }}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4 text-left hover:border-teal-300 hover:bg-teal-50"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {meses[item.mes - 1]} {item.año}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Responsable: {item.revisadoPor ?? 'No indicado'}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.estado === 'Cerrada'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.estado}
                  </span>
                </button>
              ))}

              {historial.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">
                  Todavía no existen auditorías revisadas.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute('/auditoria')({
  component: Auditoria,
});
