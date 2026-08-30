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

      // زيادة عدد الزيارات
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
    if (!page || page.shipping_type === 'free') return 0
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
      const basePrice = Number(page.product_price) || 0
      let discountAmount = 0

      if (page.discount_type === 'percentage') {
        const percent = Number(page.discount_value) || 0
        discountAmount = (basePrice * percent) / 100
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
  const basePrice = Number(page?.product_price) || 0
  const discountAmount = appliedCoupon ? appliedCoupon.amount : 0
  const productPriceAfterDiscount = Math.max(0, basePrice - discountAmount)
  const shippingCost = getShippingCost()
  const grandTotal = productPriceAfterDiscount + shippingCost

  // إرسال الطلب إلى واتساب
  const handleSubmit = async (e) => {
    e.preventDefault()

    // تحديث عدد الطلبات في قاعدة البيانات
    if (page) {
      await supabase
        .from('landing_pages')
        .update({ clicks_count: (page.clicks_count || 0) + 1 })
        .eq('id', page.id)
    }

    // تشغيل بكسل الشراء / التحويل
    if (typeof window !== 'undefined' && window.fbq && page?.meta_pixel_id) {
      window.fbq('track', 'Purchase', { value: grandTotal, currency: 'EGP' })
    }

    let message = ''
    if (page.template_type === 'product') {
      message = `🛍️ *طلب شراء جديد من الرابط*\n` +
        `----------------------------------\n` +
        `📦 *المنتج:* ${page.headline}\n` +
        (page.original_price ? `💵 *السعر الأصلي:* ~${page.original_price} ج.م~\n` : '') +
        `🏷️ *سعر العرض:* ${page.product_price} ج.م\n` +
        (appliedCoupon ? `🎟️ *الكوبون المطبق:* ${appliedCoupon.code} (خصم ${appliedCoupon.amount} ج.م)\n` : '') +
        (page.shipping_type !== 'free' ? `📍 *المحافظة:* ${selectedGov}\n🚚 *الشحن:* ${shippingCost} ج.م\n` : `🚚 *الشحن:* مجاني 🎁\n`) +
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
        <div className="flex items-center gap-3 bg-white p-6 rounded-2xl shadow-sm font-bold text-slate-700 text-sm">
          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <span>جاري تحميل العرض...</span>
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
    <div className="min-h-screen bg-slate-100/70 text-slate-900 py-6 sm:py-10 px-3 sm:px-4 font-sans selection:bg-purple-500 selection:text-white">
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

      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        
        {/* شريط النشاط العلوي */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              {page.business_name?.[0] || 'A'}
            </div>
            <span className="font-extrabold text-xs text-slate-800">{page.business_name}</span>
          </div>
          <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            متاح للطلب الآن
          </span>
        </div>

        {/* عرض الصور والمعرض */}
        {activeImage && (
          <div className="p-4 pb-0 space-y-2">
            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-inner">
              <img src={activeImage} alt={page.headline} className="w-full h-full object-cover transition duration-300" />
            </div>

            {gallery.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  type="button"
                  onClick={() => setActiveImage(page.product_image_url)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                    activeImage === page.product_image_url ? 'border-purple-600 ring-2 ring-purple-600/20' : 'border-transparent opacity-60'
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
                      activeImage === imgUrl ? 'border-purple-600 ring-2 ring-purple-600/20' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={imgUrl} alt={`إضافية ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* تفاصيل العرض والنصوص */}
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900 leading-snug">{page.headline}</h1>
            {page.description && (
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-2xl border border-slate-100">
                {page.description}
              </p>
            )}
          </div>

          {/* كارت السعر والشحن للمنتجات */}
          {page.template_type === 'product' && (
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">السعر الحالي:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-purple-700">{page.product_price} ج.م</span>
                    {page.original_price && (
                      <span className="text-xs text-slate-400 line-through font-semibold">{page.original_price} ج.م</span>
                    )}
                  </div>
                </div>

                <span className="text-[11px] bg-white border border-purple-200 text-purple-800 px-2.5 py-1 rounded-xl font-bold shadow-xs">
                  {page.shipping_type === 'free' ? '🚚 شحن مجاني' : '⚡ توصيل سريع'}
                </span>
              </div>

              {/* تطبيق الكوبون */}
              {page.coupon_code && (
                <div className="pt-2 border-t border-purple-100 space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="هل لديك كود خصم؟"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value)}
                      className="flex-1 p-2 bg-white border border-purple-200 rounded-xl text-xs font-mono uppercase outline-none focus:border-purple-600"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
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
            </div>
          )}

          {/* نموذج إدخال البيانات */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">الاسم بالكامل</label>
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
              <label className="text-xs font-bold text-slate-700 block">رقم الهاتف (واتساب)</label>
              <input
                type="tel"
                required
                placeholder="010xxxxxxxx"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs dir-ltr outline-none focus:border-purple-600 focus:bg-white font-mono transition"
              />
            </div>

            {/* حقول خاصة بقالب المنتجات والشحن */}
            {page.template_type === 'product' && (
              <>
                {page.shipping_type === 'zones' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">اختر محافظتك (لتحديد تكلفة الشحن)</label>
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
                  <label className="text-xs font-bold text-slate-700 block">العنوان بالتفصيل</label>
                  <input
                    type="text"
                    required
                    placeholder="الشارع، رقم المبنى، علامة مميزة"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-purple-600 focus:bg-white transition"
                  />
                </div>

                {/* ملخص الفاتورة النهائية */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>سعر المنتج:</span>
                    <strong>{productPriceAfterDiscount} ج.م {appliedCoupon && <span className="text-emerald-600 text-[10px]">(بعد الخصم)</span>}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>مصاريف الشحن والتوصيل:</span>
                    <strong>{shippingCost === 0 ? <span className="text-emerald-600">مجاني 🎁</span> : `${shippingCost} ج.م`}</strong>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between text-sm font-black text-slate-900">
                    <span>الإجمالي النهائي المطلوب:</span>
                    <span className="text-purple-700 text-base">{grandTotal} ج.م</span>
                  </div>
                </div>
              </>
            )}

            {/* حقول خاصة بقالب الحجوزات والعيادات */}
            {page.template_type === 'booking' && (
              <>
                {page.branches && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">اختر الفرع أو القاعة</label>
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
                    <label className="text-xs font-bold text-slate-700 block">اختر الوقت المناسب</label>
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
                  <label className="text-xs font-bold text-slate-700 block">ملاحظات أو استفسار إضافي (اختياري)</label>
                  <input
                    type="text"
                                        placeholder="أي ملاحظات تود إضافتها"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
              </>
            )}

            {/* زر تأكيد الطلب عبر واتساب */}
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-600/20 transition flex items-center justify-center gap-2 text-sm transform active:scale-95 pt-3"
            >
              <span>{page.template_type === 'product' ? '🛍️ تأكيد الطلب الفوري عبر واتساب' : '📅 تأكيد الحجز المباشر عبر واتساب'}</span>
            </button>
          </form>

          {/* شارة الضمان والسرعة */}
          <div className="pt-2 text-center text-[10px] text-slate-400 font-semibold space-y-1 border-t border-slate-100">
            <p>🔒 بياناتك محمية ويتم التواصل معك فوراً عبر واتساب لتأكيد الاستلام</p>
            <p className="text-purple-600 font-bold">مدعوم بواسطة أسرع نظام لروابط البيع المباشر Aipudio-LP ⚡</p>
          </div>
        </div>

      </div>
    </div>
  )
}
