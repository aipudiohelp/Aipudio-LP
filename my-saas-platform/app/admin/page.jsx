'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [landingPages, setLandingPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function initAdmin() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!myProfile || (myProfile.role !== 'admin' && myProfile.role !== 'super_admin')) {
        alert('غير مصرح لك بالدخول لهذه الصفحة')
        router.push('/dashboard')
        return
      }

      setCurrentUser(myProfile)
      await fetchAllData()
      setLoading(false)
    }
    initAdmin()
  }, [router])

  const fetchAllData = async () => {
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: allPages } = await supabase
      .from('landing_pages')
      .select('*')

    if (allProfiles) setProfiles(allProfiles)
    if (allPages) setLandingPages(allPages)
  }

  // تمديد الاشتراك
  const addSubscription = async (profileId, days, planName) => {
    setUpdatingId(profileId)
    const { error } = await supabase.rpc('extend_subscription', {
      target_user_id: profileId,
      days_to_add: days,
      new_plan: planName
    })

    if (error) {
      alert('خطأ: ' + error.message)
    } else {
      await fetchAllData()
      alert(`تم إضافة ${days} يوماً للحساب بنجاح ✅`)
    }
    setUpdatingId(null)
  }

  // تجميد / إيقاف الحساب
  const toggleActive = async (profileId, currentStatus) => {
    setUpdatingId(profileId)
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', profileId)

    if (error) {
      alert('خطأ: ' + error.message)
    } else {
      await fetchAllData()
    }
    setUpdatingId(null)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-600">جاري التحقق من صلاحيات الإدارة...</div>
  }

  const now = new Date()

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">لوحة الإدارة وتفعيل الاشتراكات</h1>
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {currentUser.role}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{currentUser.email}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition"
          >
            لوحة المشترك
          </Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition"
          >
            تسجيل خروج
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">قائمة المشتركين وتجديد الباقات</h2>
          <span className="text-xs text-slate-500">إجمالي المسجلين: {profiles.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="py-4 px-6">المستخدم</th>
                <th className="py-4 px-6">صفحة النشاط</th>
                <th className="py-4 px-6">حالة الاشتراك</th>
                <th className="py-4 px-6">تاريخ الانتهاء</th>
                <th className="py-4 px-6 text-center">إجراءات التجديد والتفعيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => {
                const userPage = landingPages.find(lp => lp.user_id === p.id)
                const endDate = p.subscription_end ? new Date(p.subscription_end) : null
                const isExpired = !p.is_active || (endDate && endDate < now)

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-medium text-slate-800">
                      {p.email}
                      <span className="block text-xs text-slate-400 mt-0.5">
                        نوع الخطة: {p.plan_type || 'trial'}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      {userPage ? (
                        <div>
                          <span className="font-semibold text-slate-800">{userPage.business_name}</span>
                          <a
                            href={`/${userPage.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs text-emerald-600 hover:underline dir-ltr text-right font-medium"
                          >
                            /{userPage.slug}
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">لم ينشئ صفحة بعد</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      {isExpired ? (
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
                          منتهي الصلاحية ⛔
                        </span>
                      ) : p.plan_type === 'trial' ? (
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                          تجريبي مجاني ⏳
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                          مشترك نشط ✅
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-xs font-mono text-slate-600">
                      {endDate ? endDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : 'غير محدد'}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => addSubscription(p.id, 30, 'monthly')}
                          disabled={updatingId === p.id}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition"
                        >
                          + شهر
                        </button>
                        <button
                          onClick={() => addSubscription(p.id, 90, 'quarterly')}
                          disabled={updatingId === p.id}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition"
                        >
                          + 3 أشهر
                        </button>
                        <button
                          onClick={() => addSubscription(p.id, 365, 'yearly')}
                          disabled={updatingId === p.id}
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg transition"
                        >
                          + سنة
                        </button>
                        <button
                          onClick={() => toggleActive(p.id, p.is_active)}
                          disabled={updatingId === p.id}
                          className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition"
                        >
                          {p.is_active ? 'تجميد' : 'فك التجميد'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
