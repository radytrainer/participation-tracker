import { useEffect, useState } from 'react'
import { Search, ShieldOff, ShieldCheck, KeyRound, Pencil, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getCollection, updateDocument } from '../../firebase/firestore'
import { resetPassword } from '../../firebase/auth'
import { useForm } from 'react-hook-form'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import ActionMenu from '../../components/ui/ActionMenu'

const ROLE_COLOR = { admin: 'red', trainer: 'blue', student: 'green' }

function relativeTime(isoString) {
  if (!isoString) return '—'
  try {
    return formatDistanceToNow(new Date(isoString), { addSuffix: true })
  } catch {
    return '—'
  }
}

export default function Users() {
  const { profile, user: firebaseUser } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiAvailable, setApiAvailable] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editModal, setEditModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  async function load() {
    setLoading(true)

    // Always load Firestore profiles
    const firestoreUsers = await getCollection('users')
    const firestoreMap = Object.fromEntries(firestoreUsers.map((u) => [u.id, u]))

    // Try to fetch all Firebase Auth users from the serverless API
    let merged = firestoreUsers
    let authFetched = false

    try {
      const idToken = await firebaseUser.getIdToken()
      const res = await fetch('/api/auth-users', {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (res.ok) {
        const { users: authUsers } = await res.json()
        authFetched = true

        // Build a uid-keyed set of all Auth users
        const authMap = Object.fromEntries(authUsers.map((u) => [u.uid, u]))

        // All unique UIDs across both sources
        const allUids = new Set([
          ...authUsers.map((u) => u.uid),
          ...firestoreUsers.map((u) => u.id),
        ])

        merged = [...allUids].map((uid) => {
          const auth = authMap[uid] || {}
          const fs   = firestoreMap[uid] || {}
          return {
            // identity
            id: uid,
            uid,
            email: auth.email || fs.email || '',
            // Firestore profile fields
            firstName:    fs.firstName    || '',
            lastName:     fs.lastName     || '',
            gender:       fs.gender       || '',
            role:         fs.role         || 'student',
            disabled:     fs.disabled     || false,
            // Firebase Auth fields
            emailVerified:  auth.emailVerified  ?? false,
            authDisabled:   auth.authDisabled   ?? false,
            creationTime:   auth.creationTime   || null,
            lastSignInTime: auth.lastSignInTime || null,
            hasProfile: !!firestoreMap[uid],
          }
        })
      }
    } catch {
      // API not configured — fall back to Firestore only
    }

    setApiAvailable(authFetched)

    const roleOrder = { admin: 0, trainer: 1, student: 2 }
    merged.sort((a, b) => {
      const ro = (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3)
      if (ro !== 0) return ro
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    })

    setUsers(merged)
    setLoading(false)
  }

  useEffect(() => { if (isAdmin) load() }, [isAdmin])

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        u.email?.toLowerCase().includes(q) ||
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q)
      )
    }
    return true
  })

  function openEdit(u) {
    reset({ firstName: u.firstName, lastName: u.lastName, gender: u.gender || '', role: u.role })
    setEditing(u)
    setEditModal(true)
  }

  async function onSubmit(data) {
    try {
      await updateDocument('users', editing.id, {
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender || '',
        role: data.role,
      })
      toast.success('User updated')
      setEditModal(false)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleResetPassword(u) {
    if (!confirm(`Send password reset email to ${u.email}?`)) return
    try {
      await resetPassword(u.email)
      toast.success(`Password reset email sent to ${u.email}`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleToggleDisable(u) {
    if (u.id === profile?.id) {
      toast.error("You can't disable your own account")
      return
    }
    const action = u.disabled ? 'enable' : 'disable'
    const name = u.firstName ? `${u.firstName} ${u.lastName}` : u.email
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${name}'s account?`)) return
    try {
      if (u.hasProfile) {
        await updateDocument('users', u.id, { disabled: !u.disabled })
      } else {
        toast.error('No Firestore profile found for this user — cannot update.')
        return
      }
      toast.success(`Account ${action}d`)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
        Admin access required to manage users.
      </div>
    )
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
        <p className="text-sm text-gray-500">
          {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
          {apiAvailable ? ' · sourced from Firebase Authentication' : ''}
        </p>
      </div>

     

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'admin', 'trainer', 'student'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                roleFilter === r
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {r === 'all' ? 'All roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                {apiAvailable && <th className="text-left px-4 py-3">Last Sign-In</th>}
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm flex-shrink-0">
                        {u.firstName ? `${u.firstName[0]}${u.lastName?.[0] ?? ''}` : u.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {u.firstName ? `${u.firstName} ${u.lastName}` : <span className="italic text-gray-400">No profile</span>}
                        </p>
                        {apiAvailable && (
                          <p className="text-xs text-gray-400">
                            Joined {relativeTime(u.creationTime)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email + verified */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 dark:text-gray-400">{u.email}</span>
                      {apiAvailable && (
                        u.emailVerified
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" title="Email verified" />
                          : <XCircle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" title="Email not verified" />
                      )}
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <Badge color={ROLE_COLOR[u.role] ?? 'gray'} className="capitalize">
                      {u.role}
                    </Badge>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge color={u.disabled || u.authDisabled ? 'red' : 'green'}>
                      {u.disabled || u.authDisabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </td>

                  {/* Last sign-in (only when API is available) */}
                  {apiAvailable && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        {relativeTime(u.lastSignInTime)}
                      </div>
                    </td>
                  )}

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <ActionMenu
                      items={[
                        { label: 'Edit Info', icon: Pencil, onClick: () => openEdit(u) },
                        { label: 'Reset Password', icon: KeyRound, onClick: () => handleResetPassword(u) },
                        { divider: true },
                        u.disabled
                          ? { label: 'Enable Account', icon: ShieldCheck, onClick: () => handleToggleDisable(u) }
                          : { label: 'Disable Account', icon: ShieldOff, danger: true, onClick: () => handleToggleDisable(u) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={apiAvailable ? 6 : 5} className="text-center py-10 text-gray-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit User">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="Jane"
              error={errors.firstName?.message}
              {...register('firstName', { required: 'Required' })}
            />
            <Input
              label="Last Name"
              placeholder="Smith"
              error={errors.lastName?.message}
              {...register('lastName', { required: 'Required' })}
            />
          </div>
          <Select label="Gender" {...register('gender')}>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
          <Select
            label="Role"
            error={errors.role?.message}
            {...register('role', { required: 'Required' })}
          >
            <option value="admin">Admin</option>
            <option value="trainer">Trainer</option>
            <option value="student">Student</option>
          </Select>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Update
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
