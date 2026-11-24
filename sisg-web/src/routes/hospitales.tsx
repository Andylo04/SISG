
import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { FormEvent, ReactNode } from 'react'
import { fetchAutenticado, logout } from '../lib/auth.js'

export const Route = createFileRoute('/hospitales')({
  component: HospitalesPage,
})

const POR_PAGINA = 8

interface Municipio {
  municipioId: number
  departamentoId: number
  nombre: string
}

interface Hospital {
  hospitalId: number
  codigoEstablecimiento: string
  nombre: string
  nit: string | null
  tipoHospital: string | null
  numCamas: number | null
  municipioId: number | null
  municipio?: Municipio | null
  direccion: string | null
  telefono: string | null
  activo: boolean
  fechaRegistro: string | null
}

const formularioInicial = {
  codigoEstablecimiento: '',
  nombre: '',
  nit: '',
  tipoHospital: '',
  numCamas: '',
  municipioId: '',
  direccion: '',
  telefono: '',
}

function HospitalesPage() {
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [procesandoId, setProcesandoId] = useState<number | null>(null)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [pagina, setPagina] = useState(1)

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [formulario, setFormulario] = useState(formularioInicial)

  // ==========================================
  // CARGAR HOSPITALES Y MUNICIPIOS
  // ==========================================

  async function cargarDatos() {
    try {
      setCargando(true)
      setError('')

      const [hospitalesRes, municipiosRes] = await Promise.all([
        fetchAutenticado('/hospitales'),
        fetchAutenticado('/municipios'),
      ])

      if (
        hospitalesRes.status === 401 ||
        municipiosRes.status === 401
      ) {
        logout()
        return
      }

      if (
        !hospitalesRes.ok ||
        !municipiosRes.ok
      ) {
        throw new Error(
          `Error al consultar la API. Hospitales: ${hospitalesRes.status}; Municipios: ${municipiosRes.status}.`,
        )
      }

      const hospitalesData: Hospital[] = await hospitalesRes.json()
      const municipiosData: Municipio[] = await municipiosRes.json()

      if (
        !Array.isArray(hospitalesData) ||
        !Array.isArray(municipiosData)
      ) {
        throw new Error(
          'La API no devolvió listas válidas de hospitales y municipios.',
        )
      }

      setHospitales(hospitalesData)
      setMunicipios(municipiosData)

    } catch (err) {
      console.error('Error cargando hospitales:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible conectar con SISG API.',
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarDatos()
  }, [])

  // ==========================================
  // INDICADORES
  // ==========================================

  const hospitalesActivos = hospitales.filter(
    (hospital) => hospital.activo,
  ).length

  const hospitalesInactivos = hospitales.filter(
    (hospital) => !hospital.activo,
  ).length

  // ==========================================
  // BÚSQUEDA Y FILTROS
  // ==========================================

  const hospitalesFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()

    return hospitales.filter((hospital) => {
      const coincideBusqueda = [
        hospital.codigoEstablecimiento,
        hospital.nombre,
        hospital.tipoHospital ?? '',
        hospital.telefono ?? '',
        hospital.municipio?.nombre ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(texto)

      const coincideEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && hospital.activo) ||
        (filtroEstado === 'inactivos' && !hospital.activo)

      return coincideBusqueda && coincideEstado
    })
  }, [hospitales, busqueda, filtroEstado])

  const totalPaginas = Math.max(
    1,
    Math.ceil(hospitalesFiltrados.length / POR_PAGINA),
  )

  const hospitalesPagina = hospitalesFiltrados.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA,
  )

  useEffect(() => {
    setPagina(1)
  }, [busqueda, filtroEstado])

  // ==========================================
  // FORMULARIO
  // ==========================================

  function actualizarCampo(
    campo: keyof typeof formulario,
    valor: string,
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setFormulario({ ...formularioInicial })
    setError('')
    setMensaje('')
    setMostrarFormulario(true)
  }

  function abrirEdicion(hospital: Hospital) {
    setEditandoId(hospital.hospitalId)

    setFormulario({
      codigoEstablecimiento: hospital.codigoEstablecimiento,
      nombre: hospital.nombre,
      nit: hospital.nit ?? '',
      tipoHospital: hospital.tipoHospital ?? '',
      numCamas: hospital.numCamas?.toString() ?? '',
      municipioId: hospital.municipioId?.toString() ?? '',
      direccion: hospital.direccion ?? '',
      telefono: hospital.telefono ?? '',
    })

    setError('')
    setMensaje('')
    setMostrarFormulario(true)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function cerrarFormulario() {
    setMostrarFormulario(false)
    setEditandoId(null)
    setFormulario({ ...formularioInicial })
  }

  // ==========================================
  // REGISTRAR Y ACTUALIZAR HOSPITAL
  // ==========================================

  async function guardarHospital(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault()
    setError('')
    setMensaje('')

    const datos = {
      codigoEstablecimiento:
        formulario.codigoEstablecimiento.trim(),
      nombre: formulario.nombre.trim(),
      nit: formulario.nit.trim() || null,
      tipoHospital: formulario.tipoHospital || null,
      numCamas: formulario.numCamas
        ? Number(formulario.numCamas)
        : null,
      municipioId: formulario.municipioId
        ? Number(formulario.municipioId)
        : null,
      direccion: formulario.direccion.trim() || null,
      telefono: formulario.telefono.trim() || null,
    }

    try {
      setGuardando(true)

      const response = await fetchAutenticado(
        editandoId
          ? `/hospitales/${editandoId}`
          : '/hospitales',
        {
          method: editandoId ? 'PATCH' : 'POST',
          body: JSON.stringify(datos),
        },
      )

      if (response.status === 401) {
        logout()
        return
      }

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            'Tu usuario no tiene permisos para guardar hospitales.',
          )
        }

        if (response.status === 409) {
          throw new Error(
            'El código de establecimiento ya existe.',
          )
        }

        throw new Error(
          `No se pudo guardar el hospital. Código: ${response.status}.`,
        )
      }

      setMensaje(
        editandoId
          ? 'Hospital actualizado correctamente.'
          : 'Hospital registrado correctamente.',
      )

      cerrarFormulario()
      await cargarDatos()

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar.',
      )
    } finally {
      setGuardando(false)
    }
  }

  // ==========================================
  // DESACTIVAR HOSPITAL
  // ==========================================

  async function desactivarHospital(hospital: Hospital) {
    const confirmar = window.confirm(
      `¿Deseas desactivar el hospital "${hospital.nombre}"?`,
    )

    if (!confirmar) return

    setProcesandoId(hospital.hospitalId)
    setError('')
    setMensaje('')

    try {
      const response = await fetchAutenticado(
        `/hospitales/${hospital.hospitalId}`,
        {
          method: 'DELETE',
        },
      )

      if (response.status === 401) {
        logout()
        return
      }

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            'Tu usuario no tiene permisos para desactivar hospitales.',
          )
        }

        throw new Error(
          `No se pudo desactivar el hospital. Código: ${response.status}.`,
        )
      }

      setMensaje('Hospital desactivado correctamente.')
      await cargarDatos()

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al desactivar.',
      )
    } finally {
      setProcesandoId(null)
    }
  }

  // ==========================================
  // REACTIVAR HOSPITAL
  // ==========================================

  async function reactivarHospital(hospital: Hospital) {
    const confirmar = window.confirm(
      `¿Deseas reactivar el hospital "${hospital.nombre}"?`,
    )

    if (!confirmar) return

    setProcesandoId(hospital.hospitalId)
    setError('')
    setMensaje('')

    try {
      const response = await fetchAutenticado(
        `/hospitales/${hospital.hospitalId}/activar`,
        {
          method: 'PUT',
        },
      )

      if (response.status === 401) {
        logout()
        return
      }

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            'Tu usuario no tiene permisos para reactivar hospitales.',
          )
        }

        throw new Error(
          `No se pudo reactivar el hospital. Código: ${response.status}.`,
        )
      }

      setMensaje('Hospital reactivado correctamente.')
      await cargarDatos()

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al reactivar.',
      )
    } finally {
      setProcesandoId(null)
    }
  }

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="mx-auto max-w-[1600px] p-5 sm:p-8">

      {/* TITULO */}

      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs text-slate-400">
            SISG / Gestión de establecimientos
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#12343B]">
            Gestión de hospitales
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Consulta y administra los establecimientos de salud registrados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="w-fit rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
            {hospitales.length} hospitales registrados
          </span>

          <button
            type="button"
            onClick={() => void cargarDatos()}
            disabled={cargando}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#12343B] transition hover:bg-teal-50 disabled:opacity-50"
          >
            ↻ Actualizar
          </button>

          <button
            type="button"
            onClick={abrirNuevo}
            className="rounded-xl bg-[#176B69] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#125653]"
          >
            + Nuevo hospital
          </button>
        </div>
      </div>

      {/* INDICADORES */}

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total de hospitales
          </p>

          <h2 className="mt-3 text-3xl font-bold text-[#12343B]">
            {cargando ? '...' : hospitales.length}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Hospitales activos
          </p>

          <h2 className="mt-3 text-3xl font-bold text-green-600">
            {cargando ? '...' : hospitalesActivos}
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Hospitales inactivos
          </p>

          <h2 className="mt-3 text-3xl font-bold text-red-500">
            {cargando ? '...' : hospitalesInactivos}
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

      {mostrarFormulario && (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-[#12343B]">
                {editandoId
                  ? 'Editar hospital'
                  : 'Registrar hospital'}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {editandoId
                  ? 'Actualiza la información del establecimiento.'
                  : 'Completa los datos para registrar un nuevo hospital.'}
              </p>
            </div>

            <button
              type="button"
              onClick={cerrarFormulario}
              className="w-fit rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={guardarHospital}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

              <FormField label="Código de establecimiento *">
                <input
                  required
                  maxLength={20}
                  value={formulario.codigoEstablecimiento}
                  onChange={(e) =>
                    actualizarCampo(
                      'codigoEstablecimiento',
                      e.target.value,
                    )
                  }
                  placeholder="Ej. HOSP-001"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Nombre del hospital *">
                <input
                  required
                  maxLength={150}
                  value={formulario.nombre}
                  onChange={(e) =>
                    actualizarCampo('nombre', e.target.value)
                  }
                  placeholder="Nombre del hospital"
                  className={inputClass}
                />
              </FormField>

              <FormField label="NIT">
                <input
                  maxLength={15}
                  value={formulario.nit}
                  onChange={(e) =>
                    actualizarCampo('nit', e.target.value)
                  }
                  placeholder="Número de NIT"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Tipo de hospital">
                <select
                  value={formulario.tipoHospital}
                  onChange={(e) =>
                    actualizarCampo('tipoHospital', e.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="General">General</option>
                  <option value="Especializado">Especializado</option>
                  <option value="Materno">Materno</option>
                  <option value="Pediatrico">Pediátrico</option>
                  <option value="Otro">Otro</option>
                </select>
              </FormField>

              <FormField label="Número de camas">
                <input
                  type="number"
                  min="0"
                  value={formulario.numCamas}
                  onChange={(e) =>
                    actualizarCampo('numCamas', e.target.value)
                  }
                  placeholder="Ej. 50"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Municipio">
                <select
                  value={formulario.municipioId}
                  onChange={(e) =>
                    actualizarCampo('municipioId', e.target.value)
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
              </FormField>

              <FormField label="Dirección">
                <input
                  maxLength={200}
                  value={formulario.direccion}
                  onChange={(e) =>
                    actualizarCampo('direccion', e.target.value)
                  }
                  placeholder="Dirección del establecimiento"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Teléfono">
                <input
                  maxLength={20}
                  value={formulario.telefono}
                  onChange={(e) =>
                    actualizarCampo('telefono', e.target.value)
                  }
                  placeholder="Número de teléfono"
                  className={inputClass}
                />
              </FormField>
            </div>

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
                    : 'Registrar hospital'}
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormulario({ ...formularioInicial })
                }
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
            Directorio de hospitales
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Información de los establecimientos registrados en SISG.
          </p>
        </div>

        {/* BUSCADOR */}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setPagina(1)
            }}
            placeholder="Buscar por nombre, código o municipio..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />

          <select
            value={filtroEstado}
            onChange={(e) => {
              setFiltroEstado(e.target.value)
              setPagina(1)
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 sm:w-52"
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>

        {cargando ? (
          <p className="py-10 text-center text-slate-500">
            Cargando hospitales...
          </p>
        ) : error ? (
          <p className="py-10 text-center text-red-600">
            {error}
          </p>
        ) : hospitalesFiltrados.length === 0 ? (
          <p className="py-10 text-center text-slate-500">
            No se encontraron hospitales.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">

              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="px-4 py-4">Código</th>
                  <th className="px-4 py-4">Hospital</th>
                  <th className="px-4 py-4">Municipio</th>
                  <th className="px-4 py-4">Tipo</th>
                  <th className="px-4 py-4">Camas</th>
                  <th className="px-4 py-4">Estado</th>
                  <th className="px-4 py-4 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {hospitalesPagina.map((hospital) => (
                  <tr
                    key={hospital.hospitalId}
                    className="border-b border-slate-100 transition hover:bg-teal-50/40"
                  >
                    <td className="px-4 py-4 font-medium text-slate-600">
                      {hospital.codigoEstablecimiento}
                    </td>

                    <td className="px-4 py-4 font-semibold text-[#12343B]">
                      {hospital.nombre}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {hospital.municipio?.nombre || 'No asignado'}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {hospital.tipoHospital || 'No especificado'}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {hospital.numCamas ?? '—'}
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge activo={hospital.activo} />
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEdicion(hospital)}
                          className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
                        >
                          Editar
                        </button>

                        {hospital.activo ? (
                          <button
                            type="button"
                            disabled={
                              procesandoId === hospital.hospitalId
                            }
                            onClick={() =>
                              void desactivarHospital(hospital)
                            }
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            {procesandoId === hospital.hospitalId
                              ? 'Procesando...'
                              : 'Desactivar'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              procesandoId === hospital.hospitalId
                            }
                            onClick={() =>
                              void reactivarHospital(hospital)
                            }
                            className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                          >
                            {procesandoId === hospital.hospitalId
                              ? 'Procesando...'
                              : 'Reactivar'}
                          </button>
                        )}
                      </div>
                    </td>
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
            {hospitalesFiltrados.length === 0
              ? 0
              : (pagina - 1) * POR_PAGINA + 1}
            {' - '}
            {Math.min(
              pagina * POR_PAGINA,
              hospitalesFiltrados.length,
            )}
            {' de '}
            {hospitalesFiltrados.length} hospitales.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagina === 1}
              onClick={() =>
                setPagina((actual) => Math.max(1, actual - 1))
              }
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
              onClick={() =>
                setPagina((actual) =>
                  Math.min(totalPaginas, actual + 1),
                )
              }
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>

        <p className="mt-5 text-xs text-slate-400">
          Mostrando {hospitalesFiltrados.length} de {hospitales.length} hospitales.
        </p>
      </section>
    </div>
  )
}

// ==========================================
// COMPONENTE DE CAMPOS
// ==========================================

function FormField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#12343B]">
        {label}
      </span>
      {children}
    </label>
  )
}

// ==========================================
// ESTADO DEL HOSPITAL
// ==========================================

function StatusBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        activo
          ? 'bg-green-50 text-green-700'
          : 'bg-red-50 text-red-700'
      }`}
    >
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  )
}

// ==========================================
// ESTILOS DE INPUTS
// ==========================================

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100'
