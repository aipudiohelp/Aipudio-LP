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
  const [uploadingImg, setUploadingImg] = useState(false)
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
    meta_pixel_id: '',
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
        setFormData(page)
      }
      setLoading(false)
    }
    loadData()
  }, [router])

  // دالة الرفع المباشر للصور إلى Supabase Storage
  const handleFileUpload = async (e) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return

      if (file.size > 5 * 1024 * 1024) {
        alert('أقصى حجم مسموح به للصورة هو 5 ميجابايت')
        return
      }

      setUploadingImg(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('landing-images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('landing-images')
        .getPublicUrl(filePath)

      setFormData((prev) => ({ ...prev, product_image_url: publicUrl }))
      alert('تم رفع الصورة بنجاح!')
    } catch (err) {
      alert('خطأ أثناء رفع الصورة: ' + err.message)
    } finally {
      setUploadingImg(false)
    }
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

  if (loading) return <div className="p-8 text-center text-slate-600">جاري تحميل لوحة التحكم...</div>

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      {/* شريط الرأس العلوي مع زر الرجوع للرئيسية */}
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

      {!profile?.is_active && (
        <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-xl mb-6 text-amber-900 text-sm font-medium">
          ⚠️ <strong>تنبيه:</strong> حسابك في وضع المعاينة (غير مفعّل رسمياً). بعد حفظ الإعدادات، تواصل مع الإدارة لتفعيل نشر الصفحة للعامة.
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
            placeholder="مثال: احجز الآن في أقوى معسكر تأسيس للثانوية العامة"
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

        {/* قسم بيانات ورفع صورة المنتج المباشر */}
        <div className="p-5 bg-slate-50 rounded-2xl space-y-4 border border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm">
            {formData.template_type === 'product' ? 'بيانات المنتج والصورة:' : 'صورة الغلاف / اللوجو (اختياري):'}
          </h3>

          {formData.template_type === 'product' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سعر المنتج (بالجنيه/العملة)</label>
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
            <label className="block text-xs font-bold text-slate-700 mb-2">رفع الصورة مباشرة من الجهاز</label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadingImg}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
              />
              {uploadingImg && <span className="text-xs text-emerald-600 font-bold animate-pulse">جاري رفع الصورة...</span>}
            </div>

            {formData.product_image_url && (
              <div className="mt-3 flex items-center gap-3 bg-white p-2.5 rounded-xl border">
                <img
                  src={formData.product_image_url}
                  alt="معاينة"
                  className="w-14 h-14 object-cover rounded-lg border"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-emerald-600 font-bold block">تم رفع الصورة بنجاح ✅</span>
                  <span className="text-[11px] text-slate-400 truncate block dir-ltr text-right">{formData.product_image_url}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, product_image_url: '' })}
                  className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1"
                >
                  حذف
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Meta Pixel ID (اختياري)</label>
          <input
            type="text"
            placeholder="مثال: 123456789012345"
            value={formData.meta_pixel_id}
            onChange={(e) => setFormData({ ...formData, meta_pixel_id: e.target.value })}
            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-left text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving || uploadingImg}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition shadow-lg shadow-emerald-600/20 text-base"
        >
          {saving ? 'جاري حفظ التعديلات...' : 'حفظ ونشر الصفحة 🚀'}
        </button>
      </form>
    </div>
  )
      }
      
