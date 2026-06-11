import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, BookMarked, UserPlus, X } from 'lucide-react'
import ActionMenu from '../../components/ui/ActionMenu'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import {
  getTerms, getSubjects, addSubject, updateSubject, deleteSubject,
  getAllClasses, getCollection, getAssignmentsBySubject,
  addAssignment, deleteAssignment,
} from '../../firebase/firestore'
import { where } from 'firebase/firestore'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'

export default function Subjects() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [terms, setTerms] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [assignments, setAssignments] = useState({}) // subjectId → assignments[]
  const [loading, setLoading] = useState(true)
  const [filterTerm, setFilterTerm] = useState('')

  // Subject modal
  const [subjectModal, setSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)

  // Assignment modal
  const [assignModal, setAssignModal] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null) // subject being assigned

  const subjectForm = useForm()
  const assignForm = useForm()

  async function load() {
    const [t, c, tr] = await Promise.all([
      getTerms(),
      getAllClasses(),
      getCollection('users', where('role', '==', 'trainer')),
    ])
    setTerms(t)
    setClasses(c)
    setTrainers(tr)

    const s = await getSubjects(filterTerm || undefined)
    setSubjects(s)

    // load assignments for all subjects
    const assignMap = {}
    await Promise.all(
      s.map(async (sub) => {
        const a = await getAssignmentsBySubject(sub.id)
        assignMap[sub.id] = a
      })
    )
    setAssignments(assignMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [filterTerm])

  // ── Subject CRUD ──────────────────────────────────────────────────────────

  function openAddSubject() {
    subjectForm.reset({ termId: filterTerm || '' })
    setEditingSubject(null)
    setSubjectModal(true)
  }

  function openEditSubject(sub) {
    subjectForm.reset(sub)
    setEditingSubject(sub)
    setSubjectModal(true)
  }

  async function onSubjectSubmit(data) {
    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, data)
        toast.success('Subject updated')
      } else {
        await addSubject(data)
        toast.success('Subject created')
      }
      setSubjectModal(false)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleDeleteSubject(id) {
    if (!confirm('Delete this subject? All assignments will also be removed.')) return
    // delete assignments first
    const a = assignments[id] || []
    await Promise.all(a.map((x) => deleteAssignment(x.id)))
    await deleteSubject(id)
    toast.success('Subject deleted')
    load()
  }

  // ── Assignment CRUD ───────────────────────────────────────────────────────

  function openAssign(subject) {
    assignForm.reset({})
    setAssignTarget(subject)
    setAssignModal(true)
  }

  async function onAssignSubmit(data) {
    try {
      const existing = (assignments[assignTarget.id] || []).find(
        (a) => a.classId === data.classId && a.trainerId === data.trainerId
      )
      if (existing) {
        toast.error('This trainer is already assigned to this class for this subject')
        return
      }
      await addAssignment({
        subjectId: assignTarget.id,
        termId: assignTarget.termId,
        classId: data.classId,
        trainerId: data.trainerId,
      })
      toast.success('Assignment added')
      setAssignModal(false)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function removeAssignment(id) {
    await deleteAssignment(id)
    toast.success('Assignment removed')
    load()
  }

  const termName = (id) => terms.find((t) => t.id === id)?.name || '—'
  const className = (id) => classes.find((c) => c.id === id)?.name || '—'
  const trainerName = (id) => {
    const t = trainers.find((x) => x.id === id)
    return t ? `${t.firstName} ${t.lastName}` : '—'
  }

  const subjectErrors = subjectForm.formState.errors
  const assignErrors = assignForm.formState.errors

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subjects</h1>
          <p className="text-sm text-gray-500">{subjects.length} subjects</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
            <option value="">All Terms</option>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          {isAdmin && <Button icon={Plus} onClick={openAddSubject}>Add Subject</Button>}
        </div>
      </div>

      {!isAdmin && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          View only — contact your administrator to manage subjects and assignments.
        </div>
      )}

      <div className="space-y-4">
        {subjects.map((sub) => (
          <div
            key={sub.id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
          >
            {/* Subject header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary-50 dark:bg-primary-900/20 p-2.5">
                  <BookMarked className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{sub.name}</h3>
                    {sub.code && <Badge color="gray">{sub.code}</Badge>}
                  </div>
                  <p className="text-xs text-gray-400">{termName(sub.termId)}</p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" icon={UserPlus} onClick={() => openAssign(sub)}>
                    Assign
                  </Button>
                  <ActionMenu items={[
                    { label: 'Edit', icon: Pencil, onClick: () => openEditSubject(sub) },
                    { divider: true },
                    { label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDeleteSubject(sub.id) },
                  ]} />
                </div>
              )}
            </div>

            {/* Assignments table */}
            <div className="px-5 py-3">
              {(assignments[sub.id] || []).length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No trainer-class assignments yet.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(assignments[sub.id] || []).map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {trainerName(a.trainerId)}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-600 dark:text-gray-400">{className(a.classId)}</span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => removeAssignment(a.id)}
                          className="rounded p-1 text-gray-300 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {subjects.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <BookMarked className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No subjects yet.{isAdmin ? ' Add one to get started.' : ''}</p>
          </div>
        )}
      </div>

      {/* Subject Modal */}
      {isAdmin && (
        <>
          <Modal open={subjectModal} onClose={() => setSubjectModal(false)} title={editingSubject ? 'Edit Subject' : 'Add Subject'}>
            <form onSubmit={subjectForm.handleSubmit(onSubjectSubmit)} className="space-y-4">
              <Select
                label="Term *"
                error={subjectErrors.termId?.message}
                {...subjectForm.register('termId', { required: 'Required' })}
              >
                <option value="">Select term</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <Input
                label="Subject Name *"
                placeholder="e.g. Algorithm Design"
                error={subjectErrors.name?.message}
                {...subjectForm.register('name', { required: 'Required' })}
              />
              <Input
                label="Subject Code"
                placeholder="e.g. ALG101"
                {...subjectForm.register('code')}
              />
              <Input
                label="Description"
                placeholder="Optional description"
                {...subjectForm.register('description')}
              />
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={() => setSubjectModal(false)}>Cancel</Button>
                <Button type="submit" loading={subjectForm.formState.isSubmitting}>
                  {editingSubject ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Assignment Modal */}
          <Modal open={assignModal} onClose={() => setAssignModal(false)} title={`Assign Trainer — ${assignTarget?.name}`}>
            <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="space-y-4">
              <p className="text-sm text-gray-500">Select a trainer and the class they teach this subject in.</p>
              <Select
                label="Trainer *"
                error={assignErrors.trainerId?.message}
                {...assignForm.register('trainerId', { required: 'Required' })}
              >
                <option value="">Select trainer</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                ))}
              </Select>
              <Select
                label="Class *"
                error={assignErrors.classId?.message}
                {...assignForm.register('classId', { required: 'Required' })}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={() => setAssignModal(false)}>Cancel</Button>
                <Button type="submit" loading={assignForm.formState.isSubmitting}>Add Assignment</Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  )
}
