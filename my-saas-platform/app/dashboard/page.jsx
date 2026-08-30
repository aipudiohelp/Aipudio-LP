'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [origin, setOrigin] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    slug: '',
    template_type: 'booking',
    business_name: '',
    headline: '',
    description: '',
    whatsapp_number: '',
    product_price: '',
    product_image_url: '',
    gallery_images: [],
    meta_pixel_id: '',
    tiktok_pixel_id: '',
    snapchat_pixel_id: '',
    views_count: 0,
    clicks_count: 0,
  })

  // بيانات حسابات الدفع المحدثة
  const PAYMENT_INFO = {
    account_holder: 'مصطفى بدر',
    instapay_id: 'mustafa.nbe015@instapay', // معرف إنستاباي
    instapay_phone: '01501665571',        // رقم الهاتف لإنستاباي
    vodafone_cash: '01501665571',         // رقم فودافون كاش / المحافظ
    support_whatsapp: '201005825888',     // رقم واتساب الإدارة لاستقبال الإيصالات (بدون +)
    monthly_price: '99 ج.م / شهرياً',
    yearly_price: '799 ج.م / سنوياً',
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }

    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setProfile(prof)

      const { data: page } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (page) {
        setFormData({
          ...page,
          gallery_images: Array.isArray(page.gallery_images) ? page.gallery_images : [],
          views_count: page.views_count || 0,
          clicks_count: page.clicks_count || 0
        })
      }
      setLoading(false)
    }
    loadData()
  }, [router])

  const handleMainUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingMain(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-main-${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('landing-images').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('landing-images').getPublicUrl(fileName)
      setFormData(prev => ({ ...prev, product_image_url: publicUrl }))
    } catch (err) {
      alert('خطأ أثناء الرفع: ' + err.message)
    } finally {
      setUploadingMain(false)
    }
  }

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if ((formData.gallery_images || []).length >= 4) {
      alert('الحد الأقصى لمعرض الصور هو 4 صور إضافية.')
      return
    }

    setUploadingGallery(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-gallery-${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('landing-images').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('landing-images').getPublicUrl(fileName)
      setFormData(prev => ({
        ...prev,
        gallery_images: [...(prev.gallery_images || []), publicUrl]
      }))
    } catch (err) {
      alert('خطأ أثناء الرفع: ' + err.message)
    } finally {
      setUploadingGallery(false)
    }
  }

  const removeGalleryImage = (idxToRemove) => {
    setFormData(prev => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, idx) => idx !== idxToRemove)
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      ...formData,
      user_id: user.id,
      slug: formData.slug.toLowerCase().trim().replace(/\s+/g, '-'),
    }

    const { error } = await supabase
      .from('landing_pages')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) {
      alert('خطأ أثناء الحفظ: ' + error.message)
    } else {
      alert('تم حفظ وتحديث صفحة الهبوط بنجاح!')
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="p-8 text-center text-slate-600 font-bold">جاري تحميل لوحة التحكم...</div>

  const now = new Date()
  const endDate = profile?.subscription_end ? new Date(profile.subscription_end) : null
  const daysLeft = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0
  const isSubscriptionActive = profile?.is_active && daysLeft > 0

  // رسالة الواتساب المحدثة باسم Aipudio-LP
  const sendPaymentProof = () => {
    const msg = `مرحباً، قمت بتحويل الاشتراك لمنصة Aipudio-LP:\n📧 البريد المسجل: ${user.email}\n🏪 النشاط: ${formData.business_name || 'جديد'}\nمرفق صورة التحويل لتفعيل الاشتراك.`
    window.open(`https://wa.me/${PAYMENT_INFO.support_whatsapp}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      {/* الهيدر العلوي */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            title="الرجوع للصفحة الرئيسية"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">لوحة تحكم النشاط</h1>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profile?.role === 'super_admin' && (
            <Link
              href="/admin"
              className="px-3.5 py-2 bg-purple-50 text-purple-700 text-xs sm:text-sm font-bold rounded-xl hover:bg-purple-100 transition"
            >
              👑 لوحة المدير
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-xs sm:text-sm bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition font-bold"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* شريط حالة الاشتراك */}
      <div className={`p-5 rounded-2xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border ${
        isSubscriptionActive
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          : 'bg-red-50 border-red-200 text-red-900'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">
              {isSubscriptionActive ? '✅ الاشتراك ساري' : '⛔ انتهت فترة الاشتراك أو التجربة'}
            </span>
            <span className="text-xs bg-white px-2.5 py-0.5 rounded-full font-bold shadow-sm">
              {profile?.plan_type === 'trial' ? 'تجريبي مجاني' : 'باقة مفعلة'}
            </span>
          </div>
          <p className="text-xs mt-1 opacity-80">
            {isSubscriptionActive
              ? `متبقي ${daysLeft} يوماً حتى تاريخ (${endDate?.toLocaleDateString('ar-EG')})`
              : 'صفحتك معلقة حالياً عن استقبال الزوار. يرجى تجديد الاشتراك لإعادة التفعيل فوراً.'}
          </p>
        </div>

        <button
          onClick={() => setShowPaymentModal(true)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md whitespace-nowrap"
        >
          💳 تفعيل / تجديد الاشتراك
        </button>
      </div>

      {/* نافذة تفاصيل الدفع المحدثة */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-lg text-slate-800">طرق الدفع والتفعيل الفوري</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >✕</button>
            </div>

            {/* اسم صاحب الحساب المستفيد */}
            <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">اسم صاحب الحساب المستفيد:</span>
              <span className="font-bold text-slate-800 text-sm">{PAYMENT_INFO.account_holder}</span>
            </div>

            <div className="space-y-3 text-sm">
              {/* إنستاباي */}
              <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-100 space-y-1.5">
                <span className="font-bold text-purple-900 text-xs block">⚡ التحويل عبر InstaPay (معرف / رقم):</span>
                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border text-xs font-mono font-bold text-slate-800">
                  <span className="text-[11px] text-slate-400 font-normal">المعرف:</span>
                  <span>{PAYMENT_INFO.instapay_id}</span>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border text-xs font-mono font-bold text-slate-800">
                  <span className="text-[11px] text-slate-400 font-normal">رقم الهاتف:</span>
                  <span>{PAYMENT_INFO.instapay_phone}</span>
                </div>
              </div>

              {/* فودافون كاش */}
              <div className="bg-red-50 p-3.5 rounded-2xl border border-red-100">
                <span className="font-bold text-red-900 text-xs block mb-1.5">📱 التحويل عبر فودافون كاش / المحافظ:</span>
                <code className="text-sm bg-white py-1.5 rounded-lg border font-mono font-black text-slate-800 block text-center">
                  {PAYMENT_INFO.vodafone_cash}
                </code>
              </div>
            </div>

            {/* الباقات ونسبة الخصم 35% */}
            <div className="bg-slate-50 p-3.5 rounded-xl text-xs text-slate-700 space-y-1.5 border border-slate-100">
              <div className="flex justify-between">
                <span>• الاشتراك الشهري:</span>
                <strong className="text-slate-900">{PAYMENT_INFO.monthly_price}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>• الاشتراك السنوي:</span>
                <div className="flex items-center gap-1.5">
                  <span className="bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded text-[10px]">خصم 35% 🔥</span>
                  <strong className="text-emerald-700">{PAYMENT_INFO.yearly_price}</strong>
                </div>
              </div>
            </div>

            <button
              onClick={sendPaymentProof}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
            >
              <span>💬 إرسال صورة التحويل عبر واتساب للتفعيل</span>
            </button>
          </div>
        </div>
      )}

      {/* قسم الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">إجمالي الزيارات</span>
            <p className="text-2xl font-black text-slate-800 mt-1">{formData.views_count || 0}</p>
          </div>
          <span className="text-2xl p-3 bg-blue-50 text-blue-600 rounded-2xl">👁️</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">طلبات الواتساب</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{formData.clicks_count || 0}</p>
          </div>
          <span className="text-2xl p-3 bg-emerald-50 text-emerald-600 rounded-2xl">💬</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">معدل التحويل</span>
            <p className="text-2xl font-black text-purple-600 mt-1">
              {formData.views_count > 0 ? ((formData.clicks_count / formData.views_count) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
          <span className="text-2xl p-3 bg-purple-50 text-purple-600 rounded-2xl">📈</span>
        </div>
      </div>

      {formData.slug && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-emerald-900 text-sm font-medium">رابط صفحتك المباشر:</span>
          <a
            href={`/${formData.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-700 font-bold hover:underline dir-ltr text-sm"
          >
            {origin ? `${origin}/${formData.slug}` : `/${formData.slug}`}
          </a>
        </div>
      )}

      {/* نموذج التعديل */}
      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <h2 className="text-lg font-bold text-slate-800 border-b pb-3">إعدادات صفحة الهبوط</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">نوع القالب</label>
            <select
              value={formData.template_type}
              onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            >
              <option value="booking">حجز موعد / تجميع بيانات (مدرسين، عيادات، خدمات)</option>
              <option value="product">بيع منتج مباشر (متاجر إلكترونية، دروب شيبينغ)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">اسم الرابط (Slug بالإنجليزية)</label>
            <input
              type="text"
              required
              placeholder="مثال: dr-ahmed أو trend-watch"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-left text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">اسم النشاط / المتجر</label>
            <input
              type="text"
              required
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">رقم الواتساب مع كود الدولة</label>
            <input
              type="text"
              required
              placeholder="مثال: 201012345678"
              value={formData.whatsapp_number}
              onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-left text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">العنوان الرئيسي الجذاب (Headline)</label>
          <input
            type="text"
            required
            placeholder="مثال: احجز الآن في أقوى معسكر تأسيس"
            value={formData.headline}
            onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">الوصف والتفاصيل</label>
          <textarea
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          ></textarea>
        </div>

        {/* قسم الصور */}
        <div className="p-5 bg-slate-50 rounded-2xl space-y-5 border border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm">
            {formData.template_type === 'product' ? 'صور المنتج والتفاصيل:' : 'صور الخدمة والغلاف:'}
          </h3>

          {formData.template_type === 'product' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سعر المنتج (بالجنيه)</label>
              <input
                type="text"
                placeholder="مثال: 350"
                value={formData.product_price}
                onChange={(e) => setFormData({ ...formData, product_price: e.target.value })}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الصورة الرئيسية للمنتج</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleMainUpload}
              disabled={uploadingMain}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
            />
            {uploadingMain && <span className="text-xs text-emerald-600 font-bold block mt-1">جاري رفع الصورة...</span>}
            {formData.product_image_url && (
              <div className="mt-2 flex items-center gap-3 bg-white p-2 rounded-xl border">
                <img src={formData.product_image_url} alt="الرئيسية" className="w-12 h-12 object-cover rounded-lg border" />
                <span className="text-xs text-emerald-600 font-bold flex-1">الصورة الرئيسية مفعلة ✅</span>
              </div>
            )}
          </div>

          <d
