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

        {/* كود تتبع Meta Pixel الأساسي للإعلانات */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '26761924540141738');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=26761924540141738&ev=PageView&noscript=1"
            alt="facebook-pixel"
          />
        </noscript>
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
