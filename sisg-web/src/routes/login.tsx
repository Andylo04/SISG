
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { login } from '../lib/auth.js';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();

    setError('');
    setCargando(true);

    try {
      await login(email, password);

      await navigate({ to: '/' });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al iniciar sesión',
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-4xl text-teal-700">
            ✚
          </div>

          <h1 className="text-2xl font-bold text-[#12343B]">
            SISG
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sistema de Información de Salud de Guatemala
          </p>
        </div>

        <form onSubmit={iniciarSesion} className="space-y-5">

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Correo electrónico
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@correo.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Contraseña
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl bg-[#176B69] py-3 font-semibold text-white transition hover:bg-[#12343B] disabled:opacity-50"
          >
            {cargando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>

        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          SISG · Plataforma de gestión sanitaria
        </p>

      </section>
    </main>
  );
}
