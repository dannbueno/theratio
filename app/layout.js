import './globals.css'

export const metadata = {
  title: 'TheRatio - Ratio elevación/distancia para Strava',
  description: 'Calcula automáticamente la proporción de elevación/distancia para tus actividades de trail running en Strava',
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
