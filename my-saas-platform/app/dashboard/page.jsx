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
    support_whatsapp: '201501665571',
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

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
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
    if (!confirm(`هل أنت متأكد من رغبتك في حذف صفحة "${pageTitle}" نهائياً؟ سيتم تحرير المساحة لإنشاء صفحة أخرى.`)) return
    
    const { error } = await supabase.from('landing_pages').delete().eq('id', pageId)
    if (error) {
      alert('خطأ أثناء الحذف: ' + error.message)
    } else {
      alert('تم حذف الصفحة وتحرير المساحة بنجاح!')
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
    } catch (err) { alert('خطأ: ' + err.message) }
    finally { setUploadingMain(false) }
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
    } catch (err) { alert('خطأ: ' + err.message) }
    finally { setUploadingGallery(false) }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    const maxAllowed = profile?.max_pages || 1
    if (!editingPageId && userPages.length >= maxAllowed) {
      alert(`عذراً، لقد استهلكت كامل المساحات النشطة لباقاتك (${maxAllowed} صفحات). يمكنك تعديل أو حذف إحدى صفحاتك الحالية، أو الترقية لزيادة السعة.`)
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
      alert(editingPageId ? 'تم تحديث الصفحة بنجاح!' : 'تم إنشاء ونشر الصفحة الجديدة بنجاح!')
      resetToNew()
      await loadDashboard()
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center font-bold text-slate-700">جاري تحميل لوحة التحكم...</div>

  const now = new Date()
  const endDate = profile?.subscription_end ? new Date(profile.subscription_end) : null
  const daysLeft = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0
  const isSubscriptionActive = profile?.is_active && daysLeft > 0

  const maxPages = profile?.max_pages || 1
  const usedPages = userPages.length
  const remainingPages = Math.max(0, maxPages - usedPages)

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      {/* الشريط العلوي */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition">🏠</Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">لوحة تحكم النشاط</h1>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {profile?.role === 'super_admin' && <Link href="/admin" className="px-3.5 py-2 bg-purple-50 text-purple-700 text-xs font-bold rounded-xl">👑 الإدارة</Link>}
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="px-4 py-2 text-xs bg-red-50 text-red-600 rounded-xl font-bold">خروج</button>
        </div>
      </div>

      {/* شريط حالة الاشتراك والسعة */}
      <div className={`p-5 rounded-2xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border ${isSubscriptionActive ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">{isSubscriptionActive ? '✅ الاشتراك ساري' : '⛔ انتهت فترة الاشتراك'}</span>
            <span className="text-xs bg-white px-2.5 py-0.5 rounded-full font-bold shadow-sm">
              {profile?.plan_type === 'trial' ? 'تجريبي مجاني' : profile?.plan_type === 'yearly' ? 'باقة سنوية' : 'باقة شهرية'}
            </span>
          </div>
          <p className="text-xs opacity-80">{isSubscriptionActive ? `متبقي ${daysLeft} يوماً (${endDate?.toLocaleDateString('ar-EG')})` : 'يرجى تجديد الاشتراك لإعادة التفعيل.'}</p>
          
          <div className="flex items-center gap-2 pt-1 text-xs font-bold">
            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">
              📄 الصفحات النشطة: {usedPages} من {maxPages} (متبقي {remainingPages} مساحة)
            </span>
          </div>
        </div>

        <button onClick={() => setShowPaymentModal(true)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition">💳 ترقية / تجديد الاشتراك</button>
      </div>

      {/* نافذة تفاصيل الدفع */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-lg text-slate-800">باقات الاشتراك والتفعيل الفوري</h3>
              <button onClick={() => setShowPaymentModal(false)} className="font-bold text-xl text-slate-400">✕</button>
            </div>

            <div className="bg-slate-100 p-3 rounded-xl flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">المستفيد:</span>
              <strong className="text-slate-800 text-sm">{PAYMENT_INFO.account_holder}</strong>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100 space-y-2">
                <span className="font-bold text-purple-900 block">⚡ InstaPay:</span>
                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border">
                  <span className="font-mono font-bold text-slate-800">{PAYMENT_INFO.instapay_id}</span>
                  <button type="button" onClick={() => copyToClipboard(PAYMENT_INFO.instapay_id, 'instapay_id')} className="text-[11px] bg-purple-100 text-purple-800 font-bold px-2 py-1 rounded-md">{copiedKey === 'instapay_id' ? 'تم النسخ ✅' : 'نسخ 📋'}</button>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border">
                  <span className="font-mono font-bold text-slate-800">{PAYMENT_INFO.instapay_phone}</span>
                  <button type="button" onClick={() => copyToClipboard(PAYMENT_INFO.instapay_phone, 'instapay_phone')} className="text-[11px] bg-purple-100 text-purple-800 font-bold px-2 py-1 rounded-md">{copiedKey === 'instapay_phone' ? 'تم النسخ ✅' : 'نسخ 📋'}</button>
                </div>
              </div>

              <div className="bg-red-50 p-3 rounded-2xl border border-red-100">
                <span className="font-bold text-red-900 block mb-1">📱 فودافون كاش:</span>
                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border">
                  <span className="font-mono font-black text-slate-800 text-sm">{PAYMENT_INFO.vodafone_cash}</span>
                  <button type="button" onClick={() => copyToClipboard(PAYMENT_INFO.vodafone_cash, 'vodafone_cash')} className="text-[11px] bg-red-100 text-red-800 font-bold px-2 py-1 rounded-md">{copiedKey === 'vodafone_cash' ? 'تم النسخ ✅' : 'نسخ 📋'}</button>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border space-y-2 text-slate-700">
                <div className="flex justify-between items-center">
                  <span>• الباقة الشهرية (3 صفحات):</span>
                  <strong className="text-slate-900">{PAYMENT_INFO.monthly_price}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>• الباقة السنوية (10 صفحات):</span>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded text-[10px]">خصم 35% 🔥</span>
                    <strong className="text-emerald-700">{PAYMENT_INFO.yearly_price}</strong>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const msg = `مرحباً، قمت بتحويل الاشتراك لمنصة Aipudio-LP:\n📧 البريد: ${user.email}\n🏪 النشاط: ${formData.business_name || 'جديد'}\nمرفق صورة التحويل.`
                window.open(`https://wa.me/${PAYMENT_INFO.support_whatsapp}?text=${encodeURIComponent(msg)}`, '_blank')
              }}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow transition"
            >
              💬 إرسال صورة التحويل عبر واتساب
            </button>
          </div>
        </div>
      )}

      {/* قسم إدارة وقائمة الصفحات النشطة */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-800">📂 صفحاتي المنشورة ({usedPages})</h2>
          {usedPages < maxPages && (
            <button
              onClick={resetToNew}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              ➕ إضافة صفحة جديدة
            </button>
          )}
        </div>

        {userPages.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-xs">
            لا توجد لديك صفحات منشورة حتى الآن. استخدم النموذج أدناه لإنشاء صفحتك الأولى! 🚀
          </div>
        ) : (
          <div className="space-y-3">
            {userPages.map((page, idx) => (
              <div
                key={page.id}
                className={`p-4 rounded-xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                  editingPageId === page.id ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{page.business_name || 'بدون اسم'}</span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border text-slate-600 font-bold">
                      {page.template_type === 'product' ? '📦 متجر' : '🎯 حجز موعد'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <a
                      href={`/${page.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 font-mono font-bold hover:underline dir-ltr"
                    >
                      /{page.slug}
                    </a>
                    <button
                      type="button"
                      onClick={() => copyPageLink(page.slug)}
                      className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded font-bold transition"
                    >
                      {copiedSlug === page.slug ? 'تم النسخ ✅' : 'نسخ الرابط 📋'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span>👁️ الزيارات: <strong>{page.views_count || 0}</strong></span>
                    <span>💬 الطلبات: <strong>{page.clicks_count || 0}</strong></span>
                    <span>📈 التحويل: <strong>{page.views_count > 0 ? ((page.clicks_count / page.views_count) * 100).toFixed(1) : '0.0'}%</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0">
                  <button
                    type="button"
                    onClick={() => startEdit(page)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
                  >
                    ✏️ تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePage(page.id, page.business_name || page.slug)}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition"
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
      <div id="form-section" className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-base font-bold text-slate-800">
            {editingPageId ? '✏️ تعديل بيانات الصفحة المحددة' : '✨ إنشاء ونشر صفحة جديدة'}
          </h2>
          {editingPageId && (
            <button
              type="button"
              onClick={resetToNew}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold underline"
            >
              إلغاء التعديل / صفحة جديدة ✕
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">نوع القالب</label>
              <select value={formData.template_type} onChange={e => setFormData({ ...formData, template_type: e.target.value })} className="w-full p-2.5 border rounded-xl outline-none">
                <option value="booking">حجز موعد / تجميع بيانات (عيادات، معلمين، صالونات)</option>
                <option value="product">بيع منتج مباشر (متاجر ودروب شيبينغ)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">اسم الرابط (Slug بالإنجليزية)</label>
              <input type="text" required placeholder="مثال: dr-walaa أو offer-1" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} className="w-full p-2.5 border rounded-xl dir-ltr outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">اسم النشاط / المركز / المتجر</label>
              <input type="text" required value={formData.business_name} onChange={e => setFormData({ ...formData, business_name: e.target.value })} className="w-full p-2.5 border rounded-xl outline-none" />
            </div>
            <div>
                          <label className="font-bold text-slate-700 block mb-1">رقم الواتساب مع كود الدولة</label>
            <input type="text" required placeholder="2010xxxxxxxx" value={formData.whatsapp_number} onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })} className="w-full p-2.5 border rounded-xl dir-ltr outline-none" />
          </div>
        </div>

        {formData.template_type === 'booking' && (
          <div className="p-4 bg-purple-50/60 rounded-xl space-y-3 border border-purple-100 text-xs">
            <h3 className="font-bold text-purple-950">🗓️ إعدادات الفروع والأوقات المتاحة للحجز:</h3>
            <div>
              <label className="font-bold text-slate-700 block mb-1">الفروع / القاعات (مفصولة بفاصلة):</label>
              <input
                type="text"
                placeholder="مثال: فرع دمياط الجديدة, فرع المنصورة"
                value={formData.branches}
                onChange={e => setFormData({ ...formData, branches: e.target.value })}
                className="w-full p-2.5 bg-white border rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">أوقات الحجز اليومية (مفصولة بفاصلة):</label>
              <input
                type="text"
                placeholder="12:00 م, 02:00 م, 04:00 م, 06:00 م, 08:00 م"
                value={formData.available_times}
                onChange={e => setFormData({ ...formData, available_times: e.target.value })}
                className="w-full p-2.5 bg-white border rounded-xl outline-none"
              />
            </div>
          </div>
        )}

        <div className="text-xs">
          <label className="font-bold text-slate-700 block mb-1">العنوان الرئيسي</label>
          <input type="text" required value={formData.headline} onChange={e => setFormData({ ...formData, headline: e.target.value })} className="w-full p-2.5 border rounded-xl outline-none" />
        </div>

        <div className="text-xs">
          <label className="font-bold text-slate-700 block mb-1">الوصف والتفاصيل</label>
          <textarea rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-2.5 border rounded-xl outline-none"></textarea>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl space-y-3 border text-xs">
          {formData.template_type === 'product' && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">سعر المنتج (اختياري)</label>
              <input type="text" placeholder="350" value={formData.product_price} onChange={e => setFormData({ ...formData, product_price: e.target.value })} className="w-full p-2.5 border rounded-xl bg-white outline-none" />
            </div>
          )}
          <div>
            <label className="font-bold text-slate-700 block mb-1">الصورة الرئيسية</label>
            <input type="file" accept="image/*" onChange={handleMainUpload} disabled={uploadingMain} className="w-full text-xs cursor-pointer" />
            {uploadingMain && <span className="text-emerald-600 font-bold block mt-1">جاري الرفع...</span>}
            {formData.product_image_url && <span className="text-emerald-600 font-bold block mt-1">✅ تم تفعيل الصورة الرئيسية</span>}
          </div>
          <div className="pt-2 border-t">
            <label className="font-bold text-slate-700 block mb-1">معرض الصور (حتى 4 صور)</label>
            {(formData.gallery_images || []).length < 4 && <input type="file" accept="image/*" onChange={handleGalleryUpload} disabled={uploadingGallery} className="w-full text-xs cursor-pointer" />}
            {uploadingGallery && <span className="text-emerald-600 font-bold block mt-1">جاري رفع صورة المعرض...</span>}
            {formData.gallery_images?.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {formData.gallery_images.map((url, idx) => (
                  <div key={idx} className="relative group border aspect-square rounded-lg overflow-hidden bg-white">
                    <img src={url} alt="معرض" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, gallery_images: prev.gallery_images.filter((_, i) => i !== idx) }))} className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 font-bold text-xs flex items-center justify-center transition">حذف</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl space-y-2 border text-xs">
          <label className="font-bold text-slate-700 block">🎯 البكسلات الإعلانية (اختياري)</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input type="text" placeholder="Meta Pixel ID" value={formData.meta_pixel_id} onChange={e => setFormData({ ...formData, meta_pixel_id: e.target.value })} className="p-2 border rounded-xl bg-white dir-ltr outline-none" />
            <input type="text" placeholder="TikTok Pixel ID" value={formData.tiktok_pixel_id} onChange={e => setFormData({ ...formData, tiktok_pixel_id: e.target.value })} className="p-2 border rounded-xl bg-white dir-ltr outline-none" />
            <input type="text" placeholder="Snap Pixel ID" value={formData.snapchat_pixel_id} onChange={e => setFormData({ ...formData, snapchat_pixel_id: e.target.value })} className="p-2 border rounded-xl bg-white dir-ltr outline-none" />
          </div>
        </div>

        <button type="submit" disabled={saving || uploadingMain || uploadingGallery} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow transition">
          {saving ? 'جاري الحفظ...' : editingPageId ? '💾 حفظ تعديلات الصفحة' : '🚀 حفظ ونشر الصفحة الجديدة'}
        </button>
      </form>
    </div>
  </div>
)
}
