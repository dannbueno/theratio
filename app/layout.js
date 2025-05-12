import './globals.css'

export const metadata = {
  title: 'TheRatio by Dan Bueno',
  description: 'Calcula automáticamente la proporción de desnivel/distancia para tus actividades de carrera por montaña',
  openGraph: {
    title: 'TheRatio by Dan Bueno',
    description: 'Calcula automáticamente la proporción de desnivel/distancia para tus actividades de carrera por montaña',
    url: 'https://theratio.vercel.app',
    siteName: 'TheRatio',
    images: [
      {
        url: 'https://theratio.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TheRatio - Ratio desnivel/distancia para Strava',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TheRatio by Dan Bueno',
    description: 'Calcula automáticamente la proporción de desnivel/distancia para tus actividades de carrera por montaña',
    images: ['https://theratio.vercel.app/og-image.png'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-neutral-900 text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
