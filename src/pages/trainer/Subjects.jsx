import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, BookMarked, UserPlus, X, Search, Users2, Globe, Network } from 'lucide-react'
import ActionMenu from '../../components/ui/ActionMenu'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import {
  getTerms, getSubjects, addSubject, updateSubject, deleteSubject,
  getAllClasses, getCollection, getAssignments,
  addAssignment, deleteAssignment,
} from '../../firebase/firestore'
import { where } from 'firebase/firestore'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import clsx from 'clsx'

// ── Major definitions ─────────────────────────────────────────────────────────

const MAJORS = [
  {
    name: 'Web Programming',
    icon: Globe,
    header: 'bg-indigo-600 dark:bg-indigo-700',
    pill:   'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700',
    text:   'text-indigo-700 dark:text-indigo-300',
    dot:    'bg-indigo-500',
    accent: 'bg-indigo-500',
    border: 'border-indigo-200 dark:border-indigo-700',
    badge:  'bg-indigo-100 text-indigo-700',
    icon_c: 'text-indigo-600',
  },
  {
    name: 'System Networking',
    icon: Network,
    header: 'bg-teal-600 dark:bg-teal-700',
    pill:   'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700',
    text:   'text-teal-700 dark:text-teal-300',
    dot:    'bg-teal-500',
    accent: 'bg-teal-500',
    border: 'border-teal-200 dark:border-teal-700',
    badge:  'bg-teal-100 text-teal-700',
    icon_c: 'text-teal-600',
  },
]

const MAJOR_MAP = Object.fromEntries(MAJORS.map((m) => [m.name, m]))

