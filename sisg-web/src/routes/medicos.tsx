
import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { fetchAutenticado } from '../lib/auth.js';

export const Route = createFileRoute('/medicos')({
  component: MedicosPage,
});

interface Medico {
  medicoId: number;
  numeroColegiado: string;
  nombres: string;
  apellidos: string;
  sexo: string | null;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  especialidad?: {
    nombre: string;
  } | null;
}

function MedicosPage() {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // ==========================================
  // CARGAR MÉDICOS
  // ==========================================

  const obtenerMedicos = async () => {
    try {
      setCargando(true);
      setError('');

      const respuesta =
        await fetchAutenticado('/medicos');

      if (!respuesta.ok) {
        const mensaje = await respuesta.text();

        throw new Error(
          `Error ${respuesta.status}: ${mensaje}`,
        );
      }

      const datos: Medico[] = await respuesta.json();

      setMedicos(datos);
    } catch (err) {
      console.error(
        'Error al obtener médicos:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible conectar con SISG API.',
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void obtenerMedicos();
  }, []);

  // ==========================================
  // BUSCADOR
  // ==========================================

  const medicosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    return medicos.filter((medico) =>
      [
        medico.numeroColegiado,
        medico.nombres,
        medico.apellidos,
        medico.especialidad?.nombre ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(texto),
    );
  }, [medicos, busqueda]);

  const activos = medicos.filter(
    (medico) => medico.activo,
  ).length;

  const inactivos = medicos.length - activos;

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="mx-auto max-w-[1600px] p-5 sm:p-8">

      {/* ENCABEZADO */}

      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs text-slate-400">
            SISG / Gestión de profesionales
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#12343B]">
            Gestión de médicos
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Consulta los profesionales que atienden en tu institución.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="w-fit rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
            {medicos.length} médicos registrados
          </span>

          <button
            type="button"
            onClick={() => void obtenerMedicos()}
            disabled={cargando}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#12343B] transition hover:bg-slate-50 disabled:opacity-50"
          >
            {cargando ? 'Cargando...' : '↻ Actualizar'}
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* INDICADORES */}

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total de médicos
          </p>

          <h2 className="mt-3 text-3xl font-bold text-[#12343B]">
            {cargando ? '...' : medicos.length}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Médicos activos
          </p>

          <h2 className="mt-3 text-3xl font-bold text-green-600">
            {cargando ? '...' : activos}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Médicos inactivos
          </p>

          <h2 className="mt-3 text-3xl font-bold text-red-500">
            {cargando ? '...' : inactivos}
          </h2>
        </div>
      </div>

      {/* DIRECTORIO */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#12343B]">
            Directorio de médicos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Profesionales con actividad registrada en tu hospital.
          </p>
        </div>

        {/* BUSCADOR */}

        <div className="mb-6">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, colegiado o especialidad..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {cargando ? (
          <p className="py-10 text-center text-slate-500">
            Cargando médicos...
          </p>
        ) : error ? (
          <p className="py-10 text-center text-red-600">
            No fue posible cargar el directorio.
          </p>
        ) : medicosFiltrados.length === 0 ? (
          <p className="py-10 text-center text-slate-500">
            No se encontraron médicos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">

              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="px-4 py-4">
                    Colegiado
                  </th>

                  <th className="px-4 py-4">
                    Médico
                  </th>

                  <th className="px-4 py-4">
                    Especialidad
                  </th>

                  <th className="px-4 py-4">
                    Correo
                  </th>

                  <th className="px-4 py-4">
                    Teléfono
                  </th>

                  <th className="px-4 py-4">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody>
                {medicosFiltrados.map((medico) => (
                  <tr
                    key={medico.medicoId}
                    className="border-b border-slate-100 transition hover:bg-teal-50/40"
                  >
                    <td className="px-4 py-4 font-medium text-slate-600">
                      {medico.numeroColegiado}
                    </td>

                    <td className="px-4 py-4 font-semibold text-[#12343B]">
                      {medico.nombres} {medico.apellidos}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {medico.especialidad?.nombre || 'Sin especialidad'}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {medico.email || 'No registrado'}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {medico.telefono || 'No registrado'}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          medico.activo
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {medico.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

        <p className="mt-5 text-xs text-slate-400">
          Mostrando {medicosFiltrados.length} de {medicos.length} médicos.
        </p>
      </section>
    </div>
  );
}
