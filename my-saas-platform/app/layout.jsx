import Script from 'next/script'
import './globals.css'

export const metadata = {
  title: 'Aipudio-LP | أسرع نظام لروابط البيع والحجز المباشر',
  description: 'حوّل زوار إعلاناتك إلى مبيعات وحجوزات مؤكدة على الواتساب في 60 ثانية بدون أي خبرة برمجية.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* كود تتبع Microsoft Clarity لتحليل الزيارات والتسجيلات بالفيديو */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "yare77tsej");
          `}
        </Script>
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
