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

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [extraField, setExtraField] = useState('')
  const [notes, setNotes] = useState('')

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

        // استخدام maybeSingle لمنع انهيار الصفحة في حال عدم وجود الرابط
        const { data, error } = await supabase
          .from('landing_pages')
          .select('*')
          .ilike('slug', cleanSlug)
          .eq('is_published', true)
          .maybeSingle()

        if (isMounted) {
          if (data) {
            setPageData(data)
          } else {
            setPageData(null)
          }
          setLoading(false)
        }
      } catch (err) {
        console.error('Error loading page:', err)
        if (isMounted) {
          setPageData(null)
          setLoading(false)
        }
      }
    }

    fetchPage()

    return () => {
      isMounted = false
    }
  }, [rawSlug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600 font-bold text-lg animate-pulse">جاري تحميل الصفحة...</div>
      </div>
    )
  }

  if (!pageData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
          ✕
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">الصفحة غير موجودة أو قيد المراجعة</h1>
        <p className="text-slate-500 max-w-sm mb-6 text-sm">
          تأكد من كتابة الرابط بشكل صحيح، أو أن صاحب النشاط قام بنشر وتفعيل الصفحة.
        </p>
      </div>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    let messageText = ''
    if (pageData.template_type === 'product') {
      messageText = `*طلب شراء جديد من صفحة:* ${pageData.business_name}\n\n` +
        `📦 *المنتج:* ${pageData.headline}\n` +
        `💰 *السعر:* ${pageData.product_price || 'غير محدد'}\n` +
        `👤 *الاسم:* ${name}\n` +
        `📞 *الهاتف:* ${phone}\n` +
        `📍 *العنوان بالتفصيل:* ${extraField}\n` +
        (notes ? `📝 *ملاحظات:* ${notes}\n` : '')
    } else {
      messageText = `*طلب حجز / تسجيل جديد:* ${pageData.business_name}\n\n` +
        `🎯 *الخدمة:* ${pageData.headline}\n` +
        `👤 *الاسم:* ${name}\n` +
        `📞 *رقم الهاتف:* ${phone}\n` +
        `🗓️ *المجموعة / الموعد المطلوب:* ${extraField}\n` +
        (notes ? `📝 *ملاحظات إضافية:* ${notes}\n` : '')
    }

    const cleanPhone = (pageData.whatsapp_number || '').replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    
    window.location.href = whatsappUrl
  }

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center p-4 sm:p-6">
      {pageData.meta_pixel_id && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pageData.meta_pixel_id}');
              fbq('track', 'PageView');
            `
          }}
        />
      )}

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col">
        {pageData.template_type === 'product' && pageData.product_image_url && (
          <div className="w-full h-64 sm:h-72 bg-slate-100 overflow-hidden">
            <img
              src={pageData.product_image_url}
              alt={pageData.headline}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
          <div>
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block mb-2">
                {pageData.business_name}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 leading-snug">
                {pageData.headline}
              </h1>
              {pageData.product_price && (
                <div className="text-2xl font-black text-emerald-600 mb-3">
                  {pageData.product_price}
                </div>
              )}
              {pageData.description && (
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {pageData.description}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-800 text-center text-sm sm:text-base mb-2">
                {pageData.template_type === 'product' ? 'أدخل بيانات التوصيل للطلب' : 'املأ البيانات لتأكيد الحجز فوراً'}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الاسم بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="أدخل اسمك"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الهاتف (واتساب) *</label>
                <input
                  type="tel"
                  required
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {pageData.template_type === 'product' ? 'العنوان بالتفصيل (المحافظة / المدينة / الشارع) *' : 'المجموعة / الموعد / التخصص المطلوب *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={pageData.template_type === 'product' ? 'مثال: القاهرة، م نصر، ش الطيران' : 'مثال: مجموعة أ - أيام السبت والثلاثاء'}
                  value={extraField}
                  onChange={(e) => setExtraField(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">أي ملاحظات إضافية (اختياري)</label>
                <input
                  type="text"
                  placeholder="اختياري..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 text-base mt-2"
              >
                <span>💬 {pageData.template_type === 'product' ? 'تأكيد الطلب عبر واتساب' : 'تأكيد الحجز عبر واتساب'}</span>
              </button>
            </form>
          </div>

          <div className="text-center mt-6 text-xs text-slate-400">
            مدعوم بواسطة نظام المبيعات والحجوزات السريعة
          </div>
        </div>
      </div>
    </div>
  )
        }
    
