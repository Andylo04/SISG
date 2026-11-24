
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { fetchAutenticado } from '../lib/auth.js'

export const Route = createFileRoute('/consultas')({
  component: ConsultasPage,
})

type Fila = Record<string, unknown>

type Resumen = {
  totalConsultas: number
  pacientesAtendidos: number
  medicosParticipantes: number
  hospitalesParticipantes: number
  totalFacturado: number
  duracionPromedio: number
  totalHospitalizaciones: number
  pacientesHospitalizados: number
  pacientesEgresados: number
  totalFacturadoHospitalizaciones: number
}

type Indicadores = {
  consultas: Fila[]
  hospitalizaciones: Fila[]
}

type Datos = {
  resumen: Resumen | null
  medicos: Fila[]
  hospitales: Fila[]
  aseguradoras: Fila[]
  diagnosticos: Fila[]
  citas: Fila[]
  indicadores: Indicadores
}

const secciones = [
  { id: 'general', nombre: 'General', icono: '▦' },
  { id: 'medicos', nombre: 'Médicos y pacientes', icono: '⚕' },
  { id: 'hospitales', nombre: 'Hospitales privados', icono: '✚' },
  { id: 'aseguradoras', nombre: 'Aseguradoras', icono: '🛡' },
  { id: 'diagnosticos', nombre: 'Diagnósticos CIE-10', icono: '✚' },
  { id: 'indicadores', nombre: 'Indicadores', icono: '▥' },
]

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100'

const cardClass =
  'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

const datosIniciales: Datos = {
  resumen: null,
  medicos: [],
  hospitales: [],
  aseguradoras: [],
  diagnosticos: [],
  citas: [],
  indicadores: {
    consultas: [],
    hospitalizaciones: [],
  },
}

function numero(valor: unknown): number {
  return Number(valor ?? 0)
}

function texto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  return String(valor)
}

function moneda(valor: unknown): string {
  return numero(valor).toLocaleString('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    maximumFractionDigits: 2,
  })
}

function fecha(valor: unknown): string {
  if (!valor) return '—'

  const valorTexto = String(valor)
  const resultado = new Date(
    valorTexto.includes('T')
      ? valorTexto
      : valorTexto.replace(' ', 'T'),
  )

  if (Number.isNaN(resultado.getTime())) return valorTexto

  return resultado.toLocaleDateString('es-GT')
}

