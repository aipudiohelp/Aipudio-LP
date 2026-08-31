'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// مكتبة القوالب التسويقية الذكية
const TEMPLATES_LIST = [
  {
    id: 'product_flash',
    name: 'عرض خاطف / دروب شيبينغ',
    icon: '🔥',
    badge: 'الأعلى تحويلاً ⚡',
    badgeColor: 'bg-red-500/10 text-red-600 border-red-200',
    desc: 'تركيز كامل على عروض الباقات (1+1)، عداد تنازلي، وإتمام الشراء الفوري.',
  },
  {
    id: 'product_beauty',
    name: 'تجميل وعناية بالبشرة',
    icon: '🌸',
    badge: 'براندات ومستحضرات',
    badgeColor: 'bg-pink-500/10 text-pink-600 border-pink-200',
    desc: 'إبراز المكونات الطبيعية، شارات الأمان الطبي، ونتائج الاستخدام قبل/بعد.',
  },
  {
    id: 'product_gadgets',
    name: 'أجهزة وأدوات ذكية',
    icon: '⚡',
    badge: 'إلكترونيات ومطبخ',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-200',
    desc: 'عرض المواصفات الفنية، طريقة التشغيل، وسرعة الشحن للمحافظات.',
  },
  {
    id: 'product_fashion',
    name: 'أزياء وملابس وإكسسوارات',
    icon: '👗',
    badge: 'فاشون وموضة',
    badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-200',
    desc: 'معرض صور واسع، توضيح المقاسات، وشارات المعاينة وتجربة المقاس قبل الاستلام.',
  },
  {
    id: 'booking',
    name: 'حجز مواعيد واستشارات',
    icon: '🎯',
    badge: 'عيادات ومراكز',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    desc: 'تحديد الفروع، الأوقات المتاحة، وتأكيد الحجز المباشر على الواتساب.',
  },
]

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userPages, setUserPages] = useState([])
  const [editingPageId, setEditingPageId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [origin, setOrigin] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const router = useRouter()

  const defaultForm = {
    slug: '',
    template_type: 'product_flash',
    business_name: '',
    headline: '',
    description: '',
    whatsapp_number: '',
    // التسعير والخصومات
    original_price: '',
    product_price: '',
    coupon_code: '',
    discount_type: 'percentage',
    discount_value: '',
    // عروض الباقات والكميات المخصصة
    enable_bundles: false,
    bundle_2_price: '',
    bundle_2_free_shipping: true,
    bundle_3_price: '',
    bundle_3_free_shipping: true,
    // الشحن
    shipping_type: 'free',
    shipping_flat_rate: '50',
    shipping_cairo: '40',
    shipping_delta: '55',
    shipping_upper: '70',
    shipping_remote: '90',
    // الصور والمواعيد
    product_image_url: '',
    gallery_images: [],
    branches: 'الفرع الرئيسي',
    available_times: '12:00 م, 02:00 م, 04:00 م, 06:00 م, 08:00 م',
    // البكسلات
    meta_pixel_id: '',
    tiktok_pixel_id: '',
    snapchat_pixel_id: '',
  }

  const [formData, setFormData] = useState(defaultForm)

  const PAYMENT_INFO = {
    account_holder: 'مصطفى بدر',
    instapay_id: 'mustafa.nbe015@instapay',
    instapay_phone: '01501665571',
    vodafone_cash: '01501665571',
    support_whatsapp: '201005825888',
    monthly_price: '99 ج.م (3 صفحات)',
    yearly_price: '799 ج.م (10 صفحات)',
  }

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
    loadDashboard()
  }, [router])

  async function loadDashboard() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.push('/login')
    setUser(session.user)

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    setProfile(prof)

    const { data: pages } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    setUserPages(pages || [])
    setLoading(false)
  }

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 2000)
  }

  const copyPageLink = (slug) => {
    const fullUrl = `${origin}/${slug}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(''), 2000)
  }

  const startEdit = (page) => {
    setEditingPageId(page.id)
    setFormData({
      slug: page.slug || '',
      template_type: page.template_type || 'product_flash',
      business_name: page.business_name || '',
      headline: page.headline || '',
      description: page.description || '',
      whatsapp_number: page.whatsapp_number || '',
      original_price: page.original_price || '',
      product_price: page.product_price || '',
      coupon_code: page.coupon_code || '',
      discount_type: page.discount_type || 'percentage',
      discount_value: page.discount_value || '',
      enable_bundles: Boolean(page.enable_bundles),
      bundle_2_price: page.bundle_2_price || '',
      bundle_2_free_shipping: page.bundle_2_free_shipping ?? true,
      bundle_3_price: page.bundle_3_price || '',
      bundle_3_free_shipping: page.bundle_3_free_shipping ?? true,
      shipping_type: page.shipping_type || 'free',
      shipping_flat_rate: page.shipping_flat_rate || '50',
      shipping_cairo: page.shipping_cairo || '40',
      shipping_delta: page.shipping_delta || '55',
      shipping_upper: page.shipping_upper || '70',
      shipping_remote: page.shipping_remote || '90',
      product_image_url: page.product_image_url || '',
      gallery_images: Array.isArray(page.gallery_images) ? page.gallery_images : [],
      branches: page.branches || 'الفرع الرئيسي',
      available_times: page.available_times || '12:00 م, 02:00 م, 04:00 م, 06:00 م, 08:00 م',
      meta_pixel_id: page.meta_pixel_id || '',
      tiktok_pixel_id: page.tiktok_pixel_id || '',
      snapchat_pixel_id: page.snapchat_pixel_id || '',
    })
    document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  const resetToNew = () => {
    setEditingPageId(null)
    setFormData(defaultForm)
    document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  const deletePage = async (pageId, pageTitle) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف صفحة "${pageTitle}" نهائياً؟ سيتم تحرير المساحة.`)) return
    const { error } = await supabase.from('landing_pages').delete().eq('id', pageId)
    if (error) {
      alert('خطأ أثناء الحذف: ' + error.message)
    } else {
      alert('تم حذف الصفحة بنجاح!')
      if (editingPageId === pageId) resetToNew()
      await loadDashboard()
    }
  }

  const handleMainUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingMain(true)
    try {
      const fileName = `${user.id}-main-${Date.now()}.${file.name.split('.').pop()}`
      const { error } = await supabase.storage.from('landing-images').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('landing-images').getPublicUrl(fileName)
      setFormData(prev => ({ ...prev, product_image_url: publicUrl }))
    } catch (err) {
      alert('خطأ: ' + err.message)
    } finally {
      setUploadingMain(false)
    }
  }

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if ((formData.gallery_images || []).length >= 4) return alert('أقصى حد 4 صور إضافية')
    setUploadingGallery(true)
    try {
      const fileName = `${user.id}-gallery-${Date.now()}.${file.name.split('.').pop()}`
      const { error } = await supabase.storage.from('landing-images').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('landing-images').getPublicUrl(fileName)
      setFormData(prev => ({ ...prev, gallery_images: [...(prev.gallery_images || []), publicUrl] }))
    } catch (err) {
      alert('خطأ: ' + err.message)
    } finally {
      setUploadingGallery(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    const maxAllowed = profile?.max_pages || 1
    if (!editingPageId && userPages.length >= maxAllowed) {
      alert(`عذراً، لقد استهلكت كامل المساحات النشطة (${maxAllowed} صفحات).`)
      setSaving(false)
      return
    }

    const payload = {
      ...formData,
      user_id: user.id,
      slug: formData.slug.toLowerCase().trim().replace(/\s+/g, '-'),
    }

    const res = editingPageId
      ? await supabase.from('landing_pages').update(payload).eq('id', editingPageId)
      : await supabase.from('landing_pages').insert([payload])

    if (res.error) {
      alert('خطأ أثناء الحفظ: ' + res.error.message)
    } else {
      alert(editingPageId ? 'تم حفظ تعديلات الصفحة بنجاح!' : 'تم إنشاء ونشر الصفحة بنجاح!')
      resetToNew()
      await loadDashboard()
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 font-bold text-slate-700 text-sm">
          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <span>جاري تحميل لوحة التحكم...</span>
        </div>
      </div>
    )
  }

  const now = new Date()
  const endDate = profile?.subscription_end ? new Date(profile.subscription_end) : null
  const daysLeft = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0
  const isSubscriptionActive = profile?.is_active && daysLeft > 0
  const maxPages = profile?.max_pages || 1
  const usedPages = userPages.length
  const remainingPages = Math.max(0, maxPages - usedPages)

  const isProductTemplate = formData.template_type !== 'booking'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-purple-500 selection:text-white py-6 px-4 sm:px-8 pb-28">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* الهيدر العلوي */}
        <div className="flex justify-between items-center bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 relative rounded-2xl overflow-hidden bg-slate-950 p-1.5 border border-purple-400/30 shadow-md shadow-purple-500/20 flex items-center justify-center">
              <img src="/logo.png" alt="Aipudio" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                  Aipudio-LP
                </h1>
                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                  لوحة التحكم
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/" className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition text-xs font-bold">
              🏠
            </Link>
            {(profile?.role === 'super_admin' || profile?.role === 'admin') && (
              <Link href="/admin" className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-95 transition">
                👑 الإدارة
              </Link>
            )}
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition border border-rose-100"
            >
              خروج
            </button>
          </div>
        </div>

        {/* بطاقة الاشتراك */}
        <div className={`p-5 sm:p-6 rounded-3xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition shadow-sm ${
          isSubscriptionActive ? 'bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-cyan-50/70 border-purple-200/80 text-slate-900' : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base">
                {isSubscriptionActive ? '✨ الاشتراك ساري ونشط' : '⛔ انتهت فترة الاشتراك'}
              </span>
              <span className="text-[10px] bg-white text-slate-800 border px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                {profile?.plan_type === 'trial' ? 'تجريبي مجاني (3 أيام)' : profile?.plan_type === 'yearly' ? 'باقة سنوية (10 صفحات)' : 'باقة شهرية (3 صفحات)'}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {isSubscriptionActive ? `متبقي ${daysLeft} يوماً (ينتهي: ${endDate?.toLocaleDateString('ar-EG')})` : 'يرجى تجديد الاشتراك للاستمرار في استقبال الطلبات.'}
            </p>
            <div className="pt-1 flex items-center gap-2">
              <span className="bg-white/90 border border-purple-200/80 text-purple-900 font-bold text-xs px-3 py-1 rounded-xl shadow-xs">
                📄 الصفحات النشطة: {usedPages} من {maxPages} (متبقي {remainingPages} مساحة)
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-purple-500/20 transition transform active:scale-95"
          >
            💳 تفعيل / ترقية الاشتراك (99 ج.م) ⚡
          </button>
        </div>

        {/* نافذة الدفع والتفعيل */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 text-right">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black">
                    ⚡ تفعيل فوري بدون عمولات
                  </span>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 leading-snug">
                    استمر في استقبال أوردراتك بدون سلات متروكة بـ <span className="text-purple-600">99 ج.م فقط شهرياً</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    (أقل من 3.3 جنيه في اليوم) — التحويل متاح فوراً عبر إنستاباي وفودافون كاش ⚡
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition shrink-0 mr-2"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-2xl border flex justify-between items-center text-xs">
                <span className="text-slate-500">المستفيد المسجل:</span>
                <strong className="text-slate-900">{PAYMENT_INFO.account_holder}</strong>
              </div>

              <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200 space-y-2 text-xs">
                <span className="font-bold text-purple-950 block">⚡ إنستاباي (InstaPay):</span>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-purple-100">
                  <span className="font-mono font-bold text-[11px] dir-ltr text-purple-900">{PAYMENT_INFO.instapay_id}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(PAYMENT_INFO.instapay_id, 'id')}
                    className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-2.5 py-1 rounded-lg transition"
                  >
                    {copiedKey === 'id' ? 'تم النسخ ✅' : 'نسخ المعرف 📋'}
                  </button>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-purple-100">
                  <span className="font-mono font-bold text-[11px] dir-ltr text-purple-900">{PAYMENT_INFO.instapay_phone}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(PAYMENT_INFO.instapay_phone, 'ph')}
                    className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-2.5 py-1 rounded-lg transition"
                  >
                    {copiedKey === 'ph' ? 'تم النسخ ✅' : 'نسخ الرقم 📋'}
                  </button>
                </div>
              </div>

              <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-600 block text-[11px]">📱 فودافون كاش / محافظ إلكترونية:</span>
                  <strong className="font-mono font-bold text-rose-700 text-xs">{PAYMENT_INFO.vodafone_cash}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(PAYMENT_INFO.vodafone_cash, 'vc')}
                  className="text-[10px] bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-2.5 py-1 rounded-lg transition"
                >
                  {copiedKey === 'vc' ? 'تم النسخ ✅' : 'نسخ الرقم 📋'}
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-600">• باقة شهرية (3 صفحات):</span>
                  <strong className="text-slate-900 font-bold">{PAYMENT_INFO.monthly_price}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-600">• باقة سنوية (10 صفحات):</span>
                  <strong className="text-purple-700 font-bold">{PAYMENT_INFO.yearly_price} (وفر 35% 🔥)</strong>
                </div>
              </div>

              <button
                onClick={() => {
                  const msg = `مرحباً، قمت بتحويل مبلغ الاشتراك الشهري (99 ج.م) لحسابي في منصة Aipudio-LP:\n📧 البريد: ${user?.email || ''}\nوهذا إيصال التحويل لتفعيل حسابي فوراً ✅`
                  window.open(`https://wa.me/${PAYMENT_INFO.support_whatsapp}?text=${encodeURIComponent(msg)}`, '_blank')
                }}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black rounded-2xl text-xs shadow-lg shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>💬</span>
                <span>إرسال إشعار التحويل عبر واتساب للتفعيل الفوري</span>
              </button>

              <p className="text-[10px] text-slate-400 text-center">
                يتم تأكيد التحويل وتفعيل الباقة خلال دقائق معدودة من إرسال الرسالة ⚡
              </p>

            </div>
          </div>
        )}

        {/* قائمة الصفحات المنشورة */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">📂 صفحاتي المنشورة ({usedPages})</h2>
              <p className="text-[11px] text-slate-400">يمكنك تعديل أي صفحة أو حذفها لتحرير المساحة فوراً</p>
            </div>
            {usedPages < maxPages && (
              <button onClick={resetToNew} className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-95 transition">
                ➕ إضافة صفحة جديدة
              </button>
            )}
          </div>

          {userPages.length === 0 ? (
            <p className="text-center text-xs text-slate-400 p-6 border border-dashed rounded-2xl">لا توجد لديك صفحات منشورة بعد.</p>
          ) : (
            <div className="space-y-3">
              {userPages.map((page) => {
                const currentTpl = TEMPLATES_LIST.find(t => t.id === page.template_type) || TEMPLATES_LIST[0]
                return (
                  <div
                    key={page.id}
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                      editingPageId === page.id ? 'border-purple-500 bg-purple-50/40 ring-2 ring-purple-500/20' : 'bg-slate-50/80 border-slate-200/80'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{page.business_name || page.slug}</span>
                        <span className="text-[10px] bg-white border px-2 py-0.5 rounded-md font-bold text-slate-700 flex items-center gap-1">
                          <span>{currentTpl.icon}</span>
                          <span>{currentTpl.name}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <a href={`/${page.slug}`} target="_blank" rel="noreferrer" className="text-purple-700 font-mono font-bold hover:underline dir-ltr">
                          /{page.slug} ↗
                        </a>
                        <button type="button" onClick={() => copyPageLink(page.slug)} className="text-[10px] bg-white border px-2 py-0.5 rounded-md font-bold">
                          {copiedSlug === page.slug ? 'تم النسخ ✅' : 'نسخ الرابط 📋'}
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span>👁️ الزيارات: <strong>{page.views_count || 0}</strong></span>
                        <span>💬 الطلبات: <strong className="text-emerald-600">{page.clicks_count || 0}</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => startEdit(page)} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition">✏️ تعديل</button>
                      <button type="button" onClick={() => deletePage(page.id, page.business_name || page.slug)} className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 transition">🗑️ حذف</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* نموذج إنشاء وتعديل الصفحة */}
        <div id="form-section" className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {editingPageId ? '✏️ تعديل بيانات الصفحة المحددة' : '✨ إنشاء ونشر صفحة هبوط جديدة'}
              </h2>
              <p className="text-[11px] text-slate-400">اختر القالب الأنسب لنشاطك، وحدد الأسعار والعروض لنشر الرابط فوراً</p>
            </div>
            {editingPageId && (
              <button type="button" onClick={resetToNew} className="text-xs text-purple-700 hover:underline font-bold">
                إلغاء التعديل / إنشاء جديد ✕
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            
            {/* 1. محدد القوالب البصري التفاعلي */}
            <div className="space-y-2.5">
              <label className="font-extrabold text-xs text-slate-900 block">
                🎨 اختر نوع وهوية قالب صفحة الهبوط:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {TEMPLATES_LIST.map((tpl) => {
                  const isSelected = formData.template_type === tpl.id
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setFormData({ ...formData, template_type: tpl.id })}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between space-y-2 text-right ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 shadow-md ring-2 ring-purple-600/20'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{tpl.icon}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border ${tpl.badgeColor}`}>
                          {tpl.badge}
                        </span>
                      </div>
                      <div>
                        <strong className="text-xs font-black text-slate-900 block">{tpl.name}</strong>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{tpl.desc}</p>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] font-bold">
                        <span className={isSelected ? 'text-purple-700' : 'text-slate-400'}>
                          {isSelected ? '● القالب المختار' : 'اختيار هذا القالب'}
                        </span>
                        {isSelected && <span className="text-purple-600">✓</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 2. اسم الرابط والنشاط */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم الرابط بالإنجليزية (Slug)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: glow-cream أو watch-ultra"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-2xl dir-ltr outline-none focus:border-purple-500 bg-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم النشاط / المتجر</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: براند نيتشر شادو"
                  value={formData.business_name}
                  onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-purple-500 bg-white"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-bold text-slate-700 block mb-1">رقم الواتساب مع كود الدولة (لاستقبال الطلبات)</label>
              <input
                type="text"
                required
                placeholder="2010xxxxxxxx"
                value={formData.whatsapp_number}
                onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-2xl dir-ltr outline-none focus:border-purple-500 bg-white font-mono"
              />
            </div>

            {/* 3. إعدادات الأسعار والكوبونات والعروض والشحن */}
            {isProductTemplate && (
              <div className="space-y-4 pt-1">
                {/* الأسعار الأساسية */}
                <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3 text-xs">
                  <h3 className="font-extrabold text-purple-950 flex items-center gap-1.5">
                    <span>💵</span> إعدادات التسعير الأساسي (للقطعة الواحدة)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">السعر الأصلي قبل الخصم (ج.م):</label>
                      <input
                        type="text"
                        placeholder="مثال: 500"
                        value={formData.original_price}
                        onChange={e => setFormData({ ...formData, original_price: e.target.value })}
                        className="w-full p-2.5 border border-purple-200 rounded-xl bg-white outline-none focus:border-purple-500"
                      />
                      <span className="text-[10px] text-slate-500">يظهر مشطوباً عليه لإبراز التوفير.</span>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">سعر بيع القطعة الواحدة (ج.م):</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: 350"
                        value={formData.product_price}
                        onChange={e => setFormData({ ...formData, product_price: e.target.value })}
                        className="w-full p-2.5 border border-purple-200 rounded-xl bg-white outline-none focus:border-purple-500 font-bold"
                      />
                      <span className="text-[10px] text-slate-500">سعر القطعة الأساسي عند طلب كمية 1.</span>
                    </div>
                  </div>
                </div>

                {/* عروض الكميات والباقات المخصصة (تحكم كامل للتاجر) */}
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎁</span>
                      <div>
                        <strong className="text-xs font-black text-amber-950 block">عروض الباقات والكميات (اختياري)</strong>
                        <span className="text-[10px] text-amber-800">فعّل عروض التوفير وشجع العميل على شراء أكثر من قطعة</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enable_bundles}
                        onChange={e => setFormData({ ...formData, enable_bundles: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {formData.enable_bundles && (
                    <div className="space-y-3 pt-2 border-t border-amber-200/80">
                      {/* عرض القطعتين */}
                      <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                        <span className="font-bold text-slate-800 block text-[11px]">⭐ عرض القطعتين (2 قطع):</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-slate-600 block text-[10px] mb-1">إجمالي سعر القطعتين معاً (ج.م):</label>
                            <input
                              type="text"
                              placeholder="مثال: 600 (بدلاً من 700)"
                              value={formData.bundle_2_price}
                              onChange={e => setFormData({ ...formData, bundle_2_price: e.target.value })}
                              className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-bold"
                            />
                          </div>
                          <div className="flex items-center pt-4">
                            <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-slate-700">
                              <input
                                type="checkbox"
                                checked={formData.bundle_2_free_shipping}
                                onChange={e => setFormData({ ...formData, bundle_2_free_shipping: e.target.checked })}
                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                              />
                              <span>🎁 شحن مجاني لهذا العرض</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* عرض الـ 3 قطع */}
                      <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                        <span className="font-bold text-slate-800 block text-[11px]">🔥 عرض الـ 3 قطع:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-slate-600 block text-[10px] mb-1">إجمالي سعر الـ 3 قطع معاً (ج.م):</label>
                            <input
                              type="text"
                              placeholder="مثال: 850 (بدلاً من 1050)"
                              value={formData.bundle_3_price}
                              onChange={e => setFormData({ ...formData, bundle_3_price: e.target.value })}
                              className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-bold"
                            />
                          </div>
                          <div className="flex items-center pt-4">
                            <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-slate-700">
                              <input
                                type="checkbox"
                                checked={formData.bundle_3_free_shipping}
                                onChange={e => setFormData({ ...formData, bundle_3_free_shipping: e.target.checked })}
                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                              />
                              <span>🎁 شحن مجاني لهذا العرض</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* منظومة الكوبونات */}
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3 text-xs">
                  <h3 className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <span>🎟️</span> كود الخصم والكوبونات (اختياري)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">كود الخصم (الكوبون):</label>
                      <input
                        type="text"
                        placeholder="مثال: VIP10"
                        value={formData.coupon_code}
                        onChange={e => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase().trim() })}
                        className="w-full p-2.5 border border-indigo-200 rounded-xl bg-white uppercase font-mono outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">نوع الخصم:</label>
                      <select
                        value={formData.discount_type}
                        onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                        className="w-full p-2.5 border border-indigo-200 rounded-xl bg-white outline-none focus:border-indigo-500"
                      >
                        <option value="percentage">نسبة مئوية (%)</option>
                        <option value="fixed">مبلغ ثابت (ج.م)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">قيمة الخصم:</label>
                      <input
                        type="text"
                        placeholder="مثال: 10 أو 50"
                        value={formData.discount_value}
                        onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                        className="w-full p-2.5 border border-indigo-200 rounded-xl bg-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* منظومة الشحن والمحافظات */}
                <div className="p-4 bg-cyan-50/50 rounded-2xl border border-cyan-100 space-y-3 text-xs">
                  <h3 className="font-extrabold text-cyan-950 flex items-center gap-1.5">
                    <span>🚚</span> إعدادات مصاريف الشحن والتوصيل
                  </h3>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">نظام الشحن في صفحة المنتج:</label>
                    <select
                      value={formData.shipping_type}
                      onChange={e => setFormData({ ...formData, shipping_type: e.target.value })}
                      className="w-full p-2.5 border border-cyan-200 rounded-xl bg-white outline-none focus:border-cyan-500 font-bold"
                    >
                      <option value="free">🎁 شحن مجاني لكافة المحافظات (0 ج.م)</option>
                      <option value="flat">📦 سعر شحن موحد لجميع المحافظات</option>
                      <option value="zones">🗺️ سعر شحن مخصص ومختلف حسب المحافظة / النطاق</option>
                    </select>
                  </div>

                  {formData.shipping_type === 'flat' && (
                    <div className="pt-2">
                      <label className="font-bold text-slate-700 block mb-1">قيمة الشحن الموحد (ج.م):</label>
                      <input
                        type="text"
                        placeholder="مثال: 50"
                        value={formData.shipping_flat_rate}
                        onChange={e => setFormData({ ...formData, shipping_flat_rate: e.target.value })}
                        className="w-full p-2.5 border border-cyan-200 rounded-xl bg-white outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}

                  {formData.shipping_type === 'zones' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">القاهرة والجيزة:</label>
                        <input
                          type="text"
                          value={formData.shipping_cairo}
                          onChange={e => setFormData({ ...formData, shipping_cairo: e.target.value })}
                          className="w-full p-2 border border-cyan-200 rounded-xl bg-white text-center outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">بحري والدلتا:</label>
                        <input
                          type="text"
                          value={formData.shipping_delta}
                          onChange={e => setFormData({ ...formData, shipping_delta: e.target.value })}
                          className="w-full p-2 border border-cyan-200 rounded-xl bg-white text-center outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">الصعيد وقنا:</label>
                        <input
                          type="text"
                          value={formData.shipping_upper}
                          onChange={e => setFormData({ ...formData, shipping_upper: e.target.value })}
                          className="w-full p-2 border border-cyan-200 rounded-xl bg-white text-center outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">المناطق النائية:</label>
                        <input
                          type="text"
                          value={formData.shipping_remote}
                          onChange={e => setFormData({ ...formData, shipping_remote: e.target.value })}
                          className="w-full p-2 border border-cyan-200 rounded-xl bg-white text-center outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. إعدادات خاصة بقالب الحجوزات */}
            {formData.template_type === 'booking' && (
              <div className="p-4 bg-purple-50/60 rounded-2xl space-y-3 border border-purple-100 text-xs">
                <h3 className="font-bold text-purple-950">🗓️ إعدادات الفروع والأوقات المتاحة للحجز:</h3>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الفروع / القاعات (مفصولة بفاصلة):</label>
                  <input
                    type="text"
                    placeholder="مثال: فرع دمياط الجديدة, فرع المنصورة"
                    value={formData.branches}
                    onChange={e => setFormData({ ...formData, branches: e.target.value })}
                    className="w-full p-2.5 bg-white border border-purple-200 rounded-xl outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">أوقات الحجز اليومية (مفصولة بفاصلة):</label>
                  <input
                    type="text"
                    placeholder="12:00 م, 02:00 م, 04:00 م, 06:00 م, 08:00 م"
                    value={formData.available_times}
                    onChange={e => setFormData({ ...formData, available_times: e.target.value })}
                    className="w-full p-2.5 bg-white border border-purple-200 rounded-xl outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* 5. نصوص العرض والوصف */}
            <div className="text-xs">
              <label className="font-bold text-slate-700 block mb-1">العنوان الرئيسي الجذاب لصفحتك</label>
              <input
                type="text"
                required
                placeholder="مثال: احصلي على بشرة نضرة وخالية من العيوب بمكونات طبيعية 100%"
                value={formData.headline}
                onChange={e => setFormData({ ...formData, headline: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-purple-500 bg-white"
              />
            </div>

            <div className="text-xs">
              <label className="font-bold text-slate-700 block mb-1">الوصف وتفاصيل المميزات والفوائد</label>
              <textarea
                rows="4"
                placeholder="اكتب هنا نقاط القوة ومميزات المنتج بشكل نقاط منظمة لسهولة القراءة..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-purple-500 bg-white"
              ></textarea>
            </div>

            {/* 6. رفع الصور والمعرض */}
            <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-200/70 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">الصورة الرئيسية للمنتج / العرض</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMainUpload}
                  disabled={uploadingMain}
                  className="w-full text-xs cursor-pointer"
                />
                {uploadingMain && <span className="text-purple-600 font-bold block mt-1">جاري الرفع...</span>}
                {formData.product_image_url && <span className="text-emerald-600 font-bold block mt-1">✅ تم تفعيل الصورة الرئيسية</span>}
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="font-bold text-slate-700 block mb-1">معرض الصور الإضافية (حتى 4 صور إضافية)</label>
                {(formData.gallery_images || []).length < 4 && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    disabled={uploadingGallery}
                    className="w-full text-xs cursor-pointer"
                  />
                )}
                {uploadingGallery && <span className="text-purple-600 font-bold block mt-1">جاري رفع صورة المعرض...</span>}
                {formData.gallery_images?.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {formData.gallery_images.map((url, idx) => (
                      <div key={idx} className="relative group border aspect-square rounded-xl overflow-hidden bg-white shadow-xs">
                        <img src={url} alt="معرض" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, gallery_images: prev.gallery_images.filter((_, i) => i !== idx) }))}
                          className="absolute inset-0 bg-rose-600/80 text-white opacity-0 group-hover:opacity-100 font-bold text-xs flex items-center justify-center transition"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 7. بكسلات التتبع الإعلاني */}
            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-200/70 text-xs">
              <label className="font-bold text-slate-700 block">🎯 أكواد التتبع والبكسلات الإعلانية (Pixels)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Meta Pixel ID"
                  value={formData.meta_pixel_id}
                  onChange={e => setFormData({ ...formData, meta_pixel_id: e.target.value })}
                  className="p-2.5 border border-slate-200 rounded-xl bg-white dir-ltr outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  placeholder="TikTok Pixel ID"
                  value={formData.tiktok_pixel_id}
                  onChange={e => setFormData({ ...formData, tiktok_pixel_id: e.target.value })}
                  className="p-2.5 border border-slate-200 rounded-xl bg-white dir-ltr outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  placeholder="Snap Pixel ID"
                  value={formData.snapchat_pixel_id}
                  onChange={e => setFormData({ ...formData, snapchat_pixel_id: e.target.value })}
                  className="p-2.5 border border-slate-200 rounded-xl bg-white dir-ltr outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || uploadingMain || uploadingGallery}
              className="w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white font-extrabold rounded-2xl shadow-xl shadow-purple-500/20 transition transform active:scale-95 text-sm disabled:opacity-60"
            >
              {saving ? 'جاري الحفظ والتحميل...' : editingPageId ? '💾 حفظ تعديلات الصفحة' : '🚀 حفظ ونشر الصفحة الجديدة'}
            </button>
          </form>
        </div>

        {/* زر واتساب عائم للدعم الفني */}
        <a
          href="https://wa.me/201005825888?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%A5%D8%B9%D8%AF%D8%A7%D8%AF%20%D8%B5%D9%81%D8%AD%D8%AA%D9%8A%20%D8%B9%D9%84%D9%89%20Aipudio-LP"
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 left-5 z-50 bg-[#25D366] hover:bg-[#20ba59] text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2 transition hover:scale-105 active:scale-95"
          title="تواصل مع الدعم الفني"
        >
          <span className="text-xl">💬</span>
          <span className="text-xs font-bold hidden sm:inline">مساعدة سريعة؟</span>
        </a>

      </div>
    </div>
  )
}
