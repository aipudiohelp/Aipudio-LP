'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/dashboard')
    }
    checkSession()
  }, [router])

  const handleGoogleLogin = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })
      if (error) throw error
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تسجيل الدخول')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* خلفية جمالية بتوهج ناعم متناسق مع الشعار */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-purple-400/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 text-center relative z-10 space-y-6">
        {/* الشعار المطور */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 relative rounded-2xl overflow-hidden bg-slate-950 p-2 border border-purple-400/30 shadow-lg shadow-purple-500/20 flex items-center justify-center">
            <img src="/logo.png" alt="Aipudio Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              Aipudio-LP
            </span>
            <span className="block text-[11px] text-slate-400 font-semibold tracking-wider">
              منصة صفحات الهبوط الذكية
            </span>
          </div>
        </div>

        {/* نصوص الترحيب */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-black text-slate-900">
            تسجيل الدخول / حساب جديد
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            سجّل دخولك بضغطة واحدة وابدأ فترتك التجريبية المجانية (3 أيام)
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {/* زر تسجيل الدخول بواسطة Google */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold border-2 border-slate-200 hover:border-purple-300 rounded-2xl transition shadow-sm flex items-center justify-center gap-3 text-xs sm:text-sm group disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'جاري التحويل الآمن...' : 'المتابعة عبر حساب Google'}</span>
          </button>

          <Link
            href="/"
            className="block text-xs text-slate-400 hover:text-slate-600 font-semibold transition pt-1"
          >
            ← العودة للصفحة الرئيسية
          </Link>
        </div>

        {/* المزايا السريعة أسفل الكارت */}
        <div className="pt-4 border-t border-slate-100 flex justify-center items-center gap-4 text-[11px] text-slate-400 font-bold">
          <span>🔒 تسجيل آمن ومباشر</span>
          <span>⚡ تفعيل فوري للحساب</span>
        </div>
      </div>
    </div>
  )
}
