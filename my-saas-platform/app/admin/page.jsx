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

      // التحقق من رتبة المستخدم
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

  // تفعيل أو إلغاء تفعيل الاشتراك بضغطة زر
  const toggleSubscription = async (profileId, currentStatus) => {
    setUpdatingId(profileId)
    const newStatus = !currentStatus

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', profileId)

    if (error) {
      alert('حدث خطأ: ' + error.message)
    } else {
      setProfiles(profiles.map(p => p.id === profileId ? { ...p, is_active: newStatus } : p))
    }
    setUpdatingId(null)
  }

  // تغيير رتبة المستخدم (ترقية لمدير أو خفض لرتبة مستخدم عادي)
  const changeRole = async (profileId, newRole) => {
    if (currentUser.role !== 'super_admin') {
      alert('فقط المدير العام (Super Admin) يملك صلاحية تغيير الرتب.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)

    if (error) {
      alert('حدث خطأ: ' + error.message)
    } else {
      setProfiles(profiles.map(p => p.id === profileId ? { ...p, role: newRole } : p))
      alert('تم تحديث الرتبة بنجاح.')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-600">جاري التحقق من صلاحيات المدير...</div>
  }

  const activeCount = profiles.filter(p => p.is_active).length
  const pendingCount = profiles.length - activeCount

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      {/* الهيدر */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">لوحة الإدارة العامة</h1>
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
            لوحة المشترك العادية
          </Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition"
          >
            تسجيل خروج
          </button>
        </div>
      </div>

      {/* بطاقات الإحصائيات السريعة */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-slate-500 text-xs font-medium">إجمالي الحسابات</span>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">{profiles.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-emerald-600 text-xs font-medium">الاشتراكات المفعلة</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">{activeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-amber-600 text-xs font-medium">غير مفعل / بانتظار الدفع</span>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">{pendingCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-blue-600 text-xs font-medium">إجمالي الصفحات المنشأة</span>
          <p className="text-2xl font-extrabold text-blue-600 mt-2">{landingPages.length}</p>
        </div>
      </div>

      {/* جدول الحسابات */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">قائمة المشتركين والأنشطة</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="py-4 px-6">المستخدم / البريد</th>
                <th className="py-4 px-6">النشاط / رابط الصفحة</th>
                <th className="py-4 px-6">حالة الاشتراك</th>
                <th className="py-4 px-6">الرتبة</th>
                <th className="py-4 px-6">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => {
                const userPage = landingPages.find(lp => lp.user_id === p.id)
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-medium text-slate-800">
                      {p.email}
                      <span className="block text-xs text-slate-400 mt-0.5 dir-ltr text-right">
                        {new Date(p.created_at).toLocaleDateString('ar-EG')}
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
                      {p.is_active ? (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                          مفعل ✅
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                          غير مفعل ⏳
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      {currentUser.role === 'super_admin' && p.id !== currentUser.id ? (
                        <select
                          value={p.role || 'user'}
                          onChange={(e) => changeRole(p.id, e.target.value)}
                          className="bg-slate-100 border border-slate-200 text-xs rounded-lg p-1.5 outline-none font-medium"
                        >
                          <option value="user">مشترك عادي (User)</option>
                          <option value="admin">مدير (Admin)</option>
                          <option value="super_admin">مدير عام (Super Admin)</option>
                        </select>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600">{p.role || 'user'}</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <button
                        onClick={() => toggleSubscription(p.id, p.is_active)}
                        disabled={updatingId === p.id}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                          p.is_active
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {updatingId === p.id ? 'جاري...' : p.is_active ? 'إلغاء التفعيل' : 'تفعيل الاشتراك ⚡'}
                      </button>
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
