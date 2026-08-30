'use client'
import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-purple-500 selection:text-white relative overflow-hidden">
      {/* خلفية جمالية بتوهج ناعم مستوحى من ألوان الشعار */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-400/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* الهيدر العلوي */}
      <header className="max-w-5xl mx-auto w-full p-5 sm:p-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative rounded-2xl overflow-hidden shadow-md shadow-purple-500/20 bg-slate-900 flex items-center justify-center p-1 border border-purple-500/30">
            <img src="/logo.png" alt="Aipudio Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              Aipudio-LP
            </span>
            <span className="block text-[10px] text-slate-400 font-semibold -mt-1 tracking-wider uppercase">
              Smart Landing Pages
            </span>
          </div>
        </div>

        <Link
          href="/login"
          className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-purple-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-sm"
        >
          تسجيل الدخول
        </Link>
      </header>

      {/* القسم الرئيسي (Hero Section) */}
      <main className="max-w-3xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col items-center text-center relative z-10 space-y-6">
        {/* الشعار الرئيسي ثلاثي الأبعاد */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
          <div className="w-24 h-24 sm:w-28 sm:h-28 relative rounded-3xl overflow-hidden bg-slate-950 p-2 border border-purple-400/30 shadow-2xl flex items-center justify-center">
            <img src="/logo.png" alt="Aipudio" className="w-full h-full object-contain transform group-hover:scale-105 transition duration-300" />
          </div>
        </div>

        {/* الشارة الترويجية */}
        <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-800 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
          <span className="text-cyan-600 font-black">⚡</span>
          <span>منصة صفحات الهبوط الأسرع في مصر والشرق الأوسط</span>
        </div>

        {/* العنوان الرئيسي والوصف */}
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
            حوّل زوار إعلاناتك إلى{' '}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              مبيعات وحجوزات مؤكدة
            </span>{' '}
            على الواتساب
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            في 60 ثانية وبدون أي خبرة برمجية.. أنشئ صفحة فائقة السرعة لبيع منتجك، أو تنظيم حجوزات عيادتك ومجموعاتك التعليمية بضغطة زر واحدة.
          </p>
        </div>

        {/* بطاقات التخصصات الثلاثة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-2xl text-right pt-2">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-purple-300 transition space-y-1">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-base mb-2">
              📦
            </div>
            <h3 className="font-bold text-xs text-slate-900">متاجر ودروب شيبينغ</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              صفحة منتج سريع وشراء بضغطة زر بدون سلات متروكة.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-300 transition space-y-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-base mb-2">
              👨‍🏫
            </div>
            <h3 className="font-bold text-xs text-slate-900">مدرسين وسناتر</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              تنظيم حجز الدفعات وتصفية بيانات الطلاب والفروع بدقة.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-cyan-300 transition space-y-1">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center text-base mb-2">
              🩺
            </div>
            <h3 className="font-bold text-xs text-slate-900">عيادات وصالونات</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              حجز المواعيد واختيار الأوقات وتأكيد فوري عبر واتساب.
            </p>
          </div>
        </div>

        {/* أزرار الإجراء */}
        <div className="w-full max-w-md space-y-3 pt-4">
          <Link
            href="/login"
            className="w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white font-extrabold rounded-2xl shadow-xl shadow-purple-500/25 transition flex items-center justify-center gap-2 text-base transform active:scale-95"
          >
            <span>ابدأ تجربتك المجانية الآن (3 أيام) 🚀</span>
          </Link>

          <Link
            href="/dashboard"
            className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-2xl transition flex items-center justify-center text-xs shadow-sm"
          >
            <span>لوحة التحكم للأنشطة المشتركة</span>
          </Link>
        </div>

        {/* مميزات سريعة أسفل الزر */}
        <div className="flex flex-wrap justify-center items-center gap-4 text-[11px] font-bold text-slate-500 pt-2">
          <span>✓ تتبع إعلاني دقيق (Pixels)</span>
          <span>✓ تفعيل فوري بدون بطاقة بنكية</span>
          <span>✓ 0% عمولة على المبيعات</span>
        </div>
      </main>

      {/* الفوتر */}
      <footer className="max-w-5xl mx-auto w-full p-6 text-center text-xs text-slate-400 border-t border-slate-200/60 relative z-10">
        <p>© 2026 Aipudio-LP. جميع الحقوق محفوظة لمنصة Aipudio للحلول الرقمية والذكاء الاصطناعي.</p>
      </footer>
    </div>
  )
}
