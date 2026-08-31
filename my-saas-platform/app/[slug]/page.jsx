'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Script from 'next/script'

const GOVERNORATES = [
  { name: 'القاهرة', zone: 'cairo' },
  { name: 'الجيزة', zone: 'cairo' },
  { name: 'الإسكندرية', zone: 'delta' },
  { name: 'الدقهلية (المنصورة)', zone: 'delta' },
  { name: 'الغربية (طنطا)', zone: 'delta' },
  { name: 'الشرقية (الزقازيق)', zone: 'delta' },
  { name: 'القليوبية (بنها)', zone: 'delta' },
  { name: 'المنوفية', zone: 'delta' },
  { name: 'البحيرة', zone: 'delta' },
  { name: 'كفر الشيخ', zone: 'delta' },
  { name: 'دمياط', zone: 'delta' },
  { name: 'بورسعيد', zone: 'delta' },
  { name: 'الإسماعيلية', zone: 'delta' },
  { name: 'السويس', zone: 'delta' },
  { name: 'الفيوم', zone: 'upper' },
  { name: 'بني سويف', zone: 'upper' },
  { name: 'المنيا', zone: 'upper' },
  { name: 'أسيوط', zone: 'upper' },
  { name: 'سوهاج', zone: 'upper' },
  { name: 'قنا', zone: 'upper' },
  { name: 'الأقصر', zone: 'upper' },
  { name: 'أسوان', zone: 'upper' },
  { name: 'مطروح والساحل الشمالي', zone: 'remote' },
  { name: 'البحر الأحمر والغردقة', zone: 'remote' },
  { name: 'شمال وجنوب سيناء', zone: 'remote' },
  { name: 'الوادي الجديد', zone: 'remote' },
]

