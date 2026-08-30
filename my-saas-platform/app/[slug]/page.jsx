'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Script from 'next/script'

export default function DynamicLandingPage() {
  const params = useParams()
  const rawSlug = params?.slug ? (Array.isArray(params.slug) ? params.slug[0] : params.slug) : ''

  const [pageData, setPageData] = useState(null)
  const [loading, setLoading] = useState(true)

  // عداد تنازلي تفاعلي
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 35, seconds: 20 })

  // بيانات النموذج
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [extraField, setExtraField] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 }
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        return { hours: 3, minutes: 45, seconds: 0 }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let isMounted = true
    async function fetchPage() {
      if (!rawSlug) {
        if (isMounted) setLoading(false)
        return
      }

      try {
        let cleanSlug = rawSlug
        try {
          cleanSlug = decodeURIComponent(rawSlug).toLowerCase().trim()
        } catch (e) {
          cleanSlug = rawSlug.toLowerCase().trim()
        }

        const { data } = await supabase
          .from('landing_pages')
          .select('*')
          .ilike('slug', cleanSlug)
          .eq('is_published', true)
          .maybeSingle()

        if (isMounted) {
          setPageData(data || null)
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setPageData(null)
          setLoading(false)
        }
      }
    }
    fetchPage()
    return () => { isMounted = false }
  }, [rawSlug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold">
        جاري تحميل العرض الخاص...
      </div>
    )
  }

  if (!pageData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">العرض غير متوفر أو انتهت صلاحيته</h1>
        <p className="text-slate-500 text-sm">تأكد من الرابط أو تواصل مع إدارة المتجر.</p>
      </div>
    )
  }

  const rawPrice = parseFloat(pageData.product_price) || 350
  const originalPrice = Math.round(rawPrice * 1.55)

  const handleSubmit = (e) => {
    e.preventDefault()

    let messageText = ''
    if (pageData.template_type === 'product') {
      messageText = `🔥 *طلب شراء جديد (عرض خاص)*\n` +
        `🏪 *المتجر:* ${pageData.business_name}\n` +
        `📦 *المنتج:* ${pageData.headline}\n` +
        `🔢 *الكمية:* ${quantity}\n` +
        `💰 *إجمالي السعر:* ${rawPrice * quantity} ج.م\n` +
        `👤 *الاسم:* ${name}\n` +
        `📞 *الهاتف:* ${phone}\n` +
        `📍 *العنوان:* ${extraField}\n` +
        (notes ? `📝 *ملاحظات:* ${notes}\n` : '')
    } else {
      messageText = `🎯 *طلب حجز مؤكد*\n` +
        `👨‍🏫 *الجهة:* ${pageData.business_name}\n` +
        `📚 *الخدمة/المادة:* ${pageData.headline}\n` +
        `👤 *اسم المشترك/الطالب:* ${name}\n` +
        `📞 *رقم الهاتف:* ${phone}\n` +
        `🗓️ *المجموعة / الموعد:* ${extraField}\n` +
        (notes ? `📝 *ملاحظات:* ${notes}\n` : '')
    }

    const cleanPhone = (pageData.whatsapp_number || '').replace(/\D/g, '')
    window.location.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-24">
      {pageData.meta_pixel_id && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${pageData.meta_pixel_id}');fbq('track', 'PageView');
            `
          }}
        />
      )}

      {/* شريط الإعلان العلوي العاجل */}
      <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs sm:text-sm font-bold py-2 px-4 text-center sticky top-0 z-40 shadow flex items-center justify-center gap-2">
        <span>⚡ عرض حصري ولفترة محدودة - ينتهي خلال:</span>
        <span className="bg-black/30 px-2 py-0.5 rounded dir-ltr font-mono">
          {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>

      <div className="max-w-xl mx-auto bg-white shadow-xl min-h-screen">
        {/* صورة المنتج أو الغلاف */}
        {pageData.product_image_url && (
          <div className="relative w-full aspect-square bg-slate-200 overflow-hidden">
            <img
              src={pageData.product_image_url}
              alt={pageData.headline}
              className="w-full h-full object-cover"
            />
            <span className="absolute top-4 right-4 bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
              خصم 35% اليوم
            </span>
          </div>
        )}

        <div className="p-5 sm:p-7 space-y-6">
          {/* قسم العناوين والتقييم */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                {pageData.business_name}
              </span>
              <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                <span>⭐⭐⭐⭐⭐</span>
                <span className="text-slate-500">(4.9/5)</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {pageData.headline}
            </h1>

            {/* تسعير احترافي مع مقارنة وشارة التوفير */}
            <div className="mt-4 flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-3xl font-black text-emerald-600">{rawPrice} ج.م</span>
                <span className="text-slate-400 line-through text-sm mr-2">{originalPrice} ج.م</span>
              </div>
              <span className="text-xs bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-lg">
                وفرت {originalPrice - rawPrice} ج.م 🔥
              </span>
            </div>
          </div>

          {/* شريط المخزون المتبقي */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-red-600">🔥 متبقي 6 قطع/مقاعد فقط بالسعر المخفض</span>
              <span className="text-slate-500">تم بيع 84%</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div className="bg-red-500 h-full w-[84%] rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* مميزات سريعة بأيقونات */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-700">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center gap-1">
              <span className="text-lg">🚚</span>
              <span>شحن سريع ومجاني</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center gap-1">
              <span className="text-lg">💵</span>
              <span>الدفع عند الاستلام</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center gap-1">
              <span className="text-lg">🔄</span>
              <span>ضمان المعاينة والاستبدال</span>
            </div>
          </div>

          {/* وصف وتفاصيل العرض */}
          {pageData.description && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-2">تفاصيل العرض والمواصفات:</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {pageData.description}
              </p>
            </div>
          )}

          {/* نموذج الطلب المباشر الفائق التحويل */}
          <div id="order-form" className="bg-emerald-50/60 p-5 rounded-3xl border-2 border-emerald-500/20">
            <div className="text-center mb-4">
              <h2 className="text-lg font-extrabold text-slate-900">
                {pageData.template_type === 'product' ? '📦 اطلب الآن وادفع عند الاستلام' : '🎯 سجّل بياناتك لتأكيد الحجز فوراً'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">املأ النموذج وسيتم التواصل معك مباشرة لتأكيد الطلب</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="أدخل اسمك"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف (واتساب للتأكيد) *</label>
                <input
                  type="tel"
                  required
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {pageData.template_type === 'product' ? 'العنوان بالتفصيل (المحافظة / المدينة / الشارع) *' : 'المجموعة / الموعد / الفصل الدراسي *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={pageData.template_type === 'product' ? 'مثال: الجيزة، الدقي، شارع مصدق' : 'مثال: السبت والثلاثاء - سنتر الأوائل'}
                  value={extraField}
                  onChange={(e) => setExtraField(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
                />
              </div>

              {pageData.template_type === 'product' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الكمية المطلوبة</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 bg-white border rounded-xl font-black text-lg flex items-center justify-center hover:bg-slate-100"
                    >-</button>
                    <span className="font-bold text-base w-8 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 bg-white border rounded-xl font-black text-lg flex items-center justify-center hover:bg-slate-100"
                    >+</button>
                    <span className="text-xs text-slate-500 font-bold mr-auto">
                      الإجمالي: <strong className="text-emerald-600 text-sm">{rawPrice * quantity} ج.م</strong>
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2 text-base mt-3 transform active:scale-95"
              >
                <span>💬 {pageData.template_type === 'product' ? 'اضغط هنا لتأكيد الشراء عبر واتساب' : 'اضغط هنا لتأكيد الحجز عبر واتساب'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* زر عائم سفلي دائم في شاشات الموبايل */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur border-t border-slate-200 z-50 flex items-center justify-between gap-4 max-w-xl mx-auto">
        <div>
          <span className="block text-[11px] text-slate-400 line-through">{originalPrice} ج.م</span>
          <span className="text-lg font-black text-emerald-600">{rawPrice} ج.م</span>
        </div>
        <button
          onClick={() => {
            const formEl = document.getElementById('order-form')
            formEl?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="flex-1 py-3 bg-emerald-600 text-white font-extrabold rounded-xl shadow-md text-sm text-center"
        >
          {pageData.template_type === 'product' ? 'اطلب الآن قبل انتهاء الخصم ⚡' : 'احجز مقعدك الآن ⚡'}
        </button>
      </div>
    </div>
  )
      }
        
