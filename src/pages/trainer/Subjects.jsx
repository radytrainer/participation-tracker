import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, BookMarked, UserPlus, X, Search, Users2 } from 'lucide-react'
import ActionMenu from '../../components/ui/ActionMenu'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import {
  getTerms, getSubjects, addSubject, updateSubject, deleteSubject,
  getAllClasses, getCollection, getAssignmentsBySubject,
  getAssignments, addAssignment, deleteAssignment,
} from '../../firebase/firestore'
import { where } from 'firebase/firestore'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import clsx from 'clsx'

// One color palette entry per term slot (cycles if more than 6 terms)
const TERM_COLORS = [
  { tab: 'border-blue-500 text-blue-600', dot: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', icon: 'text-blue-600' },
  { tab: 'border-emerald-500 text-emerald-600', dot: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', icon: 'text-emerald-600' },
  { tab: 'border-violet-500 text-violet-600', dot: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800', icon: 'text-violet-600' },
  { tab: 'border-orange-500 text-orange-600', dot: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800', icon: 'text-orange-600' },
  { tab: 'border-rose-500 text-rose-600', dot: 'bg-rose-500', light: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800', icon: 'text-rose-600' },
  { tab: 'border-amber-500 text-amber-600', dot: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', icon: 'text-amber-600' },
]

export default function Subjects() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [terms, setTerms] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [assignments, setAssignments] = useState({})  // subjectId → assignment[]
  const [loading, setLoading] = useState(true)

  // Filter state — client-side only, no extra Firestore queries
  const [activeTerm, setActiveTerm] = useState('all')
  const [search, setSearch] = useState('')

  // Subject modal
  const [subjectModal, setSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)

  // Assignment modal
  const [assignModal, setAssignModal] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)

  const subjectForm = useForm()
  const assignForm = useForm()

  async function load() {
    const [t, c, tr, allSubs, allAsgn] = await Promise.all([
      getTerms(),
      getAllClasses(),
      getCollection('users', where('role', '==', 'trainer')),
      getSubjects(),          // all subjects, filter client-side
      getAssignments(),       // all assignments, group by subjectId
    ])

    setTerms(t)
    setClasses(c)
    setTrainers(tr)
    setSubjects(allSubs)

    const map = {}
    allAsgn.forEach((a) => {
      if (!map[a.subjectId]) map[a.subjectId] = []
      map[a.subjectId].push(a)
    })
    setAssignments(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Derived data ──────────────────────────────────────────────────────────

  const termColor = (termId) => {
    const idx = terms.findIndex((t) => t.id === termId)
    return TERM_COLORS[idx >= 0 ? idx % TERM_COLORS.length : 0]
  }

  const countByTerm = useMemo(() => {
    const c = { all: subjects.length }
    subjects.forEach((s) => { c[s.termId] = (c[s.termId] || 0) + 1 })
    return c
  }, [subjects])

  const filtered = useMemo(() => {
    let s = subjects
    if (activeTerm !== 'all') s = s.filter((x) => x.termId === activeTerm)
    const q = search.trim().toLowerCase()
    if (q) s = s.filter((x) =>
      x.name?.toLowerCase().includes(q) ||
      x.code?.toLowerCase().includes(q) ||
      x.description?.toLowerCase().includes(q)
    )
    return s
  }, [subjects, activeTerm, search])

  // Group filtered subjects by term for the "All" tab
  const groupedByTerm = useMemo(() => {
    if (activeTerm !== 'all') return null
    const groups = {}
    filtered.forEach((s) => {
      if (!groups[s.termId]) groups[s.termId] = []
      groups[s.termId].push(s)
    })
    return groups
  }, [filtered, activeTerm])

  // ── Subject CRUD ──────────────────────────────────────────────────────────

  function openAddSubject() {
    subjectForm.reset({ termId: activeTerm !== 'all' ? activeTerm : '' })
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
    } catch (e) { toast.error(e.message) }
  }

  async function handleDeleteSubject(id) {
    if (!confirm('Delete this subject? All assignments will also be removed.')) return
    await Promise.all((assignments[id] || []).map((a) => deleteAssignment(a.id)))
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
      if (existing) { toast.error('Already assigned'); return }
      await addAssignment({
        subjectId: assignTarget.id,
        termId: assignTarget.termId,
        classId: data.classId,
        trainerId: data.trainerId,
      })
      toast.success('Assignment added')
      setAssignModal(false)
      load()
    } catch (e) { toast.error(e.message) }
  }

  async function removeAssignment(id) {
    await deleteAssignment(id)
    toast.success('Removed')
    load()
  }

  const className = (id) => classes.find((c) => c.id === id)?.name || '—'
  const trainerName = (id) => {
    const t = trainers.find((x) => x.id === id)
    return t ? `${t.firstName} ${t.lastName}` : '—'
  }
  const termName = (id) => terms.find((t) => t.id === id)?.name || '—'

  const subjectErrors = subjectForm.formState.errors
  const assignErrors = assignForm.formState.errors

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subjects</h1>
          <p className="text-sm text-gray-500">{filtered.length} of {subjects.length} subjects</p>
        </div>
        {isAdmin && <Button icon={Plus} onClick={openAddSubject}>Add Subject</Button>}
      </div>

      {!isAdmin && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          View only — contact your administrator to manage subjects and assignments.
        </div>
      )}

      {/* ── Search + Term tabs ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">

        {/* Search bar */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code…"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Term tabs */}
        <div className="flex overflow-x-auto scrollbar-hide">
          <TermTab
            label="All Terms"
            count={countByTerm.all ?? 0}
            active={activeTerm === 'all'}
            onClick={() => setActiveTerm('all')}
          />
          {terms.map((t, i) => (
            <TermTab
              key={t.id}
              label={t.name}
              count={countByTerm[t.id] ?? 0}
              color={TERM_COLORS[i % TERM_COLORS.length]}
              active={activeTerm === t.id}
              onClick={() => setActiveTerm(t.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Subject cards ──────────────────────────────────────────────── */}
      {activeTerm === 'all' && !search ? (
        // Grouped by term when showing "All" without a search query
        <div className="space-y-6">
          {terms.map((t, i) => {
            const termSubs = (groupedByTerm || {})[t.id] || []
            if (termSubs.length === 0) return null
            const color = TERM_COLORS[i % TERM_COLORS.length]
            return (
              <section key={t.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={clsx('h-2.5 w-2.5 rounded-full flex-shrink-0', color.dot)} />
                  <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
                    {t.name}
                  </h2>
                  <span className="text-xs text-gray-400">({termSubs.length})</span>
                </div>
                <SubjectGrid
                  subjects={termSubs}
                  assignments={assignments}
                  color={color}
                  isAdmin={isAdmin}
                  className={className}
                  trainerName={trainerName}
                  termName={termName}
                  onEdit={openEditSubject}
                  onDelete={handleDeleteSubject}
                  onAssign={openAssign}
                  onRemoveAssignment={removeAssignment}
                />
              </section>
            )
          })}
          {Object.keys(groupedByTerm || {}).length === 0 && <EmptyState />}
        </div>
      ) : (
        // Flat grid when a term tab is selected or searching
        filtered.length > 0 ? (
          <SubjectGrid
            subjects={filtered}
            assignments={assignments}
            color={activeTerm !== 'all' ? TERM_COLORS[terms.findIndex((t) => t.id === activeTerm) % TERM_COLORS.length] : null}
            multiColor={activeTerm === 'all'}
            termColorFn={termColor}
            isAdmin={isAdmin}
            className={className}
            trainerName={trainerName}
            termName={termName}
            onEdit={openEditSubject}
            onDelete={handleDeleteSubject}
            onAssign={openAssign}
            onRemoveAssignment={removeAssignment}
          />
        ) : (
          <EmptyState query={search} />
        )
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
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
              <Input label="Subject Code" placeholder="e.g. ALG101" {...subjectForm.register('code')} />
              <Input label="Description" placeholder="Optional description" {...subjectForm.register('description')} />
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={() => setSubjectModal(false)}>Cancel</Button>
                <Button type="submit" loading={subjectForm.formState.isSubmitting}>
                  {editingSubject ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Modal>

          <Modal open={assignModal} onClose={() => setAssignModal(false)} title={`Assign — ${assignTarget?.name}`}>
            <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="space-y-4">
              <p className="text-sm text-gray-500">Select a trainer and the class they teach this subject in.</p>
              <Select
                label="Trainer *"
                error={assignErrors.trainerId?.message}
                {...assignForm.register('trainerId', { required: 'Required' })}
              >
                <option value="">Select trainer</option>
                {trainers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </Select>
              <Select
                label="Class *"
                error={assignErrors.classId?.message}
                {...assignForm.register('classId', { required: 'Required' })}
              >
                <option value="">Select class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

// ── Sub-components ────────────────────────────────────────────────────────────

function TermTab({ label, count, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0',
        active
          ? color
            ? `${color.tab} bg-gray-50 dark:bg-gray-700/30`
            : 'border-primary-500 text-primary-600 bg-gray-50 dark:bg-gray-700/30'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/20'
      )}
    >
      {label}
      <span className={clsx(
        'inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-xs px-1.5',
        active
          ? 'bg-current text-white opacity-90'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
      )}>
        {count}
      </span>
    </button>
  )
}

function SubjectGrid({
  subjects, assignments, color, multiColor, termColorFn,
  isAdmin, className, trainerName, termName,
  onEdit, onDelete, onAssign, onRemoveAssignment,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {subjects.map((sub) => {
        const c = multiColor ? termColorFn(sub.termId) : (color || TERM_COLORS[0])
        return (
          <SubjectCard
            key={sub.id}
            subject={sub}
            color={c}
            assignments={assignments[sub.id] || []}
            isAdmin={isAdmin}
            className={className}
            trainerName={trainerName}
            termName={termName}
            onEdit={onEdit}
            onDelete={onDelete}
            onAssign={onAssign}
            onRemoveAssignment={onRemoveAssignment}
          />
        )
      })}
    </div>
  )
}

function SubjectCard({
  subject, color, assignments, isAdmin,
  className, trainerName, termName,
  onEdit, onDelete, onAssign, onRemoveAssignment,
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex flex-col overflow-hidden">

      {/* Colored accent bar */}
      <div className={clsx('h-1 w-full', color.dot)} />

      {/* Card body */}
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{subject.name}</h3>
              {subject.code && <Badge color="gray">{subject.code}</Badge>}
            </div>
            {subject.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{subject.description}</p>
            )}
            <p className={clsx('text-xs mt-1 font-medium', color.icon)}>{termName(subject.termId)}</p>
          </div>
          {isAdmin && (
            <ActionMenu items={[
              { label: 'Edit', icon: Pencil, onClick: () => onEdit(subject) },
              { divider: true },
              { label: 'Delete', icon: Trash2, danger: true, onClick: () => onDelete(subject.id) },
            ]} />
          )}
        </div>

        {/* Assignments */}
        <div className="mt-3">
          {assignments.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No trainer assigned yet</p>
          ) : (
            <div className="space-y-1.5">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className={clsx(
                    'flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs',
                    color.light
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Users2 className={clsx('h-3 w-3 flex-shrink-0', color.icon)} />
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                      {trainerName(a.trainerId)}
                    </span>
                    <span className="text-gray-400 flex-shrink-0">·</span>
                    <span className="text-gray-500 truncate">{className(a.classId)}</span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => onRemoveAssignment(a.id)}
                      className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card footer */}
      {isAdmin && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onAssign(subject)}
            className={clsx(
              'flex items-center gap-1.5 text-xs font-medium transition-colors',
              color.icon,
              'hover:opacity-75'
            )}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Assign Trainer
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ query }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <BookMarked className="h-12 w-12 mx-auto mb-3 opacity-40" />
      {query
        ? <p>No subjects match <strong className="text-gray-500">"{query}"</strong></p>
        : <p>No subjects in this term yet.</p>
      }
    </div>
  )
}
