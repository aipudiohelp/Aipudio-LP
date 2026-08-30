import './globals.css'

export const metadata = {
  title: 'منصة صفحات الهبوط السريعة',
  description: 'أنشئ صفحة هبوط لخدمتك أو منتجك واربطها مباشرة بواتساب',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
