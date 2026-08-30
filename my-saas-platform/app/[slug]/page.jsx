'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Script from 'next/script'

export default function DynamicLandingPage() {
  const params = useParams()
  const rawSlug = params?.slug ? (Array.isArray(params.slug) ? params.slug[0] : params.slug) : ''

  const [pageData, setPageData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState('')
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 35, seconds: 20 })

  // بيانات النموذج والحجز
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  const viewCounted = useRef(false)

  // الحصول على تاريخ اليوم بصيغة YYYY-MM-DD لمنع اختيار تواريخ سابقة
  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(p => p.seconds > 0 ? { ...p, seconds: p.seconds - 1 } : p.minutes > 0 ? { ...p, minutes: 59, seconds: 59 } : p.hours > 0 ? { hours: p.hours - 1, minutes: 59, seconds: 59 } : { hours: 3, minutes: 45, seconds: 0 })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let isMounted = true
    async function fetchPage() {
      if (!rawSlug) return isMounted && setLoading(false)
      try {
        let cleanSlug = decodeURIComponent(rawSlug).toLowerCase().trim()
        const { data } = await supabase
          .from('landing_pages')
          .select('*, profiles:user_id(is_active, subscription_end)')
          .ilike('slug', cleanSlug)
          .eq('is_published', true)
          .maybeSingle()

        if (isMounted) {
          if (data) {
            const up = data.profiles
            const end = up?.subscription_end ? new Date(up.subscription_end) : null
            if (up && (!up.is_active || (end && end < new Date()))) {
              setPageData(null)
            } else {
              setPageData(data)
              setSelectedImage(data.product_image_url || '')
              
              // تحديد الفرع الافتراضي
              const branchList = (data.branches || '').split(',').map(b => b.trim()).filter(Boolean)
              if (branchList.length > 0) setSelectedBranch(branchList[0])

              // تحديد أول توقيت افتراضي
              const timesList = (data.available_times || '').split(',').map(t => t.trim()).filter(Boolean)
              if (timesList.length > 0) setSelectedTime(timesList[0])

              if (!viewCounted.current) {
                supabase.rpc('increment_view', { p_slug: cleanSlug }).then(() => {})
                viewCounted.current = true
              }
            }
          } else { setPageData(null) }
          setLoading(false)
        }
      } catch (err) { if (isMounted) { setPageData(null); setLoading(false) } }
    }
    fetchPage()
    return () => { isMounted = false }
  }, [rawSlug])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold">جاري تحميل الصفحة...</div>
  if (!pageData) return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50"><h1 className="text-xl font-bold text-slate-800">الصفحة غير متوفرة أو معلقة</h1><p className="text-slate-500 text-xs mt-1">تأكد من صحة الرابط وسريان الاشتراك.</p></div>

  const isProduct = pageData.template_type === 'product'
  const rawPrice = pageData.product_price ? parseFloat(pageData.product_price) : null
  const hasPrice = rawPrice !== null && !isNaN(rawPrice) && rawPrice > 0
  const originalPrice = hasPrice ? Math.round(rawPrice * 1.55) : null
  const allImages = [pageData.product_image_url, ...(pageData.gallery_images || [])].filter(Boolean)

  const parsedBranches = (pageData.branches || '').split(',').map(b => b.trim()).filter(Boolean)
  const parsedTimes = (pageData.available_times || '12:00 م, 02:00 م, 04:00 م, 06:00 م, 08:00 م').split(',').map(t => t.trim()).filter(Boolean)

  const handleSubmit = (e) => {
    e.preventDefault()
    try { supabase.rpc('increment_click', { p_slug: decodeURIComponent(rawSlug).toLowerCase().trim() }).then(() => {}) } catch (e) {}
    
    if (typeof window !== 'undefined') {
      if (window.fbq && pageData.meta_pixel_id) window.fbq('track', isProduct ? 'Purchase' : 'Lead', { value: hasPrice ? rawPrice * quantity : 0, currency: 'EGP' })
      if (window.ttq && pageData.tiktok_pixel_id) window.ttq.track(isProduct ? 'CompletePayment' : 'SubmitForm')
      if (window.snaptr && pageData.snapchat_pixel_id) window.snaptr('track', isProduct ? 'PURCHASE' : 'SIGN_UP')
    }

    let msg = ''
    if (isProduct) {
      msg = `🔥 *طلب شراء جديد:*\n` +
        `🏪 المتجر: ${pageData.business_name}\n` +
        `📦 المنتج: ${pageData.headline}\n` +
        (hasPrice ? `💰 السعر: ${rawPrice * quantity} ج.م (الكمية: ${quantity})\n` : '') +
        `👤 الاسم: ${name}\n` +
        `📞 الهاتف: ${phone}\n` +
        `📍 العنوان: ${address}\n` +
        (notes ? `📝 ملاحظات: ${notes}` : '')
    } else {
      msg = `🎯 *طلب حجز موعد مؤكد:*\n` +
        `📋 الجهة/النشاط: ${pageData.business_name}\n` +
        `🩺 الخدمة/التخصص: ${pageData.headline}\n` +
        (hasPrice ? `💰 القيمة: ${rawPrice} ج.م\n` : '') +
        `👤 اسم العميل/المريض: ${name}\n` +
        `📞 رقم الهاتف: ${phone}\n` +
        (parsedBranches.length > 0 ? `🏢 الفرع / القاعة: ${selectedBranch}\n` : '') +
        `📅 التاريخ المطلوب: ${selectedDate || 'أقرب موعد متاح'}\n` +
        `⏰ التوقيت المفضل: ${selectedTime}\n` +
        (notes ? `📝 تفاصيل إضافية: ${notes}` : '')
    }

    window.location.href = `https://wa.me/${(pageData.whatsapp_number || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-24">
      {pageData.meta_pixel_id && <Script id="fb" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${pageData.meta_pixel_id}');fbq('track', 'PageView');`}</Script>}
      {pageData.tiktok_pixel_id && <Script id="tt" strategy="afterInteractive">{`!function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${pageData.tiktok_pixel_id}');ttq.page();}(window, document, 'ttq');`}</Script>}
      {pageData.snapchat_pixel_id && <Script id="snap" strategy="afterInteractive">{`(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init', '${pageData.snapchat_pixel_id}');snaptr('track', 'PAGE_VIEW');`}</Script>}

      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white text-xs font-bold py-2.5 px-4 text-center sticky top-0 z-40 shadow flex justify-center items-center gap-2">
        <span>{isProduct ? '⚡ عرض خاص - ينتهي خلال:' : '⚡ سارع بحجز موعدك - الأوقات المتاحة محدودة اليوم:'}</span>
        <span className="bg-black/30 px-2 py-0.5 rounded dir-ltr font-mono">{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>

      <div className="max-w-xl mx-auto bg-white shadow-xl min-h-screen">
        {selectedImage && (
          <div className="space-y-2 p-3 bg-slate-50">
            <div className="relative w-full aspect-square bg-slate-200 rounded-2xl overflow-hidden">
              <img src={selectedImage} alt={pageData.headline} className="w-full h-full object-cover" />
              <span className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">{isProduct ? 'خصم اليوم 🔥' : 'متاح للحجز الآن ✅'}</span>
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {allImages.map((img, idx) => (
                  <button key={idx} type="button" onClick={() => setSelectedImage(img)} className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 ${selectedImage === img ? 'border-emerald-600' : 'border-transparent opacity-70'}`}>
                    <img src={img} alt="preview" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-5 space-y-5">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">{pageData.business_name}</span>
              <span className="text-amber-500 text-xs">⭐⭐⭐⭐⭐ (4.9/5)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">{pageData.headline}</h1>
            {hasPrice && (
              <div className="mt-3 flex items-center gap-3 bg-slate-50 p-3 rounded-xl border">
                <span className="text-2xl font-black text-emerald-600">{rawPrice} ج.م</span>
                {isProduct && originalPrice && <span className="text-slate-400 line-through text-xs">{originalPrice} ج.م</span>}
                {isProduct && originalPrice && <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded">وفرت {originalPrice - rawPrice} ج.م</span>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-700">
            <div className="p-2.5 bg-slate-50 rounded-xl border"><span>{isProduct ? '🚚' : '📅'}</span><p className="mt-1">{isProduct ? 'شحن سريع' : 'تأكيد فوري'}</p></div>
            <div className="p-2.5 bg-slate-50 rounded-xl border"><span>{isProduct ? '💵' : '🔒'}</span><p className="mt-1">{isProduct ? 'دفع بالاستلام' : 'سرية وخصوصية'}</p></div>
            <div className="p-2.5 bg-slate-50 rounded-xl border"><span>{isProduct ? '🔄' : '⭐'}</span><p className="mt-1">{isProduct ? 'ضمان معاينة' : 'رعاية متخصصة'}</p></div>
          </div>

          {pageData.description && (
            <div className="bg-slate-50 p-4 rounded-xl border text-xs leading-relaxed text-slate-600 whitespace-pre-line">
              <strong className="block text-slate-800 mb-1">{isProduct ? 'تفاصيل المنتج:' : 'تفاصيل ومواعيد الخدمة / الحجز:'}</strong>
              {pageData.description}
            </div>
          )}

          {/* نموذج الطلب والحجز */}
          <div id="order-form" className="bg-emerald-50/60 p-4 rounded-2xl border-2 border-emerald-500/20">
            <h2 className="text-base font-extrabold text-slate-900 text-center mb-1">{isProduct ? '📦 اطلب الآن وادفع عند الاستلام' : '🎯 حدد موعدك وسجّل بياناتك للتأكيد'}</h2>
            <p className="text-[11px] text-slate-500 text-center mb-3">سيتم تأكيد الحجز والتواصل معك مباشرة</p>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الاسم بالكامل *</label>
                <input type="text" required placeholder="أدخل اسمك" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl outline-none" />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الهاتف (واتساب للتأكيد) *</label>
                <input type="tel" required placeholder="01xxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl outline-none dir-ltr text-right" />
              </div>

              {isProduct ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">العنوان بالتفصيل *</label>
                  <input type="text" required placeholder="المحافظة - المدينة - اسم الشارع" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl outline-none" />
                </div>
              ) : (
                <>
                  {parsedBranches.length > 1 && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">اختر الفرع / المكان *</label>
                      <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl outline-none">
                        {parsedBranches.map((b, i) => <option key={i} value={b}>{b}</option>)}
                      </select>
                    </div>
                  )}

                  {/* تقويم اختيار اليوم */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">📅 اختر يوم الحجز المفضل *</label>
                    <input
                      type="date"
                      required
                      min={todayStr}
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-full p-2.5 bg-white border rounded-xl outline-none font-sans"
                    />
                  </div>

                  {/* أزرار اختيار توقيت الحجز */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">⏰ اختر التوقيت المناسب لك *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {parsedTimes.map((timeSlot, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedTime(timeSlot)}
                          className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition ${
                            selectedTime === timeSlot
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {timeSlot}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {isProduct && hasPrice && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="font-bold">الكمية:</span>
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 bg-white border rounded-lg font-bold">-</button>
                  <span className="font-bold">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 bg-white border rounded-lg font-bold">+</button>
                  <span className="mr-auto font-bold text-emerald-600">الإجمالي: {rawPrice * quantity} ج.م</span>
                </div>
              )}

              <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg mt-3 text-sm transition">
                💬 {isProduct ? 'تأكيد الشراء عبر واتساب' : 'تأكيد الحجز والموعد عبر واتساب'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur border-t z-50 flex items-center justify-between gap-3 max-w-xl mx-auto">
        {hasPrice ? <span className="text-base font-black text-emerald-600">{rawPrice} ج.م</span> : <span className="text-xs font-bold text-slate-600">حجز مباشر ومؤكد ⚡</span>}
        <button onClick={() => document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' })} className="flex-1 py-2.5 bg-emerald-600 text-white font-extrabold rounded-xl text-xs text-center">{isProduct ? 'اطلب الآن ⚡' : 'احجز موعدك الآن ⚡'}</button>
      </div>
    </div>
  )
                }
                
