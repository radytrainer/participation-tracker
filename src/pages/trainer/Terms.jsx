import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, CalendarDays, BookMarked } from 'lucide-react'
import { formatDate } from '../../utils/dateUtils'
import ActionMenu from '../../components/ui/ActionMenu'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { getTerms, addTerm, updateTerm, deleteTerm, getSubjects } from '../../firebase/firestore'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'

const PRESET_TERMS = [
  { name: 'Term 1', order: 1 },
  { name: 'Term 2', order: 2 },
  { name: 'Term 3', order: 3 },
  { name: 'Term 4', order: 4 },
]

export default function Terms() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [terms, setTerms] = useState([])
  const [subjectsByTerm, setSubjectsByTerm] = useState({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  async function load() {
    const [data, allSubjects] = await Promise.all([getTerms(), getSubjects()])
    setTerms(data)
    const byTerm = {}
    allSubjects.forEach((s) => {
      if (!byTerm[s.termId]) byTerm[s.termId] = []
      byTerm[s.termId].push(s)
    })
    setSubjectsByTerm(byTerm)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function seedPresets() {
    for (const t of PRESET_TERMS) {
      await addTerm(t)
    }
    toast.success('Terms seeded!')
    load()
  }

  function openAdd() {
    reset({ order: terms.length + 1 })
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(term) {
    reset(term)
    setEditing(term)
    setModalOpen(true)
  }

  async function onSubmit(data) {
    try {
      if (editing) {
        await updateTerm(editing.id, { ...data, order: Number(data.order) })
        toast.success('Term updated')
      } else {
        await addTerm({ ...data, order: Number(data.order) })
        toast.success('Term created')
      }
      setModalOpen(false)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this term? This may affect subjects linked to it.')) return
    await deleteTerm(id)
    toast.success('Term deleted')
    load()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terms</h1>
          <p className="text-sm text-gray-500">{terms.length} terms configured</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {terms.length === 0 && (
              <Button variant="outline" onClick={seedPresets}>Seed Term 1–4</Button>
            )}
            <Button icon={Plus} onClick={openAdd}>Add Term</Button>
          </div>
        )}
      </div>

      {/* Info banner for trainers */}
      {!isAdmin && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          View only — contact your administrator to manage terms.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {terms.map((term) => {
          const termSubjects = subjectsByTerm[term.id] || []
          return (
            <div
              key={term.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-3">
                    <CalendarDays className="h-5 w-5 text-primary-600" />
                  </div>
                  <Badge color="blue">Order {term.order}</Badge>
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{term.name}</h3>
                {(term.startDate || term.endDate) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(term.startDate)} → {formatDate(term.endDate)}
                  </p>
                )}
                {term.description && (
                  <p className="text-sm text-gray-500 mt-1">{term.description}</p>
                )}
                <p className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <BookMarked className="h-3.5 w-3.5" />
                  {termSubjects.length} subject{termSubjects.length !== 1 ? 's' : ''}
                </p>
              </div>

              {termSubjects.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3 space-y-1">
                  {termSubjects.map((s) => (
                    <div key={s.id} className="flex items-center justify-between">
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{s.name}</span>
                      {s.code && <Badge color="gray">{s.code}</Badge>}
                    </div>
                  ))}
                </div>
              )}

              {isAdmin && (
                <div className="flex justify-end px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                  <ActionMenu items={[
                    { label: 'Edit', icon: Pencil, onClick: () => openEdit(term) },
                    { divider: true },
                    { label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(term.id) },
                  ]} />
                </div>
              )}
            </div>
          )
        })}

        {terms.length === 0 && (
          <div className="col-span-4 text-center py-12 text-gray-400">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No terms yet.{isAdmin ? ' Click "Seed Term 1–4" to get started.' : ''}</p>
          </div>
        )}
      </div>

      {isAdmin && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Term' : 'Add Term'}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Term Name"
              placeholder="e.g. Term 1"
              error={errors.name?.message}
              {...register('name', { required: 'Required' })}
            />
            <Input
              label="Order"
              type="number"
              min={1}
              placeholder="1"
              error={errors.order?.message}
              {...register('order', { required: 'Required' })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" {...register('startDate')} />
              <Input label="End Date" type="date" {...register('endDate')} />
            </div>
            <Input label="Description" placeholder="Optional notes" {...register('description')} />
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
