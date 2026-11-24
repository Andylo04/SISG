
import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex min-h-[72px] flex-wrap items-center justify-between gap-4 py-3">

        {/* Identidad SISG */}
        <Link
          to="/"
          className="flex items-center gap-3 no-underline"
        >
          <img
            src="/images/sisg-logo.png"
            alt="SISG Guatemala"
            className="h-12 w-auto object-contain"
          />

          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-[var(--sea-ink)]">
              SISG
            </span>
            <span className="text-xs font-medium tracking-wider text-[var(--sea-ink-soft)]">
              SISTEMA DE SALUD
            </span>
          </div>
        </Link>

        {/* Navegación */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Dashboard
          </Link>

          <Link
            to="/medicos"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Médicos
          </Link>

          <Link
            to="/hospitales"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Hospitales
          </Link>

          <Link
            to="/pacientes"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Pacientes
          </Link>

          <Link
            to="/citas"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Citas
          </Link>
        </div>

        {/* Tema */}
        <div className="flex items-center">
          <ThemeToggle />
        </div>

      </nav>
    </header>
  )
}
