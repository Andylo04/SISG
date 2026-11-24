
import {
  HeadContent,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'

import SisgLayout from '../components/SisgLayout'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'SISG Guatemala | Sistema de Salud',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const esLogin = pathname === '/login'

  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>

      <body className="font-sans antialiased">
        {esLogin ? (
          children
        ) : (
          <SisgLayout>
            {children}
          </SisgLayout>
        )}

        <Scripts />
      </body>
    </html>
  )
}
