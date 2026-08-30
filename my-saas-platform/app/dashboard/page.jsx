'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">لوحة تحكم النشاط</h1>
          <p className="text-xs sm:text-sm text-slate-500">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
        >
          تسجيل الخروج
        </button>
      </div>

      {!profile?.is_active && (
        <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-xl mb-6 text-amber-900 text-sm">
          ⚠️ <strong>تنبيه:</strong> حسابك في وضع المعاينة (غير مفعّل رسمياً). يمكنك تجربة وحفظ الإعدادات، ولتفعيل الرابط للعامة يرجى التواصل مع الإدارة.
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
            <label className="block text-sm font-medium text-slate-700 mb-1">نوع القالب</label>
            <select
              value={formData.template_type}
              onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="booking">حجز موعد / تجميع بيانات (مدرسين، عيادات، خدمات)</option>
              <option value="product">بيع منتج مباشر (متاجر إلكترونية، دروب شيبينغ)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">اسم الرابط (Slug بالإنجليزية)</label>
            <input
              type="text"
              required
              placeholder="مثال: dr-ahmed-clinic أو trend-watch"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-left"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">اسم النشاط / المتجر</label>
            <input
              type="text"
              required
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">رقم الواتساب مع كود الدولة</label>
            <input
              type="text"
              required
              placeholder="مثال: 201012345678"
              value={formData.whatsapp_number}
              onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-left"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">العنوان الرئيسي الجذاب (Headline)</label>
          <input
            type="text"
            required
            placeholder="مثال: احجز الآن في أقوى معسكر تأسيس للثانوية العامة"
            value={formData.headline}
            onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">الوصف والتفاصيل</label>
          <textarea
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          ></textarea>
        </div>

        {formData.template_type === 'product' && (
          <div className="p-4 bg-slate-50 rounded-xl space-y-4 border border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm">بيانات المنتج المتجر:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">سعر المنتج (مع العملة)</label>
                <input
                  type="text"
                  placeholder="مثال: 350 ج.م"
                  value={formData.product_price}
                  onChange={(e) => setFormData({ ...formData, product_price: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">رابط صورة المنتج (URL)</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.product_image_url}
                  onChange={(e) => setFormData({ ...formData, product_image_url: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-left"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Meta Pixel ID (اختياري)</label>
          <input
            type="text"
            placeholder="مثال: 123456789012345"
            value={formData.meta_pixel_id}
            onChange={(e) => setFormData({ ...formData, meta_pixel_id: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-left"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/20"
        >
          {saving ? 'جاري حفظ التعديلات...' : 'حفظ ونشر الصفحة 🚀'}
        </button>
      </form>
    </div>
  )
}