export default function LandingView({ params }) {
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeImage, setActiveImage] = useState('')

  // اختيار الكمية والباقة
  const [quantity, setQuantity] = useState(1)

  // مدخلات العميل
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedGov, setSelectedGov] = useState(GOVERNORATES[0].name)

  // مدخلات الكوبون
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')

  // مؤقت العد التنازلي التفاعلي (ساعات : دقائق : ثواني)
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 30 })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 }
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        return { hours: 2, minutes: 30, seconds: 0 } // إعادة ضبط تلقائي
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function loadPage() {
      const resolvedParams = await params
      const slug = resolvedParams.slug

      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setPage(data)
      setActiveImage(data.product_image_url || '')
      if (data.branches) setSelectedBranch(data.branches.split(',')[0].trim())
      if (data.available_times) setSelectedTime(data.available_times.split(',')[0].trim())

      // زيادة عداد الزيارات
      await supabase
        .from('landing_pages')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', data.id)

      setLoading(false)
    }
    loadPage()
  }, [params])

  // حساب مصاريف الشحن
  const getShippingCost = () => {
    if (!page || page.shipping_type === 'free' || quantity >= 2) return 0 // شحن مجاني عند طلب قطعتين أو أكثر
    if (page.shipping_type === 'flat') return Number(page.shipping_flat_rate) || 0

    const currentGov = GOVERNORATES.find(g => g.name === selectedGov)
    const zone = currentGov ? currentGov.zone : 'cairo'

    if (zone === 'cairo') return Number(page.shipping_cairo) || 40
    if (zone === 'delta') return Number(page.shipping_delta) || 55
    if (zone === 'upper') return Number(page.shipping_upper) || 70
    if (zone === 'remote') return Number(page.shipping_remote) || 90
    return 50
  }

  // تطبيق الكوبون
  const handleApplyCoupon = () => {
    setCouponError('')
    if (!couponInput.trim()) return

    if (page?.coupon_code && couponInput.trim().toUpperCase() === page.coupon_code.toUpperCase()) {
      const singlePrice = Number(page.product_price) || 0
      const totalRaw = singlePrice * quantity
      let discountAmount = 0

      if (page.discount_type === 'percentage') {
        const percent = Number(page.discount_value) || 0
        discountAmount = (totalRaw * percent) / 100
      } else {
        discountAmount = Number(page.discount_value) || 0
      }

      setAppliedCoupon({
        code: page.coupon_code.toUpperCase(),
        amount: discountAmount,
      })
    } else {
      setAppliedCoupon(null)
      setCouponError('كود الخصم غير صالح أو منتهي')
    }
  }

  // حساب الإجمالي النهائي
  const singleUnitPrice = Number(page?.product_price) || 0
  const rawSubtotal = singleUnitPrice * quantity
  // خصم إضافي تلقائي 50 ج عند طلب 3 قطع
  const bundleBonusDiscount = quantity === 3 ? 50 : 0 
  const couponDiscount = appliedCoupon ? appliedCoupon.amount : 0
  const totalProductPrice = Math.max(0, rawSubtotal - bundleBonusDiscount - couponDiscount)
  const shippingCost = getShippingCost()
  const grandTotal = totalProductPrice + shippingCost

  // نسبة التوفير المحسوبة
  const originalPriceNum = Number(page?.original_price) || 0
  const savingsAmount = originalPriceNum > singleUnitPrice 
    ? ((originalPriceNum - singleUnitPrice) * quantity) + bundleBonusDiscount + couponDiscount 
    : bundleBonusDiscount + couponDiscount

  // التمرير السريع لنموذج الطلب
  const scrollToForm = () => {
    const formElement = document.getElementById('order-form')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // إرسال الطلب إلى واتساب
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (page) {
      await supabase
        .from('landing_pages')
        .update({ clicks_count: (page.clicks_count || 0) + 1 })
        .eq('id', page.id)
    }

    if (typeof window !== 'undefined' && window.fbq && page?.meta_pixel_id) {
      window.fbq('track', 'Purchase', { value: grandTotal, currency: 'EGP' })
    }

    let message = ''
    if (page.template_type === 'product') {
      message = `🛍️ *طلب شراء مؤكد من الرابط*\n` +
        `----------------------------------\n` +
        `📦 *المنتج:* ${page.headline}\n` +
        `🔢 *الكمية المطلوبة:* ${quantity} ${quantity === 1 ? 'قطعة' : 'قطع'}\n` +
        (page.original_price ? `💵 *السعر قبل الخصم:* ~${originalPriceNum * quantity} ج.م~\n` : '') +
        `🏷️ *سعر المنتجات:* ${totalProductPrice} ج.م\n` +
        (appliedCoupon ? `🎟️ *الكوبون المطبق:* ${appliedCoupon.code} (خصم ${appliedCoupon.amount} ج.م)\n` : '') +
        (shippingCost === 0 ? `🚚 *الشحن:* مجاني 🎁\n` : `📍 *المحافظة:* ${selectedGov}\n🚚 *الشحن:* ${shippingCost} ج.م\n`) +
        `----------------------------------\n` +
        `💰 *الإجمالي النهائي المطلوب:* *${grandTotal} ج.م*\n` +
        `----------------------------------\n` +
        `👤 *الاسم:* ${customerName}\n` +
        `📱 *الهاتف:* ${customerPhone}\n` +
        `🏠 *العنوان التفصيلي:* ${customerAddress}\n` +
        `----------------------------------\n` +
        `⚡ تمت المعاملة عبر: Aipudio-LP`
    } else {
      message = `🎯 *حجز موعد جديد من الرابط*\n` +
        `----------------------------------\n` +
        `🏢 *الخدمة:* ${page.headline}\n` +
        `🏛️ *الفرع:* ${selectedBranch}\n` +
        `⏰ *الموعد المفضل:* ${selectedTime}\n` +
        `----------------------------------\n` +
        `👤 *الاسم:* ${customerName}\n` +
        `📱 *الهاتف:* ${customerPhone}\n` +
        `💬 *ملاحظات:* ${customerAddress || 'لا توجد'}\n` +
        `----------------------------------\n` +
        `⚡ تمت المعاملة عبر: Aipudio-LP`
    }

    window.open(`https://wa.me/${page.whatsapp_number}?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-white p-6 rounded-3xl shadow-sm font-bold text-slate-700 text-sm border border-slate-200">
          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <span>جاري تجهيز أقوى عرض لمنتجك...</span>
        </div>
      </div>
    )
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-sm w-full space-y-3">
          <span className="text-4xl block">🔍</span>
          <h1 className="text-lg font-black text-slate-800">هذا الرابط غير متاح</h1>
          <p className="text-xs text-slate-500 leading-relaxed">تأكد من صحة الرابط أو تواصل مع صاحب النشاط.</p>
        </div>
      </div>
    )
  }

  const gallery = Array.isArray(page.gallery_images) ? page.gallery_images : []

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-28 font-sans selection:bg-purple-500 selection:text-white">
      {/* تضمين بكسلات التتبع */}
      {page.meta_pixel_id && (
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
            fbq('init', '${page.meta_pixel_id}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* 1. شريط الإعلان والعد التنازلي التفاعلي بالأعلى */}
      <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white py-2 px-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between text-[11px] sm:text-xs font-black">
          <div className="flex items-center gap-1.5">
            <span className="animate-bounce">⚡</span>
            <span>عرض حصري لفترة محدودة!</span>
          </div>
          <div className="flex items-center gap-1 font-mono dir-ltr bg-black/30 px-2 py-0.5 rounded-lg border border-white/20">
            <span>{String(timeLeft.hours).padStart(2, '0')}</span>:
            <span>{String(timeLeft.minutes).padStart(2, '0')}</span>:
            <span className="text-amber-300">{String(timeLeft.seconds).padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto bg-white sm:rounded-3xl sm:mt-3 shadow-xl border-x sm:border border-slate-200/80 overflow-hidden">
        
        {/* شريط المتجر أو النشاط */}
        <div className="p-3.5 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              {page.business_name?.[0] || 'A'}
            </div>
            <div>
              <span className="font-extrabold text-xs text-slate-800 block leading-tight">{page.business_name}</span>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                متجر معتمد وموثق
              </span>
            </div>
          </div>
          <button
            onClick={scrollToForm}
            className="text-[11px] bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-xl font-bold transition shadow-xs"
          >
            اطلب الآن ⚡
          </button>
        </div>

        {/* عرض الصور ومعرض الصور التفاعلي */}
        {activeImage && (
          <div className="p-3 pb-0 space-y-2">
            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-inner relative group">
              <img src={activeImage} alt={page.headline} className="w-full h-full object-cover transition duration-300" />
              {page.original_price && originalPriceNum > singleUnitPrice && (
                <div className="absolute top-3 right-3 bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded-xl shadow-lg border border-white/20">
                  خصم {Math.round(((originalPriceNum - singleUnitPrice) / originalPriceNum) * 100)}% 🔥
                </div>
              )}
            </div>

            {gallery.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveImage(page.product_image_url)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                    activeImage === page.product_image_url ? 'border-purple-600 ring-2 ring-purple-600/30' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={page.product_image_url} alt="رئيسية" className="w-full h-full object-cover" />
                </button>
                {gallery.map((imgUrl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImage(imgUrl)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                      activeImage === imgUrl ? 'border-purple-600 ring-2 ring-purple-600/30' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={imgUrl} alt={`إضافية ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* محتوى وتفاصيل العرض */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* العنوان والسعر المطور */}
          <div className="space-y-2">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">{page.headline}</h1>
            
            {page.template_type === 'product' && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50/60 p-3.5 rounded-2xl border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-bold block">سعر العرض الخاص:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-purple-700">{page.product_price} ج.م</span>
                    {page.original_price && (
                      <span className="text-xs text-slate-400 line-through font-bold">{page.original_price} ج.م</span>
                    )}
                  </div>
                </div>
                {savingsAmount > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-xs">
                    وفرت {savingsAmount} ج.م 💰
                  </span>
                )}
              </div>
            )}
          </div>

          {/* مؤشر نفاد الكمية (Scarcity Trigger) */}
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-amber-900">
              <span className="flex items-center gap-1">🔥 متبقي <strong>4 قطع فقط</strong> بالسعر المخفض</span>
              <span>تم حجز 86%</span>
            </div>
            <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
              <div className="w-[86%] h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"></div>
            </div>
          </div>

          {/* عروض الباقات والكميات (Quantity Tiers) لرفع قيمة السلة AOV */}
          {page.template_type === 'product' && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-black text-slate-800 block">اختر العرض المناسب لك:</span>
              <div className="grid grid-cols-3 gap-2">
                
                {/* باقة 1 */}
                <button
                  type="button"
                  onClick={() => setQuantity(1)}
                  className={`p-2.5 rounded-2xl border-2 text-center transition flex flex-col items-center justify-between ${
                    quantity === 1 ? 'border-purple-600 bg-purple-50/70 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-black text-slate-800">قطعة واحدة</span>
                  <span className="text-[11px] font-bold text-purple-700">{singleUnitPrice} ج</span>
                  <span className="text-[9px] text-slate-400 font-semibold">سعر قياسي</span>
                </button>

                {/* باقة 2 - الأكثر طلباً */}
                <button
                  type="button"
                  onClick={() => setQuantity(2)}
                  className={`p-2.5 rounded-2xl border-2 text-center transition relative flex flex-col items-center justify-between ${
                    quantity === 2 ? 'border-purple-600 bg-purple-50/70 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="absolute -top-2.5 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
                    الأكثر طلباً ⭐
                  </div>
                  <span className="text-xs font-black text-slate-800">قطعتان (2)</span>
                  <span className="text-[11px] font-bold text-purple-700">{singleUnitPrice * 2} ج</span>
                  <span className="text-[9px] text-emerald-600 font-black">شحن مجاني 🎁</span>
                </button>

                {/* باقة 3 - أكبر توفير */}
                <button
                  type="button"
                  onClick={() => setQuantity(3)}
                  className={`p-2.5 rounded-2xl border-2 text-center transition relative flex flex-col items-center justify-between ${
                    quantity === 3 ? 'border-purple-600 bg-purple-50/70 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="absolute -top-2.5 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
                    توفير 50 ج 🔥
                  </div>
                  <span className="text-xs font-black text-slate-800">3 قطع</span>
                  <span className="text-[11px] font-bold text-purple-700">{(singleUnitPrice * 3) - 50} ج</span>
                  <span className="text-[9px] text-emerald-600 font-black">شحن مجاني 🎁</span>
                </button>

              </div>
            </div>
          )}

          {/* شارات الثقة والأمان (Trust Badges) */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-bold text-slate-600">
            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
              <span className="text-base">💵</span>
              <span>الدفع عند الاستلام بعد الفحص</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
              <span className="text-base">📦</span>
              <span>معاينة المنتج قبل الدفع</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
              <span className="text-base">🚚</span>
              <span>شحن سريع لجميع المحافظات</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
              <span className="text-base">🔄</span>
              <span>ضمان استبدال واسترجاع مجاني</span>
            </div>
          </div>

          {/* الوصف والفوائد الترويجية */}
          {page.description && (
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-black text-slate-800 block">تفاصيل ومميزات العرض:</span>
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 font-medium">
                {page.description}
              </div>
            </div>
          )}

          {/* نموذج إدخال بيانات الشراء الفوري */}
          <form id="order-form" onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="text-center pb-1">
              <h3 className="text-sm font-black text-slate-900">أدخل بياناتك لتأكيد الطلب ✍️</h3>
              <p className="text-[11px] text-slate-400 font-semibold">سيتم تجهيز طلبك والتواصل معك فوراً عبر الواتساب</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">الاسم بالكامل:</label>
              <input
                type="text"
                required
                placeholder="أدخل اسمك الكريم"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-purple-600 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">رقم الهاتف (واتساب متاح):</label>
              <input
                type="tel"
                required
                placeholder="010xxxxxxxx"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs dir-ltr outline-none focus:border-purple-600 focus:bg-white font-mono transition"
              />
            </div>

            {/* تفاصيل الشحن والعنوان للمنتجات */}
            {page.template_type === 'product' && (
              <>
                {page.shipping_type === 'zones' && quantity === 1 && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">اختر محافظتك:</label>
                    <select
                      value={selectedGov}
                      onChange={e => setSelectedGov(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-purple-600 focus:bg-white font-bold transition"
                    >
                      {GOVERNORATES.map((gov, i) => (
                        <option key={i} value={gov.name}>{gov.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">العنوان بالتفصيل:</label>
                  <input
                    type="text"
                    required
                    placeholder="الشارع، رقم العمارة، علامة مميزة بجوارك"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-purple-600 focus:bg-white transition"
                  />
                </div>

                {/* تطبيق الكوبون */}
                {page.coupon_code && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="كود الخصم (إن وجد)"
                        value={couponInput}
                        onChange={e => setCouponInput(e.target.value)}
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase outline-none focus:border-purple-600"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                      >
                        تطبيق
                      </button>
                    </div>
                    {appliedCoupon && (
                      <p className="text-[11px] text-emerald-600 font-bold">
                        ✅ تم تطبيق كود ({appliedCoupon.code}) وخصم {appliedCoupon.amount} ج.م
                      </p>
                    )}
                    {couponError && <p className="text-[11px] text-rose-600 font-bold">{couponError}</p>}
                  </div>
                )}

                {/* ملخص الفاتورة والحساب النهائي */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>المنتجات ({quantity} قطعة):</span>
                    <strong>{rawSubtotal} ج.م</strong>
                  </div>
                  {bundleBonusDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>خصم باقة الـ 3 قطع:</span>
                      <span>- {bundleBonusDiscount} ج.م</span>
                    </div>
                  )}
                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>خصم الكوبون:</span>
                      <span>- {appliedCoupon.amount} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>مصاريف الشحن:</span>
                    <strong>{shippingCost === 0 ? <span className="text-emerald-600 font-black">مجاني 🎁</span> : `${shippingCost} ج.م`}</strong>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
                    <span>المبلغ النهائي المطلوب عند الاستلام:</span>
                    <span className="text-purple-700 text-base font-black">{grandTotal} ج.م</span>
                  </div>
                </div>
              </>
            )}

            {/* حقول خاصة بقالب الحجوزات */}
            {page.template_type === 'booking' && (
              <>
                {page.branches && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">اختر الفرع:</label>
                    <select
                      value={selectedBranch}
                      onChange={e => setSelectedBranch(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-purple-600 bg-white font-bold"
                    >
                      {page.branches.split(',').map((branch, i) => (
                        <option key={i} value={branch.trim()}>{branch.trim()}</option>
                      ))}
                    </select>
                  </div>
                )}

                {page.available_times && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">الموعد المفضل:</label>
                    <select
                      value={selectedTime}
                      onChange={e => setSelectedTime(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-purple-600 bg-white font-bold"
                    >
                      {page.available_times.split(',').map((time, i) => (
                        <option key={i} value={time.trim()}>{time.trim()}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">ملاحظات إضافية (اختياري):</label>
                  <input
                    type="text"
                    placeholder="أي استفسار أو تفاصيل أخرى"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
              </>
            )}

            {/* زر تأكيد الطلب المباشر */}
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:opacity-95 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 text-sm flex items-center justify-center gap-2"
            >
              <span>{page.template_type === 'product' ? '🛍️ اضغط هنا لتأكيد طلبك عبر الواتساب' : '📅 اضغط هنا لتأكيد حجزك عبر الواتساب'}</span>
            </button>
          </form>

          {/* شارة الضمان والسرعة */}
          <div className="pt-3 text-center text-[10px] text-slate-400 font-semibold space-y-1 border-t border-slate-100">
            <p>🔒 يتم تأكيد طلبك وشحنه فوراً بعد إرسال رسالة الواتساب</p>
            <p className="text-purple-600 font-bold">مدعوم بواسطة نظام البيع السريع Aipudio-LP ⚡</p>
          </div>
        </div>

      </div>

      {/* 2. شريط الشراء العائم للموبايل (Sticky Bottom Mobile Bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl block sm:hidden">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">المبلغ المطلوب:</span>
            <span className="text-lg font-black text-purple-700 leading-tight">{grandTotal} ج.م</span>
          </div>
          <button
            onClick={scrollToForm}
            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition"
          >
            اطلب الآن عبر الواتساب ⚡
          </button>
        </div>
      </div>

    </div>
  )
}
