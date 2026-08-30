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

  // رفع الصورة الرئيسية
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

  // رفع صورة لمعرض الصور المتعدد
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

  const removeGalleryImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, idx) => idx !== indexToRemove)
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
      alert('تم حفظ وتحديث صفحة الهبوط والإعدادات بنجاح!')
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="p-8 text-center text-slate-600 font-bold">جاري تحميل لوحة التحكم...</div>

  const views = formData.views_count || 0
  const clicks = formData.clicks_count || 0
  const conversionRate = views > 0 ? ((clicks / views) * 100).toFixed(1) : '0.0'

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      {/* الشريط العلوي */}
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

      {/* قسم الإحصائيات ومعدل التحويل (Analytics) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">إجمالي الزيارات (Views)</span>
            <p className="text-2xl font-black text-slate-800 mt-1">{views}</p>
          </div>
          <span className="text-2xl p-3 bg-blue-50 text-blue-600 rounded-2xl">👁️</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">طلبات الواتساب (Clicks)</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{clicks}</p>
          </div>
          <span className="text-2xl p-3 bg-emerald-50 text-emerald-600 rounded-2xl">💬</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">معدل التحويل (Conversion)</span>
            <p className="text-2xl font-black text-purple-600 mt-1">{conversionRate}%</p>
          </div>
          <span className="text-2xl p-3 bg-purple-50 text-purple-600 rounded-2xl">📈</span>
        </div>
      </div>

      {!profile?.is_active && (
        <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-xl mb-6 text-amber-900 text-sm font-medium">
          ⚠️ <strong>تنبيه:</strong> حسابك في وضع المعاينة. بعد حفظ الإعدادات، تواصل مع الإدارة لتفعيل نشر الصفحة للعامة.
        </div>
      )}

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

        {/* قسم رفع الصور ومعرض الصور المتعدد */}
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

          {/* الصورة الأساسية */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الصورة الرئيسية للمنتج</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleMainUpload}
              disabled={uploadingMain}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
            />
            {uploadingMain && <span className="text-xs text-emerald-600 font-bold block mt-1">جاري رفع الصورة الرئيسية...</span>}
            {formData.product_image_url && (
              <div className="mt-2 flex items-center gap-3 bg-white p-2 rounded-xl border">
                <img src={formData.product_image_url} alt="الرئيسية" className="w-12 h-12 object-cover rounded-lg border" />
                <span className="text-xs text-emerald-600 font-bold flex-1">الصورة الرئيسية مفعلة ✅</span>
              </div>
            )}
          </div>

          {/* معرض الصور الإضافية (Gallery) */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-700">
                معرض صور إضافي (حتى 4 صور للمعاينة أو آراء العملاء)
              </label>
              <span className="text-[11px] text-slate-400">({formData.gallery_images?.length || 0} / 4)</span>
            </div>

            {(formData.gallery_images?.length || 0) < 4 && (
              <input
                type="file"
                accept="image/*"
                onChange={handleGalleryUpload}
                disabled={uploadingGallery}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-700 file:text-white hover:file:bg-slate-800 cursor-pointer"
              />
            )}
            {uploadingGallery && <span className="text-xs text-emerald-600 font-bold block mt-1">جاري رفع الصورة للمعرض...</span>}

            {formData.gallery_images?.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {formData.gallery_images.map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border aspect-square bg-white">
                    <img src={url} alt="معرض" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(idx)}
                      className="absolute inset-0 bg-red-600/80 text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* قسم البكسلات والتتبع الإعلاني (Pixels) */}
        <div className="p-5 bg-slate-50 rounded-2xl space-y-4 border border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm">🎯 التتبع الإعلاني والـ Pixels (اختياري)</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Meta Pixel (Facebook & Insta)</label>
              <input
                type="text"
                placeholder="1234567890"
                value={formData.meta_pixel_id}
                onChange={(e) => setFormData({ ...formData, meta_pixel_id: e.target.value })}
                className="w-full px-3.5 py-2 border rounded-xl outline-none text-xs bg-white dir-ltr text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">TikTok Pixel ID</label>
              <input
                type="text"
                placeholder="C1234567890ABC"
                value={formData.tiktok_pixel_id}
                onChange={(e) => setFormData({ ...formData, tiktok_pixel_id: e.target.value })}
                className="w-full px-3.5 py-2 border rounded-xl outline-none text-xs bg-white dir-ltr text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Snapchat Pixel ID</label>
              <input
                type="text"
                placeholder="xxxxxxxx-xxxx-xxxx"
                value={formData.snapchat_pixel_id}
                onChange={(e) => setFormData({ ...formData, snapchat_pixel_id: e.target.value })}
                className="w-full px-3.5 py-2 border rounded-xl outline-none text-xs bg-white dir-ltr text-right"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || uploadingMain || uploadingGallery}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition shadow-lg shadow-emerald-600/20 text-base"
        >
          {saving ? 'جاري حفظ التعديلات...' : 'حفظ ونشر الصفحة 🚀'}
        </button>
      </form>
    </div>
  )
}
