import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Archive, BookOpen } from 'lucide-react'
import { formatDate } from '../../utils/dateUtils'
import ActionMenu from '../../components/ui/ActionMenu'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { getAllClasses, addClass, updateClass, deleteClass } from '../../firebase/firestore'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { format } from 'date-fns'

export default function Classes() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm()

  async function load() {
    const data = await getAllClasses()
    setClasses(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    reset({})
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(cls) {
    reset(cls)
    setEditing(cls)
    setModalOpen(true)
  }

  async function onSubmit(data) {
    try {
      if (editing) {
        await updateClass(editing.id, data)
        toast.success('Class updated')
      } else {
        await addClass({ ...data, trainerId: profile.id, archived: false })
        toast.success('Class created')
      }
      setModalOpen(false)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this class?')) return
    await deleteClass(id)
    toast.success('Class deleted')
    load()
  }

  async function toggleArchive(cls) {
    await updateClass(cls.id, { archived: !cls.archived })
    toast.success(cls.archived ? 'Class restored' : 'Class archived')
    load()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Classes</h1>
          <p className="text-sm text-gray-500">{classes.length} classes total</p>
        </div>
        {isAdmin && <Button icon={Plus} onClick={openAdd}>Add Class</Button>}
      </div>

      {!isAdmin && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          View only — contact your administrator to manage classes.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-3">
                <BookOpen className="h-5 w-5 text-primary-600" />
              </div>
              <Badge color={cls.archived ? 'gray' : 'green'}>
                {cls.archived ? 'Archived' : 'Active'}
              </Badge>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{cls.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{cls.course}</p>
            {cls.startDate && (
              <p className="text-xs text-gray-400 mt-2">
                {formatDate(cls.startDate)} → {cls.endDate ? formatDate(cls.endDate) : '…'}
              </p>
            )}
            {isAdmin && (
              <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <ActionMenu items={[
                  { label: 'Edit', icon: Pencil, onClick: () => openEdit(cls) },
                  { label: cls.archived ? 'Restore' : 'Archive', icon: Archive, onClick: () => toggleArchive(cls) },
                  { divider: true },
                  { label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(cls.id) },
                ]} />
              </div>
            )}
          </div>
        ))}

        {classes.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No classes yet. Create one to get started.</p>
          </div>
        )}
      </div>

      {isAdmin && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Class' : 'Add Class'}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Class Name"
              placeholder="e.g. React Bootcamp"
              error={errors.name?.message}
              {...register('name', { required: 'Required' })}
            />
            <Input
              label="Course"
              placeholder="e.g. Web Development"
              error={errors.course?.message}
              {...register('course', { required: 'Required' })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" {...register('startDate')} />
              <Input label="End Date" type="date" {...register('endDate')} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
