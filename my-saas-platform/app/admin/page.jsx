'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// أسعار الباقات المعتمدة لحساب الإيرادات التقديرية (ج.م)
const PLAN_PRICES = {
  monthly: 99,
  quarterly: 250,
  yearly: 800,
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [currentProfile, setCurrentProfile] = useState(null)
  const [subscribers, setSubscribers] = useState([])
  const [pages, setPages] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, active, trial, expired, admins
  const [actionLoading, setActionLoading] = useState(null)
  const [customDateModal, setCustomDateModal] = useState(null)
  const [selectedCustomDate, setSelectedCustomDate] = useState('')

  // تحميل البيانات والتحقق من الصلاحيات
  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/login'
      return
    }

    setCurrentUser(user)

    // جلب ملف المستخدم الحالي للتأكد من رتبته
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
      alert('عفواً، ليس لديك صلاحية الوصول لهذه اللوحة.')
      window.location.href = '/dashboard'
      return
    }

    setCurrentProfile(profile)

    // جلب كافة المشتركين وكافة الصفحات وإحصائياتها
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: pagesData } = await supabase
      .from('landing_pages')
      .select('*')

    setSubscribers(profilesData || [])
    setPages(pagesData || [])
    setLoading(false)
  }

  // تفعيل الاشتراك لمدة محددة من اليوم
  const handleSetSubscription = async (userId, days, planType) => {
    setActionLoading(userId)
    const newEndDate = new Date()
    newEndDate.setDate(newEndDate.getDate() + days)

    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_end: newEndDate.toISOString(),
        is_active: true,
        plan_type: planType,
      })
      .eq('id', userId)

    if (!error) {
      setSubscribers(prev =>
        prev.map(sub =>
          sub.id === userId
            ? { ...sub, subscription_end: newEndDate.toISOString(), is_active: true, plan_type: planType }
            : sub
        )
      )
    }
    setActionLoading(null)
  }

  // إلغاء أو تجميد الاشتراك فوراً
  const handleCancelSubscription = async (userId) => {
    if (!confirm('هل أنت متأكد من إيقاف وتجميد اشتراك هذا الحساب؟')) return

    setActionLoading(userId)
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)

    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_end: pastDate.toISOString(),
        is_active: false,
        plan_type: 'trial',
      })
      .eq('id', userId)

    if (!error) {
      setSubscribers(prev =>
        prev.map(sub =>
          sub.id === userId
            ? { ...sub, subscription_end: pastDate.toISOString(), is_active: false, plan_type: 'trial' }
            : sub
        )
      )
    }
    setActionLoading(null)
  }

  // تعيين تاريخ مخصص يدوياً
  const handleSaveCustomDate = async () => {
    if (!customDateModal || !selectedCustomDate) return

    setActionLoading(customDateModal.id)
    const isoDate = new Date(selectedCustomDate).toISOString()

    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_end: isoDate,
        is_active: new Date(selectedCustomDate) > new Date(),
      })
      .eq('id', customDateModal.id)

    if (!error) {
      setSubscribers(prev =>
        prev.map(sub =>
          sub.id === customDateModal.id
            ? { ...sub, subscription_end: isoDate, is_active: new Date(selectedCustomDate) > new Date() }
            : sub
        )
      )
      setCustomDateModal(null)
      setSelectedCustomDate('')
    }
    setActionLoading(null)
  }

  // تعديل رتبة المشترك (Super Admin فقط)
  const handleToggleAdminRole = async (userId, currentRole) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin'
    const confirmMsg = nextRole === 'admin' 
      ? 'هل تود ترقية هذا المستخدم لمدير فرعي (Admin)؟' 
      : 'هل تود سحب صلاحيات الإدارة من هذا الحساب؟'

    if (!confirm(confirmMsg)) return

    setActionLoading(userId)
    const { error } = await supabase
      .from('profiles')
      .update({ role: nextRole })
      .eq('id', userId)

    if (!error) {
      setSubscribers(prev =>
        prev.map(sub => (sub.id === userId ? { ...sub, role: nextRole } : sub))
      )
    }
    setActionLoading(null)
  }

  // التحقق من حالة الاشتراك
  const getSubscriptionStatus = (sub) => {
    if (!sub.subscription_end) return { text: 'منتهي', color: 'rose', isExpired: true }
    const now = new Date()
    const endDate = new Date(sub.subscription_end)
    const isPast = endDate < now

    if (isPast) return { text: 'منتهي', color: 'rose', isExpired: true }
    if (sub.plan_type === 'trial') return { text: 'تجريبي', color: 'amber', isTrial: true }
    return { text: 'مشترك نشط', color: 'emerald', isActive: true }
  }

  // إحصائيات النظام العامة
  const totalUsers = subscribers.length
  const activeSubs = subscribers.filter(s => getSubscriptionStatus(s).isActive).length
  const trialSubs = subscribers.filter(s => getSubscriptionStatus(s).isTrial).length
  const expiredSubs = subscribers.filter(s => getSubscriptionStatus(s).isExpired).length

  // إحصائيات التفاعل والزيارات والطلبات على مستوى المنصة
  const totalPagesCount = pages.length
  const totalPlatformViews = pages.reduce((acc, p) => acc + (p.views_count || p.views || 0), 0)
  const totalPlatformOrders = pages.reduce((acc, p) => acc + (p.clicks_count || p.orders || 0), 0)

  // حساب الإيرادات التقديرية (خاص بالمدير العام)
  const estimatedRevenue = subscribers.reduce((acc, sub) => {
    const status = getSubscriptionStatus(sub)
    if (status.isActive && sub.role !== 'super_admin') {
      return acc + (PLAN_PRICES[sub.plan_type] || 0)
    }
    return acc
  }, 0)

  // التصفية والبحث بالإيميل أو الـ ID
  const filteredSubscribers = subscribers.filter(sub => {
    const status = getSubscriptionStatus(sub)
    const matchesSearch =
      (sub.email && sub.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sub.id && sub.id.toLowerCase().includes(searchTerm.toLowerCase()))

    if (filterType === 'active') return matchesSearch && status.isActive
    if (filterType === 'trial') return matchesSearch && status.isTrial
    if (filterType === 'expired') return matchesSearch && status.isExpired
    if (filterType === 'admins') return matchesSearch && (sub.role === 'admin' || sub.role === 'super_admin')
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-slate-900 p-6 rounded-2xl border border-slate-800 font-bold text-sm">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span>جاري تحميل بيانات الإدارة...</span>
        </div>
      </div>
    )
  }

  const isSuperAdmin = currentProfile?.role === 'super_admin'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans selection:bg-purple-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* الهيدر العلوي */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl">
                {isSuperAdmin ? '👑' : '🛡️'}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">لوحة الإدارة وتفعيل الاشتراكات</h1>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase ${
                  isSuperAdmin ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {currentProfile?.role}
                </span>
              </div>
              <p className="text-xs text-slate-400">{currentUser?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-slate-700"
            >
              العودة للوحة المشترك 🏠
            </Link>
          </div>
        </div>

        {/* كروت الإحصائيات العامة للمشتركين والنشاط */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold block">إجمالي المسجلين</span>
            <span className="text-2xl font-black text-white">{totalUsers}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] text-emerald-400 font-semibold block">المشتركون النشطون</span>
            <span className="text-2xl font-black text-emerald-400">{activeSubs}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] text-amber-400 font-semibold block">فترات تجريبية</span>
            <span className="text-2xl font-black text-amber-400">{trialSubs}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] text-rose-400 font-semibold block">حسابات منتهية</span>
            <span className="text-2xl font-black text-rose-400">{expiredSubs}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] text-cyan-400 font-semibold block">الصفحات المنشورة</span>
            <span className="text-2xl font-black text-cyan-400">{totalPagesCount}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] text-purple-400 font-semibold block">إجمالي الزيارات</span>
            <span className="text-2xl font-black text-purple-400">{totalPlatformViews}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
            <span className="text-[11px] text-emerald-400 font-semibold block">إجمالي الطلبات</span>
            <span className="text-2xl font-black text-emerald-400">{totalPlatformOrders}</span>
          </div>
        </div>

        {/* قسم الأرباح والماليات (حصري للمدير العام Super Admin) */}
        {isSuperAdmin && (
          <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 p-5 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <h3 className="text-sm font-black text-white">إحصائيات الإيرادات التقديرية (خاص بالمدير العام)</h3>
              </div>
              <span className="text-[11px] text-purple-400 font-bold bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20">
                أعلى درجات الأمان والسرية 🔒
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">إجمالي الإيرادات الحالية التقديرية:</span>
                <span className="text-xl font-black text-emerald-400">{estimatedRevenue.toLocaleString()} ج.م</span>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">الاشتراكات الشهرية النشطة:</span>
                <span className="text-xl font-black text-white">
                  {subscribers.filter(s => getSubscriptionStatus(s).isActive && s.plan_type === 'monthly').length}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">الاشتراكات السنوية النشطة:</span>
                <span className="text-xl font-black text-purple-400">
                  {subscribers.filter(s => getSubscriptionStatus(s).isActive && s.plan_type === 'yearly').length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* أدوات البحث والتصفية */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl border transition ${
                filterType === 'all' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              الكل ({subscribers.length})
            </button>
            <button
              onClick={() => setFilterType('active')}
              className={`px-3 py-1.5 rounded-xl border transition ${
                filterType === 'active' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              النشطون ({activeSubs})
            </button>
            <button
              onClick={() => setFilterType('trial')}
              className={`px-3 py-1.5 rounded-xl border transition ${
                filterType === 'trial' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              تجريبي ({trialSubs})
            </button>
            <button
              onClick={() => setFilterType('expired')}
              className={`px-3 py-1.5 rounded-xl border transition ${
                filterType === 'expired' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              المنتهية ({expiredSubs})
            </button>
            <button
              onClick={() => setFilterType('admins')}
              className={`px-3 py-1.5 rounded-xl border transition ${
                filterType === 'admins' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              طاقم الإدارة 👑
            </button>
          </div>

          <input
            type="text"
            placeholder="بحث بالبريد الإلكتروني (Gmail)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs outline-none focus:border-purple-500 w-full sm:w-72"
          />
        </div>

        {/* جدول إدارة المشتركين مع تقارير الزيارات والطلبات الحية */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">البريد الإلكتروني</th>
                  <th className="p-4">صفحات المشترك</th>
                  <th className="p-4 text-center">الزيارات والطلبات</th>
                  <th className="p-4">حالة الاشتراك</th>
                  <th className="p-4">تاريخ الانتهاء</th>
                  <th className="p-4 text-center">تفعيل الباقة</th>
                  <th className="p-4 text-center">تحكم / تجميد</th>
                  {isSuperAdmin && <th className="p-4 text-center">صلاحية المدير</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSubscribers.map(sub => {
                  const status = getSubscriptionStatus(sub)
                  const userPagesList = pages.filter(p => p.user_id === sub.id)
                  const userViews = userPagesList.reduce((acc, p) => acc + (p.views_count || p.views || 0), 0)
                  const userOrders = userPagesList.reduce((acc, p) => acc + (p.clicks_count || p.orders || 0), 0)
                  const isProcessing = actionLoading === sub.id

                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                      {/* البريد الإلكتروني للمشترك */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="font-extrabold text-xs text-white block font-mono select-all">
                            {sub.email || `${sub.id.substring(0, 8)}...`}
                          </span>
                          <span className={`inline-block text-[9px] px-2 py-0.5 rounded font-extrabold ${
                            sub.role === 'super_admin' ? 'bg-purple-500/20 text-purple-300' :
                            sub.role === 'admin' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {sub.role === 'super_admin' ? '👑 سوبر أدمن' : sub.role === 'admin' ? '🛡️ مشرف' : 'مستخدم'}
                          </span>
                        </div>
                      </td>

                      {/* صفحات المشترك وروابطها */}
                      <td className="p-4">
                        {userPagesList.length > 0 ? (
                          <div className="space-y-1.5">
                            {userPagesList.map(p => (
                              <div key={p.id} className="text-xs">
                                <span className="font-bold text-slate-200 block truncate max-w-[160px]">{p.business_name || 'صفحة بدون اسم'}</span>
                                <a
                                  href={`https://lp.aipudio.online/${p.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-purple-400 hover:underline font-mono dir-ltr inline-block"
                                >
                                  /{p.slug}
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">لم ينشئ صفحات</span>
                        )}
                      </td>

                      {/* إحصائيات الزيارات والطلبات لكل مستخدم */}
                                            {/* إحصائيات الزيارات والطلبات لكل مستخدم */}
                      <td className="p-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                          <div className="flex items-center gap-2 text-[11px] font-bold">
                            <span className="text-cyan-400">👁️ {userViews}</span>
                            <span className="text-slate-600">|</span>
                            <span className="text-emerald-400">💬 {userOrders} طلب</span>
                          </div>
                        </div>
                      </td>

                      {/* حالة الاشتراك */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-extrabold text-[10px] ${
                          status.isActive ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                          status.isTrial ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' :
                          'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            status.isActive ? 'bg-emerald-400' : status.isTrial ? 'bg-amber-400' : 'bg-rose-400'
                          }`}></span>
                          {status.text}
                        </span>
                      </td>

                      {/* تاريخ الانتهاء */}
                      <td className="p-4 font-mono text-[11px] text-slate-300">
                        {sub.subscription_end
                          ? new Date(sub.subscription_end).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'غير محدد'}
                      </td>

                      {/* أزرار التفعيل السريع */}
                      <td className="p-4">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleSetSubscription(sub.id, 30, 'monthly')}
                            className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg font-bold text-[10px] transition disabled:opacity-50"
                            title="تفعيل 30 يوماً"
                          >
                            + شهر
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleSetSubscription(sub.id, 90, 'quarterly')}
                            className="px-2.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 rounded-lg font-bold text-[10px] transition disabled:opacity-50"
                            title="تفعيل 90 يوماً"
                          >
                            + 3 أشهر
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleSetSubscription(sub.id, 365, 'yearly')}
                            className="px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 rounded-lg font-bold text-[10px] transition disabled:opacity-50"
                            title="تفعيل سنة"
                          >
                            + سنة
                          </button>
                        </div>
                      </td>

                      {/* تحكم دقيق وتجميد */}
                      <td className="p-4">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => {
                              setCustomDateModal(sub)
                              setSelectedCustomDate(sub.subscription_end ? sub.subscription_end.split('T')[0] : '')
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                            title="تحديد تاريخ انتهاء مخصص"
                          >
                            📅
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleCancelSubscription(sub.id)}
                            className="p-1.5 bg-rose-950/40 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 rounded-lg text-xs transition disabled:opacity-50"
                            title="إلغاء أو تجميد الاشتراك فوراً"
                          >
                            🚫
                          </button>
                        </div>
                      </td>

                      {/* صلاحية المشرف */}
                      {isSuperAdmin && (
                        <td className="p-4 text-center">
                          {sub.role !== 'super_admin' ? (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleToggleAdminRole(sub.id, sub.role)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                sub.role === 'admin'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-600 hover:text-white'
                                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600 hover:text-white'
                              }`}
                            >
                              {sub.role === 'admin' ? 'سحب الإشراف' : 'تعيين مشرف 🛡️'}
                            </button>
                          ) : (
                            <span className="text-slate-600 text-[10px]">المالك الرئيسي</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* نافذة تحديد تاريخ مخصص (Modal) */}
      {customDateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">تحديد تاريخ انتهاء مخصص</h3>
            <p className="text-xs text-slate-400">
              اختر اليوم المحدد الذي ينتهي فيه اشتراك هذا العميل بدقة:
            </p>

            <input
              type="date"
              value={selectedCustomDate}
              onChange={e => setSelectedCustomDate(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-purple-500 font-mono"
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveCustomDate}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition"
              >
                حفظ التاريخ
              </button>
              <button
                onClick={() => setCustomDateModal(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
                      }
                                                                                                      
