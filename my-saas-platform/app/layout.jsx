import './globals.css'

export const metadata = {
  title: 'Aipudio-LP | أسرع نظام لروابط البيع والحجز المباشر',
  description: 'أنشئ رابطاً فائق السرعة لبيع منتجك أو استقبال حجوزات عيادتك ومجموعاتك التعليمية مباشرة على واتساب في 60 ثانية.',
  openGraph: {
    title: 'Aipudio-LP | أسرع نظام لروابط البيع والحجز المباشر',
    description: 'أنشئ رابطاً فائق السرعة لبيع منتجك أو استقبال حجوزات عيادتك ومجموعاتك التعليمية مباشرة على واتساب في 60 ثانية.',
    url: 'https://my-saas-platform-iota.vercel.app',
    siteName: 'Aipudio-LP',
    images: [
      {
        url: '/cover.png',
        width: 1200,
        height: 630,
        alt: 'Aipudio-LP Cover',
      },
    ],
    locale: 'ar_EG',
    type: 'website',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body className="antialiased bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  )
}
