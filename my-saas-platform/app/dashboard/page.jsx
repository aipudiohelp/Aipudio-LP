'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    template_type: 'booking',
    business_name: '',
    headline: '',
    description: '',
    whatsapp_number: '',
    product_price: '',
    product_image_url: '',
    gallery_images: [],
    branches: 'الفرع الرئيسي',
    available_times: '12:00 م, 02:00 م, 04:00 م, 06:00 م, 08:00 م',
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
      template_type: page.template_type || 'booking',
      business_name: page.business_name || '',
      headline: page.headline || '',
      description: page.description || '',
      whatsapp_number: page.whatsapp_number || '',
      product_price: page.product_price || '',
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
    if (!confirm(`هل أنت متأكد من رغبتك في حذف صفحة "${pageTitle}" نهائياً؟ سيتم تحرير المساحة لإنشاء صفحة جديدة.`)) return
    
    const { error } = await supabase.from('landing_pages').delete().eq('id', pageId)
    if (error) {
      alert('خطأ أثناء الحذف: ' + error.message)
    } else {
      alert('تم حذف الصفحة بنجاح وتحرير المساحة!')
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
      alert(`عذراً، لقد استهلكت كامل المساحات النشطة (${maxAllowed} صفحات). يمكنك تعديل أو حذف إحدى صفحاتك الحالية أو الترقية لزيادة السعة.`)
      setSaving(false)
      return
    }

    const payload = {
      ...formData,
      user_id: user.id,
      slug: formData.slug.toLowerCase().trim().replace(/\s+/g, '-'),
    }

    let res
    if (editingPageId) {
      res = await supabase.from('landing_pages').update(payload).eq('id', editingPageId)
    } else {
      res = await supabase.from('landing_pages').insert([payload])
    }

    if (res.error) {
      alert('خطأ أثناء الحفظ: ' + res.error.message)
    } else {
      alert(editingPageId ? 'تم حفظ تعديلات الصفحة بنجاح!' : 'تم إنشاء ونشر الصفحة الجديدة بنجاح!')
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-purple-500 selection:text-white py-6 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* الشريط العلوي مع الشعار الرسمي */}
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
            <Link
              href="/"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition text-xs font-bold"
              title="الصفحة الرئيسية"
            >
              🏠
            </Link>
            {profile?.role === 'super_admin' && (
              <Link
                href="/admin"
                className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-95 transition"
              >
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

        {/* بطاقة حالة الاشتراك والمساحات */}
        <div
          className={`p-5 sm:p-6 rounded-3xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition shadow-sm ${
            isSubscriptionActive
              ? 'bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-cyan-50/70 border-purple-200/80 text-slate-900'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base">
                {isSubscriptionActive ? '✨ الاشتراك ساري ونشط' : '⛔ انتهت فترة الاشتراك التجريبية'}
              </span>
              <span className="text-[10px] bg-white text-slate-800 border px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                {profile?.plan_type === 'trial'
                  ? 'تجريبي مجاني (3 أيام)'
                  : profile?.plan_type === 'yearly'
                  ? 'باقة سنوية (10 صفحات)'
                  : 'باقة شهرية (3 صفحات)'}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {isSubscriptionActive
                ? `متبقي في اشتراكك ${daysLeft} يوماً (ينتهي: ${endDate?.toLocaleDateString('ar-EG')})`
                : 'يرجى تجديد الاشتراك لإعادة تفعيل صفحاتك واستقبال الطلبات.'}
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
            💳 تفعيل / ترقية الاشتراك
          </button>
        </div>

        {/* نافذة تفاصيل الدفع والتفعيل الفوري */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">باقات الاشتراك والتفعيل الفوري</h3>
                  <p className="text-[11px] text-slate-500">تحويل سريع عبر InstaPay أو المحافظ الإلكترونية</p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">المستفيد:</span>
                <strong className="text-slate-900 font-bold">{PAYMENT_INFO.account_holder}</strong>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200/80 space-y-2">
                  <span className="font-bold text-purple-950 block">⚡ إنستاباي (InstaPay):</span>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-purple-100">
                    <span className="font-mono font-bold text-slate-800 text-[11px]">{PAYMENT_INFO.instapay_id}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(PAYMENT_INFO.instapay_id, 'instapay_id')}
                      className="text-[11px] bg-purple-100 text-purple-800 font-bold px-2 py-1 rounded-lg hover:bg-purple-200 transition"
                    >
                      {copiedKey === 'instapay_id' ? 'تم النسخ ✅' : 'نسخ 📋'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-purple-100">
                    <span className="font-mono font-bold text-slate-800 text-[11px]">{PAYMENT_INFO.instapay_phone}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(PAYMENT_INFO.instapay_phone, 'instapay_phone')}
                      className="text-[11px] bg-purple-100 text-purple-800 font-bold px-2 py-1 rounded-lg hover:bg-purple-200 transition"
                    >
                      {copiedKey === 'instapay_phone' ? 'تم النسخ ✅' : 'نسخ 📋'}
                    </button>
                  </div>
                </div>

                <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200/70">
                  <span className="font-bold text-rose-950 block mb-1.5">📱 فودافون كاش / المحافظ:</span>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-rose-100">
                    <span className="font-mono font-black text-slate-900 text-xs">{PAYMENT_INFO.vodafone_cash}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(PAYMENT_INFO.vodafone_cash, 'vodafone_cash')}
                      className="text-[11px] bg-rose-100 text-rose-800 font-bold px-2 py-1 rounded-lg hover:bg-rose-200 transition"
                    >
                      {copiedKey === 'vodafone_cash' ? 'تم النسخ ✅' : 'نسخ 📋'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-2 text-slate-700">
                  <div className="flex justify-between items-center">
                    <span>• الباقة الشهرية (3 صفحات):</span>
                    <strong className="text-slate-900">{PAYMENT_INFO.monthly_price}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>• الباقة السنوية (10 صفحات):</span>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded text-[10px]">خصم 35% 🔥</span>
                      <strong className="text-purple-700">{PAYMENT_INFO.yearly_price}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const msg = `مرحباً، قمت بتحويل الاشتراك لمنصة Aipudio-LP:\n📧 البريد: ${user.email}\n🏪 النشاط: ${formData.business_name || 'جديد'}\nمرفق إشعار التحويل.`
                  window.open(`https://wa.me/${PAYMENT_INFO.support_whatsapp}?text=${encodeURIComponent(msg)}`, '_blank')
                }}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-extrabold rounded-2xl text-xs shadow-md transition"
              >
                💬 إرسال إشعار التحويل عبر واتساب للتفعيل الفوري
              </button>
            </div>
          </div>
        )}

        {/* قسم إدارة وقائمة الصفحات النشطة */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">📂 صفحاتي المنشورة ({usedPages})</h2>
              <p className="text-[11px] text-slate-400">يمكنك تعديل أي صفحة أو حذفها لتحرير المساحة فوراً</p>
            </div>
            {usedPages < maxPages && (
              <button
                onClick={resetToNew}
                className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                ➕ إضافة صفحة جديدة
              </button>
            )}
          </div>

          {userPages.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs space-y-1">
              <span className="text-2xl block mb-1">🚀</span>
              <p className="font-bold text-slate-700">لا توجد لديك صفحات منشورة بعد</p>
              <p className="text-[11px] text-slate-400">استخدم النموذج بالأسفل وأنشئ صفحتك الأولى في 60 ثانية</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userPages.map((page) => (
                <div
                  key={page.id}
                  className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                    editingPageId === page.id
                      ? 'border-purple-500 bg-purple-50/40 ring-2 ring-purple-500/20'
                      : 'bg-slate-50/80 hover:bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {page.business_name || 'صفحة بدون اسم'}
                      </span>
                                            <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600 font-bold">
                        {page.template_type === 'product' ? '📦 متجر / منتج' : '🎯 حجز موعد / بيانات'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <a
                        href={`/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-700 font-mono font-bold hover:underline dir-ltr"
                      >
                        /{page.slug}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyPageLink(page.slug)}
                        className="text-[10px] bg-white hover:bg-slate-100 text-slate-700 border px-2 py-0.5 rounded-md font-bold transition"
                      >
                        {copiedSlug === page.slug ? 'تم النسخ ✅' : 'نسخ الرابط 📋'}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span>👁️ الزيارات: <strong className="text-slate-800">{page.views_count || 0}</strong></span>
                      <span>💬 الطلبات: <strong className="text-emerald-600">{page.clicks_count || 0}</strong></span>
                      <span>📈 التحويل: <strong className="text-purple-600">{page.views_count > 0 ? ((page.clicks_count / page.views_count) * 100).toFixed(1) : '0.0'}%</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => startEdit(page)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
                    >
                      ✏️ تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePage(page.id, page.business_name || page.slug)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition border border-rose-100"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* نموذج إنشاء أو تعديل الصفحة */}
        <div id="form-section" className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {editingPageId ? '✏️ تعديل بيانات الصفحة المحددة' : '✨ إنشاء ونشر صفحة هبوط جديدة'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {editingPageId ? 'قم بتحديث النصوص والبيانات ثم اضغط حفظ' : 'أدخل بيانات نشاطك ليتم تجهيز رابطك فوراً'}
              </p>
            </div>
            {editingPageId && (
              <button
                type="button"
                onClick={resetToNew}
                className="text-xs text-purple-700 hover:underline font-bold"
              >
                إلغاء التعديل / إنشاء جديد ✕
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">نوع القالب والنشاط</label>
                <select
                  value={formData.template_type}
                  onChange={e => setFormData({ ...formData, template_type: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-purple-500 bg-white"
                >
                  <option value="booking">🎯 حجز موعد / تجميع بيانات (عيادات، مدرسين، صالونات)</option>
                  <option value="product">📦 بيع منتج مباشر (متاجر إلكترونية ودروب شيبينغ)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم الرابط بالإنجليزية (Slug)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: dr-walaa أو offer-1"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-2xl dir-ltr outline-none focus:border-purple-500 bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم النشاط / المركز / المتجر</label>
                <input
                  type="text"
                  required
                  value={formData.business_name}
                  onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-purple-500 bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">رقم الواتساب مع كود الدولة</label>
                <input
                  type="text"
                  required
                  placeholder="2010xxxxxxxx"
                  value={formData.whatsapp_number}
                  onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-2xl dir-ltr outline-none focus:border-purple-500 bg-white font-mono"
                />
              </div>
            </div>

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

            <div className="text-xs">
              <label className="font-bold text-slate-700 block mb-1">العنوان الرئيسي الجذاب</label>
              <input
                type="text"
                required
                value={formData.headline}
                onChange={e => setFormData({ ...formData, headline: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-purple-500 bg-white"
              />
            </div>

            <div className="text-xs">
              <label className="font-bold text-slate-700 block mb-1">الوصف وتفاصيل العرض</label>
              <textarea
                rows="3"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-purple-500 bg-white"
              ></textarea>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-200/70 text-xs">
              {formData.template_type === 'product' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">سعر المنتج (اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: 350"
                    value={formData.product_price}
                    onChange={e => setFormData({ ...formData, product_price: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">الصورة الرئيسية</label>
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
                <label className="font-bold text-slate-700 block mb-1">معرض الصور (حتى 4 صور إضافية)</label>
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

      </div>
    </div>
  )
}
