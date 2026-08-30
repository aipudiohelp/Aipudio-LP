import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-white to-slate-100">
      <div className="max-w-2xl bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-100">
        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full mb-4 inline-block">
          ⚡ المبيعات والحجوزات عبر واتساب مباشرة
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-tight mb-4">
          أنشئ صفحة هبوط نشاطك في دقيقة واحدة
        </h1>
        <p className="text-slate-600 text-base sm:text-lg mb-8 leading-relaxed">
          للأطباء، المدرسين، الصالونات، والمتاجر الإلكترونية. استقبل طلبات الشراء والحجوزات مباشرة على رقم واتساب الخاص بك.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/20"
          >
            تسجيل الدخول / إنشاء حساب
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition"
          >
            لوحة التحكم
          </Link>
        </div>
      </div>
    </main>
  )
}
