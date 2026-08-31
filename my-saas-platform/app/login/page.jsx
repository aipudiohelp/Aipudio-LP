'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [mode, setMode] = useState('signup') // 'signup' أو 'login'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // كشف المتصفح الداخلي لتطبيقي إنستجرام وفيسبوك
    const ua = navigator.userAgent || navigator.vendor || window.opera
    if (/Instagram|FBAN|FBAV/i.test(ua)) {
      setIsInAppBrowser(true)
    }

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/dashboard')
    }
    checkSession()
  }, [router])

  // 1. معالجة التسجيل والدخول عبر البريد وكلمة المرور
  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    if (password.length < 6) {
      setErrorMsg('كلمة المرور يجب ألا تقل عن 6 أحرف.')
      setLoading(false)
      return
    }

    const cleanEmail = email.trim().toLowerCase()

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
        })

        if (error) throw error

        if (data?.user) {
          // حساب مدة التجربة المجانية (3 أيام)
          const now = new Date()
          const trialEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

          // تسجيل الحساب في جدول profiles ليظهر في لوحة الإدارة
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: cleanEmail,
            role: 'user',
            plan_type: 'trial',
            is_active: true,
            subscription_end: trialEnd.toISOString(),
            max_pages: 1,
            created_at: new Date().toISOString(),
          })

          // إطلاق حدث اكتمال التسجيل لفيسبوك بكسل
          if (typeof window !== 'undefined' && window.fbq) {
            window.fbq('track', 'CompleteRegistration')
          }
        }

        router.push('/dashboard')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        })

        if (error) throw error
        router.push('/dashboard')
      }
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setErrorMsg('هذا البريد مسجل بالفعل، يرجى التبديل لتسجيل الدخول.')
      } else if (err.message?.includes('Invalid login credentials')) {
        setErrorMsg('البريد الإلكتروني أو كلمة المرور غير صحيحة.')
      } else {
        setErrorMsg(err.message || 'حدث خطأ أثناء العملية، يرجى المحاولة مرة أخرى.')
      }
    } finally {
      setLoading(false)
    }
  }

  // 2. تسجيل الدخول عبر حساب Google
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

      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 text-center relative z-10 space-y-5">
        
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

        {/* تنبيه ذكي خاص بمتصفح إنستجرام وفيسبوك */}
        {isInAppBrowser && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-2xl text-[11px] font-bold text-right flex items-center gap-2">
            <span>💡</span>
            <span>للتسجيل السريع بحساب جوجل: اضغط على (⋮) بالأعلى واختر <strong>فتح في المتصفح / Open in Chrome</strong>.</span>
          </div>
        )}

        {/* تبديل بين إنشاء حساب وتسجيل الدخول */}
        <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-xl transition ${mode === 'signup' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            حساب جديد (3 أيام مجاناً) ⚡
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-xl transition ${mode === 'login' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            تسجيل الدخول
          </button>
        </div>

        {/* رسائل التنبيه والخطأ */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {/* نموذج التسجيل المباشر بالبريد وكلمة المرور */}
        <form onSubmit={handleEmailAuth} className="space-y-3 text-right text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">البريد الإلكتروني:</label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-mono text-left dir-ltr transition"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">كلمة المرور:</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-mono text-left dir-ltr transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-extrabold rounded-2xl shadow-lg shadow-purple-500/20 transition active:scale-[0.99] disabled:opacity-60 text-xs sm:text-sm"
          >
            {loading ? 'جاري المعالجة...' : mode === 'signup' ? 'إنشاء الحساب وبدء التجربة فوراً 🚀' : 'دخول إلى لوحة التحكم ⚡'}
          </button>
        </form>

        {/* فاصل */}
        <div className="flex items-center gap-3">
          <div className="h-[1px] bg-slate-200 flex-1"></div>
          <span className="text-[11px] text-slate-400 font-bold">أو</span>
          <div className="h-[1px] bg-slate-200 flex-1"></div>
        </div>

        {/* زر تسجيل الدخول بواسطة Google */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold border-2 border-slate-200 hover:border-purple-300 rounded-2xl transition shadow-xs flex items-center justify-center gap-3 text-xs group disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span>{loading ? 'جاري التحويل...' : 'المتابعة عبر حساب Google'}</span>
          </button>

          <Link
            href="/"
            className="block text-xs text-slate-400 hover:text-slate-600 font-semibold transition pt-1"
          >
            ← العودة للصفحة الرئيسية
          </Link>
        </div>

        {/* المزايا السريعة أسفل الكارت */}
        <div className="pt-3 border-t border-slate-100 flex justify-center items-center gap-4 text-[11px] text-slate-400 font-bold">
          <span>🔒 تسجيل آمن ومباشر</span>
          <span>⚡ تفعيل فوري للحساب</span>
        </div>

      </div>
    </div>
  )
          }
    
