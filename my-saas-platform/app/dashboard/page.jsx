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
  const [copiedKey, setCopiedKey] = useState('')
  const router = useRouter()

  const [formData, setFormData] = useState({
    slug: '', template_type: 'booking', business_name: '', headline: '', description: '',
    whatsapp_number: '', product_price: '', product_image_url: '', gallery_images: [],
    meta_pixel_id: '', tiktok_pixel_id: '', snapchat_pixel_id: '', views_count: 0, clicks_count: 0
  })

  const PAYMENT_INFO = {
    account_holder: 'مصطفى بدر',
    instapay_id: 'mustafa.nbe015@instapay',
    instapay_phone: '01501665571',
    vodafone_cash: '01501665571',
    support_whatsapp: '201005825888',
    monthly_price: '99 ج.م / شهرياً',
    yearly_price: '799 ج.م / سنوياً',
  }

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      setUser(session.user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)
      const { data: page } = await supabase.from('landing_pages').select('*').eq('user_id', session.user.id).maybeSingle()
      if (page) setFormData({ ...page, gallery_images: Array.isArray(page.gallery_images) ? page.gallery_images : [], views_count: page.views_count || 0, clicks_count: page.clicks_count || 0 })
      setLoading(false)
    }
    loadData()
  }, [router])

  // دالة نسخ النصوص للحافظة
  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 2000)
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
    const payload = { ...formData, user_id: user.id, slug: formData.slug.toLowerCase().trim().replace(/\s+/g, '-') }
    const { error } = await supabase.from('landing_pages').upsert(payload, { onConflict: 'user_id' })
    alert(error ? 'خطأ: ' + error.message : 'تم حفظ وتحديث صفحة الهبوط بنجاح!')
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center font-bold">جاري تحميل لوحة التحكم...</div>

  const now = new Date()
  const endDate = profile?.subscription_end ? new Date(profile.subscription_end) : null
  const daysLeft = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0
  const isSubscriptionActive = profile?.is_active && daysLeft > 0

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      {/* الهيدر العلوي */}
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

      {/* شريط حالة الاشتراك */}
      <div className={`p-5 rounded-2xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border ${isSubscriptionActive ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
        <div>
          <span className="font-bold text-base">{isSubscriptionActive ? '✅ الاشتراك ساري' : '⛔ انتهت فترة الاشتراك'}</span>
          <p className="text-xs mt-1 opacity-80">{isSubscriptionActive ? `متبقي ${daysLeft} يوماً (${endDate?.toLocaleDateString('ar-EG')})` : 'يرجى تجديد الاشتراك لإعادة التفعيل.'}</p>
        </div>
        <button onClick={() => setShowPaymentModal(true)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition">💳 تفعيل / تجديد الاشتراك</button>
      </div>

      {/* نافذة الدفع مع خاصية النسخ */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-lg text-slate-800">طرق الدفع والتفعيل الفوري</h3>
              <button onClick={() => setShowPaymentModal(false)} className="font-bold text-xl text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="bg-slate-100 p-3 rounded-xl flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">اسم صاحب الحساب المستفيد:</span>
              <strong className="text-slate-800 text-sm">{PAYMENT_INFO.account_holder}</strong>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* إنستاباي */}
              <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-100 space-y-2">
                <span className="font-bold text-purple-900 block">⚡ التحويل عبر InstaPay:</span>
                
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border">
                  <span className="text-slate-500 text-[11px]">المعرف:</span>
                  <span className="font-mono font-bold text-slate-800">{PAYMENT_INFO.instapay_id}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(PAYMENT_INFO.instapay_id, 'instapay_id')}
                    className="text-[11px] bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-2 py-1 rounded-md transition"
                  >
                    {copiedKey === 'instapay_id' ? 'تم النسخ ✅' : 'نسخ 📋'}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border">
                  <span className="text-slate-500 text-[11px]">رقم الهاتف:</span>
                  <span className="font-mono font-bold text-slate-800">{PAYMENT_INFO.instapay_phone}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(PAYMENT_INFO.instapay_phone, 'instapay_phone')}
                    className="text-[11px] bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-2 py-1 rounded-md transition"
                  >
                    {copiedKey === 'instapay_phone' ? 'تم النسخ ✅' : 'نسخ 📋'}
                  </button>
                </div>
              </div>

              {/* فودافون كاش */}
              <div className="bg-red-50 p-3.5 rounded-2xl border border-red-100 space-y-2">
                <span className="font-bold text-red-900 block">📱 التحويل عبر فودافون كاش / المحافظ:</span>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border">
                  <span className="text-slate-500 text-[11px]">رقم المحفظة:</span>
                  <span className="font-mono font-black text-slate-800 text-sm">{PAYMENT_INFO.vodafone_cash}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(PAYMENT_INFO.vodafone_cash, 'vodafone_cash')}
                    className="text-[11px] bg-red-100 hover:bg-red-200 text-red-800 font-bold px-2 py-1 rounded-md transition"
                  >
                    {copiedKey === 'vodafone_cash' ? 'تم النسخ ✅' : 'نسخ 📋'}
                  </button>
                </div>
              </div>

              {/* الأسعار */}
              <div className="bg-slate-50 p-3 rounded-xl border flex justify-between items-center text-slate-700">
                <span>• شهري: <strong className="text-slate-900">{PAYMENT_INFO.monthly_price}</strong></span>
                <span className="flex items-center gap-1">
                  • سنوي: <span className="bg-red-100 text-red-700 font-bold px-1 rounded text-[10px]">خصم 35% 🔥</span>
                  <strong className="text-emerald-700">{PAYMENT_INFO.yearly_price}</strong>
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const msg = `مرحباً، قمت بتحويل الاشتراك لمنصة Aipudio-LP:\n📧 البريد المسجل: ${user.email}\n🏪 النشاط: ${formData.business_name || 'جديد'}\nمرفق صورة التحويل لتفعيل الاشتراك.`
                window.open(`https://wa.me/${PAYMENT_INFO.support_whatsapp}?text=${encodeURIComponent(msg)}`, '_blank')
              }}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow transition"
            >
              💬 إرسال صورة التحويل عبر واتساب
            </button>
          </div>
        </div>
      )}

      {/* قسم الإحصائيات */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <span className="text-xs text-slate-400">الزيارات</span>
          <p className="text-xl font-black text-slate-800 mt-1">{formData.views_count || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <span className="text-xs text-slate-400">الطلبات</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{formData.clicks_count || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <span className="text-xs text-slate-400">التحويل</span>
          <p className="text-xl font-black text-purple-600 mt-1">{formData.views_count > 0 ? ((formData.clicks_count / formData.views_count) * 100).toFixed(1) : '0.0'}%</p>
        </div>
      </div>

      {formData.slug && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl mb-6 flex justify-between items-center">
          <span className="text-xs text-emerald-900 font-bold">الرابط المباشر:</span>
          <a href={`/${formData.slug}`} target="_blank" rel="noreferrer" className="text-emerald-700 font-bold hover:underline dir-ltr text-xs">
            {origin ? `${origin}/${formData.slug}` : `/${formData.slug}`}
          </a>
        </div>
      )}

      {/* نموذج التعديل */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
        <h2 className="text-base font-bold text-slate-800 border-b pb-2">إعدادات صفحة الهبوط</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">نوع القالب</label>
            <select value={formData.template_type} onChange={e => setFormData({ ...formData, template_type: e.target.value })} className="w-full p-2.5 border rounded-xl outline-none">
              <option value="booking">حجز موعد / تجميع بيانات</option>
              <option value="product">بيع منتج مباشر</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">اسم الرابط (Slug بالإنجليزية)</label>
            <input type="text" required placeholder="shop-name" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} className="w-full p-2.5 border rounded-xl dir-ltr outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">اسم النشاط / المتجر</label>
            <input type="text" required value={formData.business_name} onChange={e => setFormData({ ...formData, business_name: e.target.value })} className="w-full p-2.5 border rounded-xl outline-none" />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">رقم الواتساب مع كود الدولة</label>
            <input type="text" required placeholder="2010xxxxxxxx" value={formData.whatsapp_number} onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })} className="w-full p-2.5 border rounded-xl dir-ltr outline-none" />
          </div>
        </div>

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
              <label className="font-bold text-slate-700 block mb-1">سعر المنتج</label>
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
          {saving ? 'جاري الحفظ...' : 'حفظ ونشر الصفحة 🚀'}
        </button>
      </form>
    </div>
  )
      }
        
