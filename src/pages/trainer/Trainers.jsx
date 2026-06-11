import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, ShieldCheck, Upload } from 'lucide-react'
import ActionMenu from '../../components/ui/ActionMenu'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { getCollection, updateDocument, deleteDocument } from '../../firebase/firestore'
import { registerUser } from '../../firebase/auth'
import { where } from 'firebase/firestore'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import ImportModal from '../../components/ui/ImportModal'

export default function Trainers() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const importerRef = useRef(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  async function load() {
    const data = await getCollection('users', where('role', 'in', ['admin', 'trainer']))
    // admins first, then trainers, both alphabetical
    data.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'admin' ? -1 : 1
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    })
    setTrainers(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    reset({})
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(trainer) {
    reset(trainer)
    setEditing(trainer)
    setModalOpen(true)
  }

  async function onSubmit(data) {
    try {
      if (editing) {
        const { email, password, ...rest } = data
        await updateDocument('users', editing.id, rest)
        toast.success('Trainer updated')
      } else {
        await registerUser(data.email, data.password, {
          role: 'trainer',
          firstName: data.firstName,
          lastName: data.lastName,
          gender: data.gender || '',
          classId: '',
        })
        toast.success('Trainer account created')
      }
      setModalOpen(false)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleDelete(t) {
    if (t.id === profile?.id) { toast.error("You can't delete your own account"); return }
    if (t.role === 'admin')   { toast.error("Admin accounts can't be deleted here"); return }
    if (!confirm('Delete this trainer account?')) return
    await deleteDocument('users', t.id)
    toast.success('Trainer deleted')
    load()
  }

  function openImport() {
    const seenEmails = new Set(trainers.map((t) => t.email?.toLowerCase()).filter(Boolean))
    const get = (row, keys) => keys.map((k) => (row[k] || '').toString().trim()).find(Boolean) || ''

    importerRef.current = async (row) => {
      const firstName = get(row, ['First Name', 'first_name', 'FirstName'])
      const lastName  = get(row, ['Last Name',  'last_name',  'LastName'])
      const email     = get(row, ['Email', 'email'])
      const password  = get(row, ['Password', 'password']) || 'Password@123'

      if (!firstName) throw new Error('First Name is required')
      if (!email)     throw new Error('Email is required')

      const emailLower = email.toLowerCase()
      if (seenEmails.has(emailLower)) throw new Error(`Email "${email}" already exists`)

      await registerUser(email, password, {
        role: 'trainer',
        firstName, lastName,
        gender: '',
        classId: '',
      })

      seenEmails.add(emailLower)
    }

    setImportOpen(true)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trainers</h1>
          <p className="text-sm text-gray-500">{trainers.length} staff member{trainers.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && <Button variant="outline" icon={Upload} onClick={openImport}>Import</Button>}
        {isAdmin && <Button icon={Plus} onClick={openAdd}>Add Trainer</Button>}
      </div>

      {!isAdmin && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          View only — contact your administrator to manage trainers.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">Trainer</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                {isAdmin && <th className="text-right px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {trainers.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 font-semibold text-sm">
                        {t.firstName?.[0]}{t.lastName?.[0]}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {t.firstName} {t.lastName}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.email}</td>
                  <td className="px-4 py-3">
                    <Badge color={t.role === 'admin' ? 'red' : 'blue'}>
                      {t.role === 'admin' ? 'Admin' : 'Trainer'}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <ActionMenu items={[
                        { label: 'Edit', icon: Pencil, onClick: () => openEdit(t) },
                        { divider: true },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(t) },
                      ]} />
                    </td>
                  )}
                </tr>
              ))}
              {trainers.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="text-center py-10 text-gray-400">
                    No trainers yet.{isAdmin ? ' Add one to get started.' : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ImportModal
        open={importOpen}
        onClose={(didImport) => { setImportOpen(false); if (didImport) load() }}
        title="Import Trainers"
        templateFilename="trainers"
        templateSample={[{
          'First Name': 'Jane',
          'Last Name': 'Smith',
          'Email': 'jane@example.com',
          'Password': 'Password@123',
        }]}
        onImport={importerRef.current || (() => {})}
      />

      {isAdmin && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Edit Trainer' : 'Add Trainer'}
        >
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
            <Input
              label="Email"
              type="email"
              placeholder="trainer@example.com"
              error={errors.email?.message}
              disabled={!!editing}
              {...register('email', { required: 'Required' })}
            />
            {!editing && (
              <Input
                label="Password"
                type="password"
                placeholder="Min 6 characters"
                error={errors.password?.message}
                {...register('password', {
                  required: 'Required',
                  minLength: { value: 6, message: 'Min 6 characters' },
                })}
              />
            )}
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {editing ? 'Update' : 'Create Trainer'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
