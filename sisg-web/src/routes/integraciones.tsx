import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/integraciones')({
  component: IntegracionesPage,
})

const API = 'http://localhost:3000'

interface Aseguradora {
  aseguradoraId: number
  codigo: string
  nombre: string
  telefono: string
  correo: string
  estado: 'ACTIVA' | 'INACTIVA'
}

interface HospitalAfiliado {
  hospitalId: number
  aseguradoraId: number
  codigoHospital: string
  nombreHospital: string
  cobertura: string
  porcentajeCobertura: number
  estadoAfiliacion: 'ACTIVA' | 'INACTIVA'
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100'

function IntegracionesPage() {
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[]>([])
  const [hospitales, setHospitales] = useState<HospitalAfiliado[]>([])

  const [aseguradoraSeleccionada, setAseguradoraSeleccionada] =
    useState<number | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // CARGAR INFORMACIÓN
  async function cargarDatos() {
    setCargando(true)
    setError('')

    try {
      const [aseguradorasRes, hospitalesRes] = await Promise.all([
        fetch(`${API}/integraciones/aseguradoras`),
        fetch(`${API}/integraciones/hospitales-afiliados`),
      ])

      if (!aseguradorasRes.ok || !hospitalesRes.ok) {
        throw new Error('No se pudieron cargar los datos de integración.')
      }

      const aseguradorasData: Aseguradora[] =
        await aseguradorasRes.json()

      const hospitalesData: HospitalAfiliado[] =
        await hospitalesRes.json()

      setAseguradoras(aseguradorasData)
      setHospitales(hospitalesData)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible conectar con el servidor.',
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarDatos()
  }, [])

  // FILTRAR HOSPITALES
  const hospitalesFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase().trim()

    return hospitales.filter((hospital) => {
      const coincideAseguradora =
        aseguradoraSeleccionada === null ||
        hospital.aseguradoraId === aseguradoraSeleccionada

      const coincideBusqueda = [
        hospital.nombreHospital,
        hospital.codigoHospital,
        hospital.cobertura,
      ]
        .join(' ')
        .toLowerCase()
        .includes(termino)

      return coincideAseguradora && coincideBusqueda
    })
  }, [hospitales, aseguradoraSeleccionada, busqueda])

  // INDICADORES
  const aseguradorasActivas = aseguradoras.filter(
    (a) => a.estado === 'ACTIVA',
  ).length

  const afiliacionesActivas = hospitales.filter(
    (h) => h.estadoAfiliacion === 'ACTIVA',
  ).length

  const afiliacionesInactivas = hospitales.length - afiliacionesActivas

  // CONTAR HOSPITALES POR ASEGURADORA
  function contarHospitales(aseguradoraId: number) {
    return hospitales.filter(
      (h) =>
        h.aseguradoraId === aseguradoraId &&
        h.estadoAfiliacion === 'ACTIVA',
    ).length
  }

  const aseguradoraActivaSeleccionada = aseguradoras.find(
    (a) => a.aseguradoraId === aseguradoraSeleccionada,
  )

  return (
    <main className="mx-auto max-w-[1600px] p-5 sm:p-8">

      {/* ENCABEZADO */}
      <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs text-slate-400">
            SISG / Interoperabilidad
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#12343B]">
            Red de Instituciones
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Consulta las aseguradoras y los hospitales privados afiliados a la red.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            Conexión con aseguradoras
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
      </section>

      {/* INFORMACIÓN DE INTEGRACIÓN */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-2xl text-teal-700">
            ⇄
          </div>

          <div>
            <h2 className="font-bold text-[#12343B]">
              Integración con aseguradoras
            </h2>

            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Los datos se obtienen de un simulador local que representa
              el intercambio de información con un sistema externo.
            </p>
          </div>

          <div className="sm:ml-auto">
            <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
              Simulación institucional
            </span>
          </div>
        </div>
      </section>

      {/* ERROR */}
      {error && (
        <div className="mb-6 flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => void cargarDatos()}
            className="font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* INDICADORES */}
      <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total de aseguradoras
          </p>

          <h2 className="mt-3 text-3xl font-bold text-[#12343B]">
            {cargando ? '...' : aseguradoras.length}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Sistemas externos registrados
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Aseguradoras activas
          </p>

          <h2 className="mt-3 text-3xl font-bold text-[#176B69]">
            {cargando ? '...' : aseguradorasActivas}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Disponibles para consulta
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Afiliaciones hospitalarias
          </p>

          <h2 className="mt-3 text-3xl font-bold text-[#12343B]">
            {cargando ? '...' : hospitales.length}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            {afiliacionesActivas} activas · {afiliacionesInactivas} inactivas
          </p>
        </div>
      </section>

      {/* ASEGURADORAS */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#12343B]">
              Aseguradoras disponibles
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Selecciona una institución para consultar sus hospitales afiliados.
            </p>
          </div>

          {aseguradoraSeleccionada !== null && (
            <button
              type="button"
              onClick={() => setAseguradoraSeleccionada(null)}
              className="w-fit rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Limpiar selección ✕
            </button>
          )}
        </div>

        {cargando ? (
          <LoadingMessage text="Cargando aseguradoras..." />
        ) : aseguradoras.length === 0 ? (
          <EmptyMessage text="No hay aseguradoras disponibles." />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

            {aseguradoras.map((aseguradora) => {
              const seleccionada =
                aseguradoraSeleccionada === aseguradora.aseguradoraId

              return (
                <button
                  key={aseguradora.aseguradoraId}
                  type="button"
                  onClick={() =>
                    setAseguradoraSeleccionada(
                      seleccionada ? null : aseguradora.aseguradoraId,
                    )
                  }
                  className={`rounded-2xl border p-5 text-left transition ${
                    seleccionada
                      ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-100'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-2xl text-teal-700">
                      ♧
                    </div>

                    <StatusBadge
                      activo={aseguradora.estado === 'ACTIVA'}
                      texto={aseguradora.estado}
                    />
                  </div>

                  <h3 className="mt-5 font-bold text-[#12343B]">
                    {aseguradora.nombre}
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Código: {aseguradora.codigo}
                  </p>

                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <span className="text-teal-700">☎</span>
                      {aseguradora.telefono || 'Sin teléfono'}
                    </p>

                    <p className="flex items-center gap-2 break-all">
                      <span className="text-teal-700">✉</span>
                      {aseguradora.correo || 'Sin correo'}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-sm text-slate-500">
                      Hospitales afiliados
                    </span>

                    <span className="text-lg font-bold text-teal-700">
                      {contarHospitales(aseguradora.aseguradoraId)}
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-semibold text-teal-700">
                    {seleccionada
                      ? 'Filtro seleccionado ✓'
                      : 'Ver hospitales afiliados →'}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* HOSPITALES AFILIADOS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#12343B]">
              Hospitales privados afiliados
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Relaciones simuladas entre aseguradoras y hospitales de SISG.
            </p>

            {aseguradoraActivaSeleccionada && (
              <p className="mt-2 text-xs font-semibold text-teal-700">
                Filtrando por: {aseguradoraActivaSeleccionada.nombre}
              </p>
            )}
          </div>

          <input
            type="search"
            placeholder="Buscar hospital..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={`${inputClass} lg:max-w-xs`}
          />
        </div>

        {/* FILTROS */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAseguradoraSeleccionada(null)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              aseguradoraSeleccionada === null
                ? 'bg-[#176B69] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-teal-50'
            }`}
          >
            Todas
          </button>

          {aseguradoras.map((aseguradora) => (
            <button
              key={aseguradora.aseguradoraId}
              type="button"
              onClick={() =>
                setAseguradoraSeleccionada(aseguradora.aseguradoraId)
              }
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                aseguradoraSeleccionada === aseguradora.aseguradoraId
                  ? 'bg-[#176B69] text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-teal-50'
              }`}
            >
              {aseguradora.nombre}
            </button>
          ))}
        </div>

        {/* TABLA */}
        {cargando ? (
          <LoadingMessage text="Cargando afiliaciones..." />
        ) : error ? (
          <EmptyMessage text="No fue posible mostrar las afiliaciones." />
        ) : hospitalesFiltrados.length === 0 ? (
          <EmptyMessage text="No se encontraron hospitales afiliados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">

              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="px-4 py-4">Hospital</th>
                  <th className="px-4 py-4">Aseguradora</th>
                  <th className="px-4 py-4">Cobertura</th>
                  <th className="px-4 py-4">Porcentaje</th>
                  <th className="px-4 py-4">Estado</th>
                </tr>
              </thead>

              <tbody>
                {hospitalesFiltrados.map((hospital) => {
                  const aseguradora = aseguradoras.find(
                    (a) => a.aseguradoraId === hospital.aseguradoraId,
                  )

                  const porcentaje = Math.min(
                    100,
                    Math.max(0, Number(hospital.porcentajeCobertura) || 0),
                  )

                  return (
                    <tr
                      key={`${hospital.hospitalId}-${hospital.aseguradoraId}`}
                      className="border-b border-slate-100 transition hover:bg-teal-50/40"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#12343B]">
                          {hospital.nombreHospital}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Código: {hospital.codigoHospital}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {aseguradora?.nombre ?? 'No identificada'}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {hospital.cobertura}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-teal-600"
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>

                          <span className="font-semibold text-slate-700">
                            {hospital.porcentajeCobertura}%
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge
                          activo={hospital.estadoAfiliacion === 'ACTIVA'}
                          texto={hospital.estadoAfiliacion}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PIE DE TABLA */}
        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="text-xs text-slate-400">
            Mostrando{' '}
            <span className="font-semibold text-slate-600">
              {hospitalesFiltrados.length}
            </span>{' '}
            de{' '}
            <span className="font-semibold text-slate-600">
              {hospitales.length}
            </span>{' '}
            afiliaciones.
          </p>
        </div>
      </section>

      {/* PIE INFORMATIVO */}
      <div className="mt-6 flex flex-col justify-between gap-2 text-xs text-slate-400 sm:flex-row sm:items-center">
        <p>SISG · Red de Instituciones</p>
        <p>Información obtenida del simulador local de integraciones.</p>
      </div>
    </main>
  )
}

// INDICADOR DE CARGA
function LoadingMessage({ text }: { text: string }) {
  return (
    <div className="py-10 text-center">
      <p className="font-medium text-slate-600">{text}</p>
      <p className="mt-1 text-sm text-slate-400">
        Consultando información del sistema.
      </p>
    </div>
  )
}

// ESTADO VACÍO
function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="py-10 text-center">
      <div className="mb-3 text-3xl">🏥</div>
      <p className="font-semibold text-slate-700">{text}</p>
      <p className="mt-1 text-sm text-slate-400">
        Intenta actualizar o cambiar los filtros.
      </p>
    </div>
  )
}

// ETIQUETA DE ESTADO
function StatusBadge({
  activo,
  texto,
}: {
  activo: boolean
  texto: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        activo
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-600'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          activo ? 'bg-emerald-500' : 'bg-red-500'
        }`}
      />
      {texto}
    </span>
  )
}