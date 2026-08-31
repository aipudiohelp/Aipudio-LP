'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function UserDashboard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [pages, setPages] = useState([])
  const [editingPageId, setEditingPageId] = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState(null)

  // نموذج بيانات صفحة الهبوط
  const initialForm = {
    business_name: '',
    slug: '',
    template_type: 'ecommerce', // ecommerce, education, clinic
    whatsapp_number: '',
    headline: '',
    description: '',
    price: '',
    discount_price: '',
    shipping_fee: '',
    coupon_code: '',
    coupon_discount: '',
    main_image_url: '',
    facebook_pixel_id: '',
    tiktok_pixel_id: '',
    snapchat_pixel_id: '',
  }

  const [formData, setFormData] = useState(initialForm)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/login'
      return
    }

    setUser(user)

    // جلب ملف المشترك
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profileData)

    // جلب صفحات المشترك
    const { data: pagesData } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setPages(pagesData || [])
    setLoading(false)
  }

  // التحقق من حالة الاشتراك
  const getSubscriptionStatus = () => {
    if (!profile?.subscription_end) return { text: 'منتهي', isExpired: true }
    const now = new Date()
    const endDate = new Date(profile.subscription_end)
    const isPast = endDate < now

    if (isPast) return { text: 'منتهي (يرجى التجديد)', isExpired: true }
    if (profile.plan_type === 'trial') return { text: 'تجريبي مجاني (3 أيام)', isTrial: true }
    if (profile.plan_type === 'yearly') return { text: 'مشترك سنوي نشط 👑', isActive: true }
    return { text: 'مشترك نشط ✅', isActive: true }
  }

  // حفظ أو تعديل صفحة الهبوط
  const handleSavePage = async (e) => {
    e.preventDefault()

    const status = getSubscriptionStatus()
    if (status.isExpired) {
      setShowUpgradeModal(true)
      return
    }

    if (!editingPageId && pages.length >= (profile?.max_pages || 1)) {
      alert('لقد وصلت للحد الأقصى لعدد الصفحات المسموحة في باقتك الحالية.')
      return
    }

    setSaving(true)

    // تنظيف الرابط (Slug)
    const cleanSlug = formData.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')

    const payload = {
      user_id: user.id,
      business_name: formData.business_name,
      slug: cleanSlug,
      template_type: formData.template_type,
      whatsapp_number: formData.whatsapp_number,
      headline: formData.headline,
      description: formData.description,
      price: Number(formData.price) || 0,
      discount_price: Number(formData.discount_price) || 0,
      shipping_fee: Number(formData.shipping_fee) || 0,
      coupon_code: formData.coupon_code.trim().toUpperCase(),
      coupon_discount: Number(formData.coupon_discount) || 0,
      main_image_url: formData.main_image_url,
      facebook_pixel_id: formData.facebook_pixel_id.trim(),
      tiktok_pixel_id: formData.tiktok_pixel_id.trim(),
      snapchat_pixel_id: formData.snapchat_pixel_id.trim(),
      is_active: true,
    }

    if (editingPageId) {
      const { error } = await supabase
        .from('landing_pages')
        .update(payload)
        .eq('id', editingPageId)
        .eq('user_id', user.id)

      if (!error) {
        alert('تم تحديث الصفحة بنجاح! ✅')
        setEditingPageId(null)
        setFormData(initialForm)
        fetchDashboardData()
      } else {
        alert('حدث خطأ أثناء التحديث: ' + error.message)
      }
    } else {
      const { error } = await supabase
        .from('landing_pages')
        .insert([payload])

      if (!error) {
        alert('تم نشر صفحة الهبوط بنجاح! 🚀')
        setFormData(initialForm)
        fetchDashboardData()
      } else {
        alert('حدث خطأ أثناء الإنشاء (قد يكون الرابط مستخدماً بالفعل): ' + error.message)
      }
    }

    setSaving(false)
  }

  // حذف صفحة
  const handleDeletePage = async (pageId) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذه الصفحة؟')) return

    const { error } = await supabase
      .from('landing_pages')
      .delete()
      .eq('id', pageId)
      .eq('user_id', user.id)

    if (!error) {
      setPages(prev => prev.filter(p => p.id !== pageId))
    }
  }

  // تعبئة النموذج للتعديل
  const handleEditPage = (page) => {
    setEditingPageId(page.id)
    setFormData({
      business_name: page.business_name || '',
      slug: page.slug || '',
      template_type: page.template_type || 'ecommerce',
      whatsapp_number: page.whatsapp_number || '',
      headline: page.headline || '',
      description: page.description || '',
      price: page.price || '',
      discount_price: page.discount_price || '',
      shipping_fee: page.shipping_fee || '',
      coupon_code: page.coupon_code || '',
      coupon_discount: page.coupon_discount || '',
      main_image_url: page.main_image_url || '',
      facebook_pixel_id: page.facebook_pixel_id || '',
      tiktok_pixel_id: page.tiktok_pixel_id || '',
      snapchat_pixel_id: page.snapchat_pixel_id || '',
    })
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  // نسخ رابط الصفحة
  const handleCopyLink = (slug) => {
    const fullUrl = `https://lp.aipudio.online/${slug}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  // تسجيل الخروج
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-slate-900 p-6 rounded-2xl border border-slate-800 font-bold text-sm">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span>جاري فتح لوحة التحكم...</span>
        </div>
      </div>
    )
  }

  const status = getSubscriptionStatus()
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin'

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-4 sm:p-8 selection:bg-purple-500 selection:text-white pb-28">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* 1. الهيدر العلوي للمشترك */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl text-white font-black">
                A
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900">Aipudio-LP</h1>
                <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 font-bold rounded-md">
                  لوحة التحكم
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">{profile?.email || user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="px-3.5 py-2 bg-purple-950 hover:bg-purple-900 text-purple-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>👑</span>
                <span>لوحة الإدارة</span>
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition"
            >
              خروج
            </button>
          </div>
        </div>

        {/* 2. بطاقة حالة الاشتراك وتنبيه الترقية */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${status.isActive ? 'bg-emerald-500' : status.isTrial ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                <span className="font-black text-sm text-slate-800">
                  {status.isExpired ? 'انتهت فترة الاشتراك' : 'حالة الحساب:'} {status.text}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {profile?.subscription_end
                  ? `ينتهي في: ${new Date(profile.subscription_end).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}`
                  : 'يرجى تفعيل الاشتراك للاستمرار في استقبال الطلبات.'}
              </p>
            </div>

            <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              📄 الصفحات النشطة: <span className="text-purple-600 font-extrabold">{pages.length}</span> من {profile?.max_pages || 1}
            </div>
          </div>

          {/* زر الترقية والتفعيل */}
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-95 text-white font-black rounded-2xl shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <span>💳</span>
            <span>تفعيل / ترقية الاشتراك (99 ج.م فقط) ⚡</span>
          </button>
        </div>

        {/* 3. قائمة الصفحات المنشورة للمشترك */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <span>📁</span>
              <span>صفحاتي المنشورة ({pages.length})</span>
            </h2>
            <span className="text-[11px] text-slate-400">يمكنك تعديل أي صفحة أو حذفها لتحرير المساحة</span>
          </div>

          {pages.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
              <span className="text-3xl block mb-2">🚀</span>
              <p className="text-xs text-slate-500 font-bold">لا توجد لديك صفحات منشورة بعد.</p>
              <p className="text-[11px] text-slate-400 mt-1">قم بتعبئة النموذج بالأسفل لإنشاء ونشر أول صفحة لمتجرك أو نشاطك في دقيقة واحدة.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pages.map(page => (
                <div key={page.id} className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">{page.business_name}</span>
                      <span className="text-[9px] px-2 py-0.5 bg-purple-100 text-purple-700 font-bold rounded">
                        {page.template_type === 'ecommerce' ? '🛍️ متجر' : page.template_type === 'education' ? '📚 تعليمي' : '🩺 عيادة'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                      <a href={`https://lp.aipudio.online/${page.slug}`} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline">
                        /{page.slug} ↗
                      </a>
                      <span>👁️ {page.views_count || 0} زيارة</span>
                      <span>🖱️ {page.clicks_count || 0} طلب</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      onClick={() => handleCopyLink(page.slug)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      {copiedSlug === page.slug ? 'تم النسخ! ✅' : 'نسخ الرابط 📋'}
                    </button>
                    <button
                      onClick={() => handleEditPage(page)}
                      className="px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition"
                    >
                      تعديل ✏️
                    </button>
                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs transition"
                      title="حذف"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. نموذج إنشاء وتعديل صفحة الهبوط */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>✨</span>
              <span>{editingPageId ? 'تعديل صفحة الهبوط' : 'إنشاء ونشر صفحة هبوط جديدة'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة متقدمة للأسعار، الخصومات، والشحن وتتبع الإعلانات
            </p>
          </div>

          <form onSubmit={handleSavePage} className="space-y-4 text-xs">
            
            {/* نوع القالب */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">نوع النشاط والقالب:</label>
              <select
                value={formData.template_type}
                onChange={e => setFormData({ ...formData, template_type: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-bold"
              >
                <option value="ecommerce">📦 بيع منتج مباشر (متاجر إلكترونية ودروب شيبينغ)</option>
                <option value="education">👨‍🏫 حجز حصص ومذكرات (مدرسين وسناتر تعليمية)</option>
                <option value="clinic">🩺 حجز مواعيد وكشوفات (عيادات وصالونات تجميل)</option>
              </select>
            </div>

            {/* الرابط واسم النشاط */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">اسم الرابط بالإنجليزي (Slug):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: watch-pro أو dr-walaa"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-mono text-left dir-ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">اسم النشاط / المتجر:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: متجر الأناقة"
                  value={formData.business_name}
                  onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-bold"
                />
              </div>
            </div>

            {/* رقم الواتساب */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">رقم الواتساب لاستقبال الطلبات (مع كود الدولة):</label>
              <input
                type="text"
                required
                placeholder="2010xxxxxxxx"
                value={formData.whatsapp_number}
                onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-mono text-left dir-ltr"
              />
            </div>

            {/* عنوان العرض والوصف */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">عنوان العرض / المنتج الرئيسي:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ساعة ألترا الذكية + سوار مجاني لفترة محدودة"
                  value={formData.headline}
                  onChange={e => setFormData({ ...formData, headline: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">الوصف وتفاصيل العرض:</label>
                <textarea
                  rows="3"
                  placeholder="اكتب مميزات العرض أو المنتج وما يحتويه العرض..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 font-medium"
                ></textarea>
              </div>
            </div>

            {/* رابط الصورة الرئيسية */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">رابط الصورة الرئيسية للمنتج (Image URL):</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/... أو رابط مباشر للصورة"
                value={formData.main_image_url}
                onChange={e => setFormData({ ...formData, main_image_url: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-left dir-ltr font-mono"
              />
            </div>

            {/* الأسعار والشحن والكوبون */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="font-bold text-slate-800 block">💵 إعدادات التسعير والعروض:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">السعر الأصلي (ج.م):</label>
                  <input
                    type="number"
                    placeholder="650"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">سعر العرض المخفض (ج.م):</label>
                  <input
                    type="number"
                    placeholder="450"
                    value={formData.discount_price}
                    onChange={e => setFormData({ ...formData, discount_price: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">مصاريف الشحن (ج.م):</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.shipping_fee}
                    onChange={e => setFormData({ ...formData, shipping_fee: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">كود خصم إضافي (اختياري):</label>
                  <input
                    type="text"
                    placeholder="SAVE10"
                    value={formData.coupon_code}
                    onChange={e => setFormData({ ...formData, coupon_code: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">قيمة الخصم للكود (ج.م):</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={formData.coupon_discount}
                    onChange={e => setFormData({ ...formData, coupon_discount: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>
            </div>

            {/* بكسل تتبع الإعلانات */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="font-bold text-slate-800 block">🎯 تتبع الحملات الإعلانية (Pixels):</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Meta Pixel ID"
                  value={formData.facebook_pixel_id}
                  onChange={e => setFormData({ ...formData, facebook_pixel_id: e.target.value })}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-mono text-left dir-ltr"
                />
                <input
                  type="text"
                  placeholder="TikTok Pixel ID"
                  value={formData.tiktok_pixel_id}
                  onChange={e => setFormData({ ...formData, tiktok_pixel_id: e.target.value })}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-mono text-left dir-ltr"
                />
                <input
                  type="text"
                  placeholder="Snapchat Pixel ID"
                  value={formData.snapchat_pixel_id}
                  onChange={e => setFormData({ ...formData, snapchat_pixel_id: e.target.value })}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl outline-none font-mono text-left dir-ltr"
                />
              </div>
            </div>

            {/* زر الحفظ والنشر */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-95 text-white font-black rounded-2xl shadow-lg transition active:scale-[0.99] disabled:opacity-50 text-sm"
              >
                {saving ? 'جاري النشر والحفظ... ⏳' : editingPageId ? 'تحديث ونشر التعديلات 🚀' : 'نشر صفحة الهبوط الآن 🚀'}
              </button>

              {editingPageId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPageId(null)
                    setFormData(initialForm)
                  }}
                  className="px-5 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl text-xs transition"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

          </form>
        </div>

      </div>

      {/* 5. نافذة ترقية وتفعيل الاشتراك (Upgrade Modal) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 max-w-md w-full text-right space-y-5 shadow-2xl relative">
            
            {/* زر إغلاق */}
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white text-sm bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center transition"
            >
              ✕
            </button>

            {/* الهيدر والعرض الجذاب */}
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[11px] font-bold">
                ⚡ عرض التفعيل السريع
              </span>
              <h3 className="text-base font-black text-white leading-relaxed">
                استمر في استقبال أوردراتك بدون سلات متروكة بـ <span className="text-emerald-400">99 ج.م فقط شهرياً</span>
              </h3>
              <p className="text-xs text-slate-300">
                (أقل من 3.3 جنيه في اليوم) — استقبل مبيعاتك وحجوزاتك بدون عمولات أو تعقيد.
              </p>
            </div>

            {/* تفاصيل وطرق التحويل */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">قيمة الاشتراك:</span>
                <span className="font-extrabold text-white text-sm">99 جنيه مصري / شهر</span>
              </div>

              {/* إنستاباي */}
              <div className="space-y-1">
                <span className="text-purple-400 font-bold block">1. التحويل عبر InstaPay:</span>
                <div className="p-2 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-200 select-all flex justify-between items-center border border-slate-800">
                  <span>01005825888</span>
                  <span className="text-[10px] text-slate-500 font-sans">معرف / رقم إنستاباي</span>
                </div>
              </div>

              {/* فودافون كاش */}
              <div className="space-y-1">
                <span className="text-rose-400 font-bold block">2. التحويل عبر فودافون كاش / محافظ إلكترونية:</span>
                <div className="p-2 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-200 select-all flex justify-between items-center border border-slate-800">
                  <span>01005825888</span>
                  <span className="text-[10px] text-slate-500 font-sans">رقم المحفظة</span>
                </div>
              </div>
            </div>

            {/* زر إرسال الإيصال وتفعيل الحساب فوراً */}
            <a
              href={`https://wa.me/201005825888?text=${encodeURIComponent(
                `مرحباً، قمت بتحويل مبلغ الاشتراك الشهري (99 ج.م) لحسابي:\nالبريد: ${profile?.email || user?.email || ''}\nوهذا إيصال التحويل لتفعيل الاشتراك فوراً ✅`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold rounded-2xl shadow-xl flex items-center justify-center gap-2 text-xs transition active:scale-95"
            >
              <span>💬</span>
              <span>أرسل إيصال التحويل لتفعيل حسابك فوراً</span>
            </a>

            <p className="text-[10px] text-slate-400 text-center">
              يتم مراجعة الإيصال وتفعيل الاشتراك خلال دقائق من استلام الرسالة ⚡
            </p>

          </div>
        </div>
      )}

      {/* 6. زر واتساب عائم للدعم الفني المباشر للمشتركين */}
      <a
        href="https://wa.me/201005825888?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%A5%D8%B9%D8%AF%D8%A7%D8%AF%20%D8%B5%D9%81%D8%AD%D8%AA%D9%8A%20%D8%B9%D9%84%D9%89%20Aipudio-LP"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 left-5 z-40 bg-[#25D366] hover:bg-[#20ba59] text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2 transition hover:scale-105 active:scale-95"
        title="تواصل مع الدعم الفني"
      >
        <span className="text-xl">💬</span>
        <span className="text-xs font-bold hidden sm:inline">مساعدة سريعة؟</span>
      </a>

    </div>
  )
}