// Term color palette (for term tabs + term-1 cards)
const TERM_COLORS = [
  { tab: 'border-blue-500 text-blue-600',   dot: 'bg-blue-500',   pill: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',   icon_c: 'text-blue-600' },
  { tab: 'border-violet-500 text-violet-600', dot: 'bg-violet-500', pill: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800', icon_c: 'text-violet-600' },
  { tab: 'border-orange-500 text-orange-600', dot: 'bg-orange-500', pill: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800', icon_c: 'text-orange-600' },
  { tab: 'border-rose-500 text-rose-600',   dot: 'bg-rose-500',   pill: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',   icon_c: 'text-rose-600' },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Subjects() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [terms, setTerms] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [assignments, setAssignments] = useState({})
  const [loading, setLoading] = useState(true)

  const [activeTerm, setActiveTerm] = useState('all')
  const [search, setSearch] = useState('')

  const [subjectModal, setSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [assignModal, setAssignModal] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)

  const subjectForm = useForm()
  const assignForm = useForm()

  async function load() {
    const [t, c, tr, allSubs, allAsgn] = await Promise.all([
      getTerms(),
      getAllClasses(),
      getCollection('users', where('role', 'in', ['admin', 'trainer'])),
      getSubjects(),
      getAssignments(),
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

  // ── Derived ────────────────────────────────────────────────────────────────

  const termColorOf = (termId) => {
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

  // ── CRUD ───────────────────────────────────────────────────────────────────

  function openAddSubject() {
    subjectForm.reset({ termId: activeTerm !== 'all' ? activeTerm : '', major: '' })
    setEditingSubject(null)
    setSubjectModal(true)
  }
  function openEditSubject(sub) { subjectForm.reset(sub); setEditingSubject(sub); setSubjectModal(true) }

  async function onSubjectSubmit(data) {
    try {
      if (editingSubject) { await updateSubject(editingSubject.id, data); toast.success('Subject updated') }
      else { await addSubject(data); toast.success('Subject created') }
      setSubjectModal(false); load()
    } catch (e) { toast.error(e.message) }
  }

  async function handleDeleteSubject(id) {
    if (!confirm('Delete this subject? All assignments will also be removed.')) return
    await Promise.all((assignments[id] || []).map((a) => deleteAssignment(a.id)))
    await deleteSubject(id)
    toast.success('Subject deleted'); load()
  }

  function openAssign(subject) { assignForm.reset({}); setAssignTarget(subject); setAssignModal(true) }

  async function onAssignSubmit(data) {
    try {
      const existing = (assignments[assignTarget.id] || []).find(
        (a) => a.classId === data.classId && a.trainerId === data.trainerId
      )
      if (existing) { toast.error('Already assigned'); return }
      await addAssignment({ subjectId: assignTarget.id, termId: assignTarget.termId, classId: data.classId, trainerId: data.trainerId })
      toast.success('Assignment added'); setAssignModal(false); load()
    } catch (e) { toast.error(e.message) }
  }

  async function removeAssignment(id) { await deleteAssignment(id); toast.success('Removed'); load() }

  const helpers = {
    className:    (id) => classes.find((c) => c.id === id)?.name || '—',
    trainerName:  (id) => { const t = trainers.find((x) => x.id === id); return t ? `${t.firstName} ${t.lastName}` : '—' },
    termName:     (id) => terms.find((t) => t.id === id)?.name || '—',
    isAdmin, assignments, onEdit: openEditSubject, onDelete: handleDeleteSubject,
    onAssign: openAssign, onRemoveAssignment: removeAssignment,
  }

  const subjectErrors = subjectForm.formState.errors
  const assignErrors  = assignForm.formState.errors

  if (loading) return <LoadingSpinner />

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
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

      {/* Search + Term tabs */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code…"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 pl-9 pr-8 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex overflow-x-auto">
          <TermTab label="All Terms" count={countByTerm.all ?? 0} active={activeTerm === 'all'} onClick={() => setActiveTerm('all')} />
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

      {/* Content */}
      <ContentArea
        activeTerm={activeTerm}
        search={search}
        filtered={filtered}
        terms={terms}
        termColorOf={termColorOf}
        helpers={helpers}
      />

      {/* Modals */}
      {isAdmin && (
        <>
          <Modal open={subjectModal} onClose={() => setSubjectModal(false)} title={editingSubject ? 'Edit Subject' : 'Add Subject'}>
            <form onSubmit={subjectForm.handleSubmit(onSubjectSubmit)} className="space-y-4">
              <Select label="Term *" error={subjectErrors.termId?.message} {...subjectForm.register('termId', { required: 'Required' })}>
                <option value="">Select term</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <Select label="Major" {...subjectForm.register('major')}>
                <option value="">None (no major split)</option>
                {MAJORS.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
              </Select>
              <Input label="Subject Name *" placeholder="e.g. Algorithm Design" error={subjectErrors.name?.message} {...subjectForm.register('name', { required: 'Required' })} />
              <Input label="Subject Code" placeholder="e.g. ALG101" {...subjectForm.register('code')} />
              <Input label="Description" placeholder="Optional description" {...subjectForm.register('description')} />
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={() => setSubjectModal(false)}>Cancel</Button>
                <Button type="submit" loading={subjectForm.formState.isSubmitting}>{editingSubject ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </Modal>

          <Modal open={assignModal} onClose={() => setAssignModal(false)} title={`Assign — ${assignTarget?.name}`}>
            <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="space-y-4">
              <p className="text-sm text-gray-500">Select the trainer and class for this subject.</p>
              <Select label="Trainer *" error={assignErrors.trainerId?.message} {...assignForm.register('trainerId', { required: 'Required' })}>
                <option value="">Select trainer</option>
                {trainers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </Select>
              <Select label="Class *" error={assignErrors.classId?.message} {...assignForm.register('classId', { required: 'Required' })}>
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

// ── Content area ──────────────────────────────────────────────────────────────

function ContentArea({ activeTerm, search, filtered, terms, termColorOf, helpers }) {
  if (filtered.length === 0) return <EmptyState query={search} />

  // Single term selected → show directly
  if (activeTerm !== 'all') {
    const hasMajors = filtered.some((s) => s.major)
    if (hasMajors) {
      return <MajorColumnsView subjects={filtered} helpers={helpers} />
    }
    const color = termColorOf(activeTerm)
    return <SubjectList subjects={filtered} color={{ pill: color.pill, icon_c: color.icon_c }} helpers={helpers} />
  }

  // All terms — search active: flat grouped by major if any have majors
  if (search) {
    const hasMajors = filtered.some((s) => s.major)
    if (hasMajors) return <MajorColumnsView subjects={filtered} showTermBadge helpers={helpers} />
    return (
      <SubjectList
        subjects={filtered}
        color={{ pill: 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600', icon_c: 'text-gray-500' }}
        showTermBadge
        helpers={helpers}
      />
    )
  }

  // All terms — grouped by term section
  return (
    <div className="space-y-8">
      {terms.map((t, i) => {
        const termSubs = filtered.filter((s) => s.termId === t.id)
        if (termSubs.length === 0) return null
        const hasMajors = termSubs.some((s) => s.major)
        const color = TERM_COLORS[i % TERM_COLORS.length]
        return (
          <section key={t.id}>
            {/* Term section header */}
            <div className="flex items-center gap-3 mb-4">
              <span className={clsx('h-3 w-3 rounded-full flex-shrink-0', color.dot)} />
              <h2 className="font-bold text-gray-800 dark:text-gray-200">{t.name}</h2>
              <span className="text-xs text-gray-400 font-normal">({termSubs.length} subject{termSubs.length !== 1 ? 's' : ''})</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {hasMajors
              ? <MajorColumnsView subjects={termSubs} helpers={helpers} />
              : <SubjectList subjects={termSubs} color={{ pill: color.pill, icon_c: color.icon_c }} helpers={helpers} />
            }
          </section>
        )
      })}
    </div>
  )
}

// ── Major two-column layout ───────────────────────────────────────────────────

function MajorColumnsView({ subjects, showTermBadge, helpers }) {
  const subsByMajor = {}
  MAJORS.forEach((m) => { subsByMajor[m.name] = subjects.filter((s) => s.major === m.name) })
  const noMajor = subjects.filter((s) => !s.major)

  return (
    <div className="space-y-4">
      {/* Two major columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MAJORS.map((major) => (
          <MajorColumn
            key={major.name}
            major={major}
            subjects={subsByMajor[major.name]}
            showTermBadge={showTermBadge}
            helpers={helpers}
          />
        ))}
      </div>

      {/* Subjects without a major (rare edge case) */}
      {noMajor.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">General</p>
          <SubjectList
            subjects={noMajor}
            color={{ pill: 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600', icon_c: 'text-gray-500' }}
            showTermBadge={showTermBadge}
            helpers={helpers}
          />
        </div>
      )}
    </div>
  )
}

function MajorColumn({ major, subjects, showTermBadge, helpers }) {
  const Icon = major.icon
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Column header */}
      <div className={clsx('px-4 py-3 flex items-center justify-between', major.header)}>
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-white/80" />
          <span className="font-semibold text-white">{major.name}</span>
        </div>
        <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-medium">
          {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Subject list */}
      <div className="bg-gray-50/50 dark:bg-gray-800/50 p-3 space-y-2.5 min-h-[80px]">
        {subjects.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">No subjects added yet</div>
        ) : (
          subjects.map((sub) => (
            <SubjectCard
              key={sub.id}
              subject={sub}
              major={major}
              showTermBadge={showTermBadge}
              helpers={helpers}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Subject card (used inside both MajorColumn and SubjectList) ───────────────

function SubjectCard({ subject, major, termColor, showTermBadge, helpers }) {
  const { isAdmin, assignments, className, trainerName, termName, onEdit, onDelete, onAssign, onRemoveAssignment } = helpers
  const asgn = assignments[subject.id] || []
  const m = major || { pill: termColor?.pill || 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600', icon_c: termColor?.icon_c || 'text-gray-500', text: 'text-gray-600 dark:text-gray-400' }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      {/* Top accent bar */}
      {major && <div className={clsx('h-0.5 w-full', major.accent)} />}

      <div className="px-3.5 pt-3 pb-2">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-gray-900 dark:text-white">{subject.name}</span>
              {subject.code && (
                <span className={clsx('text-xs px-1.5 py-0.5 rounded font-mono font-medium', major ? major.badge : 'bg-gray-100 text-gray-600')}>
                  {subject.code}
                </span>
              )}
            </div>
            {subject.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{subject.description}</p>
            )}
            {showTermBadge && (
              <p className="text-xs text-gray-400 mt-0.5">{termName(subject.termId)}</p>
            )}
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
        {asgn.length > 0 && (
          <div className="mt-2 space-y-1">
            {asgn.map((a) => (
              <div key={a.id} className={clsx('flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs', m.pill)}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Users2 className={clsx('h-3 w-3 flex-shrink-0', m.icon_c)} />
                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{trainerName(a.trainerId)}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500 dark:text-gray-400 truncate">{className(a.classId)}</span>
                </div>
                {isAdmin && (
                  <button onClick={() => onRemoveAssignment(a.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {asgn.length === 0 && (
          <p className="text-xs text-gray-400 italic mt-1.5">No trainer assigned</p>
        )}
      </div>

      {/* Footer */}
      {isAdmin && (
        <div className="px-3.5 py-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onAssign(subject)}
            className={clsx('flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70', m.icon_c)}
          >
            <UserPlus className="h-3 w-3" />
            Assign Trainer
          </button>
        </div>
      )}
    </div>
  )
}

// ── Flat list for non-major terms ─────────────────────────────────────────────

function SubjectList({ subjects, color, showTermBadge, helpers }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {subjects.map((sub) => (
        <SubjectCard key={sub.id} subject={sub} termColor={color} showTermBadge={showTermBadge} helpers={helpers} />
      ))}
    </div>
  )
}

// ── Term tab ──────────────────────────────────────────────────────────────────

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
        'inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-xs px-1.5 font-semibold',
        active
          ? 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 shadow-sm'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
      )}>
        {count}
      </span>
    </button>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

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