function ConsultasPage() {
  const [seccion, setSeccion] = useState('general')
  const [busqueda, setBusqueda] = useState('')
  const [datos, setDatos] = useState<Datos>(datosIniciales)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')

  // CARGAR INFORMACIÓN DEL BACKEND CON JWT
  async function cargarDatos() {
    setActualizando(true)
    setError('')

    try {
      const rutas = [
        'resumen',
        'medicos-pacientes',
        'hospitales',
        'aseguradoras',
        'diagnosticos',
        'indicadores',
        'citas',
      ]

      const respuestas = await Promise.all(
        rutas.map(async (ruta) => {
          const respuesta = await fetchAutenticado(
            ruta === 'citas'
              ? '/citas'
              : `/consultas/${ruta}`,
          )

          if (!respuesta.ok) {
            const detalle = await respuesta.text()

            throw new Error(
              `Error al consultar ${ruta}: HTTP ${respuesta.status}. ${detalle}`,
            )
          }

          return respuesta.json()
        }),
      )

      setDatos({
        resumen: respuestas[0] as Resumen,
        medicos: respuestas[1] as Fila[],
        hospitales: respuestas[2] as Fila[],
        aseguradoras: respuestas[3] as Fila[],
        diagnosticos: respuestas[4] as Fila[],
        indicadores: respuestas[5] as Indicadores,
        citas: Array.isArray(respuestas[6])
          ? (respuestas[6] as Fila[])
          : [],
      })
    } catch (error) {
      console.error('Error cargando consultas:', error)

      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo conectar con el servidor.',
      )
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }

  useEffect(() => {
    void cargarDatos()
  }, [])

  // BUSCADOR
  function filtrar(filas: Fila[]) {
    const busquedaNormalizada = busqueda.trim().toLowerCase()

    if (!busquedaNormalizada) return filas

    return filas.filter((fila) =>
      Object.values(fila).some((valor) =>
        String(valor ?? '')
          .toLowerCase()
          .includes(busquedaNormalizada),
      ),
    )
  }

  const medicosFiltrados = useMemo(
    () => filtrar(datos.medicos),
    [datos.medicos, busqueda],
  )

  const hospitalesFiltrados = useMemo(
    () => filtrar(datos.hospitales),
    [datos.hospitales, busqueda],
  )

  const aseguradorasFiltradas = useMemo(
    () => filtrar(datos.aseguradoras),
    [datos.aseguradoras, busqueda],
  )

  const diagnosticosFiltrados = useMemo(
    () => filtrar(datos.diagnosticos),
    [datos.diagnosticos, busqueda],
  )

  const resumen = datos.resumen

  // TOTAL DE CITAS VISIBLES PARA EL USUARIO AUTENTICADO
  const totalCitas = datos.citas.length

  // PACIENTES ÚNICOS CON AL MENOS UNA CITA ATENDIDA
  const pacientesAtendidos = new Set(
    datos.citas
      .filter(
        (cita) =>
          String(cita.estado ?? '').trim().toLowerCase() === 'atendida',
      )
      .map((cita) => {
        const pacienteRelacionado = cita.paciente as
          | Fila
          | null
          | undefined

        return (
          cita.pacienteId ??
          pacienteRelacionado?.pacienteId
        )
      })
      .filter((id) => id !== null && id !== undefined)
      .map((id) => String(id)),
  ).size

  const consultasMensuales = datos.indicadores.consultas ?? []

  const hospitalizacionesMensuales =
    datos.indicadores.hospitalizaciones ?? []

  const maxConsultas = Math.max(
    1,
    ...consultasMensuales.map((item) =>
      numero(item.totalConsultas),
    ),
  )

  const maxHospitalizaciones = Math.max(
    1,
    ...hospitalizacionesMensuales.map((item) =>
      numero(item.totalHospitalizaciones),
    ),
  )

  const totalFacturado =
    numero(resumen?.totalFacturado) +
    numero(resumen?.totalFacturadoHospitalizaciones)

  return (
    <main className="mx-auto max-w-[1600px] p-5 sm:p-8">
      {/* ENCABEZADO */}
      <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs text-slate-400">
            SISG / Análisis institucional
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#12343B]">
            Centro de Consultas
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Consulta, relaciona y analiza información médica,
            hospitalaria y administrativa del Sistema Integral
            de Salud de Guatemala.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void cargarDatos()}
          disabled={actualizando}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#12343B] transition hover:bg-slate-50 disabled:opacity-50"
        >
          {actualizando
            ? 'Actualizando...'
            : '↻ Actualizar información'}
        </button>
      </section>

      {/* ERROR */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>No se pudo cargar la información.</strong>
          <p className="mt-1">{error}</p>
          <p className="mt-1 text-xs">
            Comprueba que el backend esté ejecutándose en el puerto 3000
            y que tu sesión siga activa.
          </p>
        </div>
      )}

      {/* CARGA */}
      {cargando ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          Cargando información institucional...
        </div>
      ) : (
        <>
          {/* TARJETAS PRINCIPALES */}
          <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              titulo="Citas médicas"
              valor={totalCitas.toLocaleString('es-GT')}
              icono="▤"
            />

            <Indicador
              titulo="Pacientes atendidos"
              valor={pacientesAtendidos.toLocaleString('es-GT')}
              icono="♙"
            />

            <Indicador
              titulo="Hospitalizaciones"
              valor={numero(resumen?.totalHospitalizaciones).toLocaleString('es-GT')}
              icono="✚"
            />

            <Indicador
              titulo="Total facturado"
              valor={moneda(totalFacturado)}
              icono="Q"
            />
          </section>

          {/* NAVEGACIÓN */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {secciones.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSeccion(item.id)
                    setBusqueda('')
                  }}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    seccion === item.id
                      ? 'bg-[#176B69] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-teal-50 hover:text-teal-800'
                  }`}
                >
                  <span className="mr-2">{item.icono}</span>
                  {item.nombre}
                </button>
              ))}
            </div>
          </section>

          {/* BUSCADOR */}
          {seccion !== 'general' && seccion !== 'indicadores' && (
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-[#12343B]">
                Buscar información
              </label>

              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por nombre, código, especialidad..."
                className={inputClass}
              />
            </section>
          )}

          {/* GENERAL */}
          {seccion === 'general' && (
            <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <article className={cardClass}>
                <h2 className="text-lg font-bold text-[#12343B]">
                  Actividad médica
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Resumen de profesionales y establecimientos.
                </p>

                <div className="mt-7 space-y-5">
                  {[
                    {
                      titulo: 'Médicos participantes',
                      valor: numero(resumen?.medicosParticipantes),
                    },
                    {
                      titulo: 'Hospitales participantes',
                      valor: numero(resumen?.hospitalesParticipantes),
                    },
                    {
                      titulo: 'Pacientes atendidos',
                      valor: pacientesAtendidos,
                    },
                    {
                      titulo: 'Citas médicas registradas',
                      valor: totalCitas,
                    },
                  ].map((item) => (
                    <div key={item.titulo}>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          {item.titulo}
                        </span>
                        <strong className="text-[#12343B]">
                          {item.valor}
                        </strong>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-600"
                          style={{
                            width: `${
                              Math.min(
                                100,
                                (item.valor /
                                  Math.max(
                                    1,
                                    totalCitas,
                                  )) *
                                  100,
                              )
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className={cardClass}>
                <h2 className="text-lg font-bold text-[#12343B]">
                  Estado de hospitalizaciones
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Distribución de ingresos hospitalarios.
                </p>

                <div className="mt-7 grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-teal-50 p-5">
                    <p className="text-sm text-teal-800">
                      Hospitalizados
                    </p>
                    <p className="mt-2 text-3xl font-bold text-teal-800">
                      {numero(resumen?.pacientesHospitalizados)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-5">
                    <p className="text-sm text-blue-800">
                      Egresados
                    </p>
                    <p className="mt-2 text-3xl font-bold text-blue-800">
                      {numero(resumen?.pacientesEgresados)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <p className="text-sm text-slate-500">
                    Duración promedio de consultas
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#12343B]">
                    {numero(resumen?.duracionPromedio).toFixed(1)} minutos
                  </p>
                </div>
              </article>

              <article className={`${cardClass} lg:col-span-2`}>
                <h2 className="text-lg font-bold text-[#12343B]">
                  Acceso rápido a los análisis
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Selecciona el área que deseas consultar.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {secciones.slice(1).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSeccion(item.id)}
                      className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-teal-400 hover:bg-teal-50"
                    >
                      <span className="text-xl">{item.icono}</span>
                      <p className="mt-3 text-sm font-semibold text-[#12343B]">
                        {item.nombre}
                      </p>
                      <p className="mt-2 text-xs text-teal-700">
                        Consultar información →
                      </p>
                    </button>
                  ))}
                </div>
              </article>
            </section>
          )}

          {/* MÉDICOS Y PACIENTES */}
          {seccion === 'medicos' && (
            <section className={cardClass}>
              <TituloSeccion
                titulo="Consultas médico-paciente"
                descripcion="Relación de profesionales, pacientes atendidos y facturación."
              />

              <Tabla
                columnas={[
                  ['medico', 'Médico'],
                  ['especialidad', 'Especialidad'],
                  ['pacienteId', 'ID paciente'],
                  ['totalConsultas', 'Consultas'],
                  ['ultimaConsulta', 'Última consulta'],
                  ['montoFacturado', 'Facturación'],
                ]}
                filas={medicosFiltrados}
                formatear={(campo, valor) => {
                  if (campo === 'ultimaConsulta') return fecha(valor)
                  if (campo === 'montoFacturado') return moneda(valor)
                  return texto(valor)
                }}
              />
            </section>
          )}

          {/* HOSPITALES */}
          {seccion === 'hospitales' && (
            <section className={cardClass}>
              <TituloSeccion
                titulo="Análisis de hospitales privados"
                descripcion="Consultas, pacientes, hospitalizaciones y facturación por establecimiento."
              />

              <Tabla
                columnas={[
                  ['hospital', 'Hospital'],
                  ['codigo', 'Código'],
                  ['totalConsultas', 'Consultas'],
                  ['totalPacientes', 'Pacientes'],
                  ['totalHospitalizaciones', 'Hospitalizaciones'],
                  ['pacientesHospitalizados', 'Activos'],
                  ['totalFacturado', 'Facturación'],
                ]}
                filas={hospitalesFiltrados}
                formatear={(campo, valor) => {
                  if (campo === 'totalFacturado') return moneda(valor)
                  if (campo === 'activo') {
                    return numero(valor) === 1 ? 'Activo' : 'Inactivo'
                  }
                  return texto(valor)
                }}
              />
            </section>
          )}

          {/* ASEGURADORAS */}
          {seccion === 'aseguradoras' && (
            <section className={cardClass}>
              <TituloSeccion
                titulo="Análisis de aseguradoras"
                descripcion="Afiliaciones simuladas y facturación registrada en SISG."
              />

              <Tabla
                columnas={[
                  ['nombre', 'Aseguradora'],
                  ['codigo', 'Código'],
                  ['totalHospitalesAfiliados', 'Hospitales afiliados'],
                  ['totalConsultas', 'Consultas'],
                  ['totalHospitalizaciones', 'Hospitalizaciones'],
                  ['montoFacturado', 'Facturación'],
                ]}
                filas={aseguradorasFiltradas}
                formatear={(campo, valor) => {
                  if (campo === 'montoFacturado') return moneda(valor)
                  return texto(valor)
                }}
              />

              <p className="mt-4 text-xs leading-5 text-slate-400">
                Las afiliaciones corresponden al simulador institucional.
                Los montos representan registros agrupados por código
                de aseguradora en SISG.
              </p>
            </section>
          )}

          {/* DIAGNÓSTICOS */}
          {seccion === 'diagnosticos' && (
            <section className={cardClass}>
              <TituloSeccion
                titulo="Catálogo y análisis CIE-10"
                descripcion="Frecuencia de diagnósticos asociados a consultas médicas."
              />

              <Tabla
                columnas={[
                  ['codigo', 'Código CIE-10'],
                  ['descripcion', 'Descripción'],
                  ['categoria', 'Categoría'],
                  ['capitulo', 'Capítulo'],
                  ['totalConsultas', 'Consultas'],
                  ['diagnosticosPrincipales', 'Principales'],
                ]}
                filas={diagnosticosFiltrados}
              />
            </section>
          )}

          {/* INDICADORES */}
          {seccion === 'indicadores' && (
            <section className="space-y-5">
              <article className={cardClass}>
                <TituloSeccion
                  titulo="Consultas médicas por mes"
                  descripcion="Cantidad de consultas registradas en cada período."
                />

                {consultasMensuales.length === 0 ? (
                  <EstadoVacio mensaje="No hay consultas registradas para generar este gráfico." />
                ) : (
                  <div className="space-y-5">
                    {consultasMensuales.map((item, index) => (
                      <div key={`${texto(item.periodo)}-${index}`}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="font-medium text-slate-600">
                            {texto(item.periodo)}
                          </span>
                          <strong className="text-[#12343B]">
                            {numero(item.totalConsultas)} consultas
                          </strong>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-teal-600 transition-all"
                            style={{
                              width: `${
                                (numero(item.totalConsultas) / maxConsultas) *
                                100
                              }%`,
                            }}
                          />
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                          Facturación: {moneda(item.facturacion)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className={cardClass}>
                <TituloSeccion
                  titulo="Hospitalizaciones por mes"
                  descripcion="Ingresos hospitalarios registrados por período."
                />

                {hospitalizacionesMensuales.length === 0 ? (
                  <EstadoVacio mensaje="No hay hospitalizaciones registradas." />
                ) : (
                  <div className="space-y-5">
                    {hospitalizacionesMensuales.map((item, index) => (
                      <div key={`${texto(item.periodo)}-${index}`}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="font-medium text-slate-600">
                            {texto(item.periodo)}
                          </span>
                          <strong className="text-[#12343B]">
                            {numero(item.totalHospitalizaciones)} ingresos
                          </strong>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{
                              width: `${
                                (numero(item.totalHospitalizaciones) /
                                  maxHospitalizaciones) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>
          )}
        </>
      )}

      {/* PRIVACIDAD */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-lg">
            ℹ
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#12343B]">
              Información y privacidad
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Los indicadores se calculan a partir de los registros
              disponibles en SISG. Las afiliaciones de aseguradoras
              corresponden al simulador institucional. Los reportes
              no muestran DPI ni hashes de pacientes.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

// COMPONENTE INDICADOR
function Indicador({
  titulo,
  valor,
  icono,
}: {
  titulo: string
  valor: string
  icono: string
}) {
  return (
    <article className={cardClass}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{titulo}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 font-bold text-teal-700">
          {icono}
        </span>
      </div>

      <h2 className="mt-4 break-words text-2xl font-bold text-[#12343B] sm:text-3xl">
        {valor}
      </h2>

      <p className="mt-1 text-xs text-slate-400">
        Información registrada en SISG
      </p>
    </article>
  )
}

// TÍTULO DE SECCIÓN
function TituloSeccion({
  titulo,
  descripcion,
}: {
  titulo: string
  descripcion: string
}) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-[#12343B]">
        {titulo}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {descripcion}
      </p>
    </div>
  )
}

// ESTADO VACÍO
function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-10 text-center text-sm text-slate-400">
      {mensaje}
    </div>
  )
}

// TABLA REUTILIZABLE
function Tabla({
  columnas,
  filas,
  formatear,
}: {
  columnas: [string, string][]
  filas: Fila[]
  formatear?: (campo: string, valor: unknown) => string
}) {
  if (filas.length === 0) {
    return (
      <EstadoVacio mensaje="No hay registros disponibles para esta consulta." />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full min-w-[750px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {columnas.map(([campo, titulo]) => (
              <th key={campo} className="px-4 py-4 font-semibold">
                {titulo}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {filas.map((fila, indice) => (
            <tr
              key={indice}
              className="transition hover:bg-teal-50/40"
            >
              {columnas.map(([campo]) => {
                const valor = fila[campo]

                return (
                  <td
                    key={campo}
                    className="px-4 py-4 text-slate-600"
                  >
                    {formatear
                      ? formatear(campo, valor)
                      : texto(valor)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
