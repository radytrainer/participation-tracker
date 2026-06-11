import { useEffect, useState, useMemo, useCallback } from 'react'
import { Save, Pencil, Trash2, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import {
  getTerms, getSubjects, getAssignmentsBySubject, getAssignmentsByTrainer,
  getStudents, getAllClasses, getCollection,
  getParticipation, getTrainerParticipation,
  addParticipation, updateParticipation, deleteParticipation,
} from '../../firebase/firestore'
import { where } from 'firebase/firestore'
import { calcWeightedScore, getGrade } from '../../utils/calculations'
import { CRITERIA, SCORE_LABELS, MONTHS } from '../../utils/constants'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select, Textarea } from '../../components/ui/Input'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { GradeBadge } from '../../components/ui/Badge'
import ActionMenu from '../../components/ui/ActionMenu'
import clsx from 'clsx'

// ── Score button ──────────────────────────────────────────────────────────────

const SCORE_COLORS = {
  0: { active: 'bg-red-500 text-white border-red-500', hover: 'hover:border-red-400 hover:text-red-500' },
  1: { active: 'bg-orange-400 text-white border-orange-400', hover: 'hover:border-orange-400 hover:text-orange-500' },
  2: { active: 'bg-amber-400 text-white border-amber-400', hover: 'hover:border-amber-400 hover:text-amber-500' },
  3: { active: 'bg-blue-500 text-white border-blue-500', hover: 'hover:border-blue-400 hover:text-blue-500' },
  4: { active: 'bg-emerald-500 text-white border-emerald-500', hover: 'hover:border-emerald-400 hover:text-emerald-500' },
}

function ScoreBtn({ value, selected, onChange }) {
  const c = SCORE_COLORS[value]
  return (
    <button
      type="button"
      title={SCORE_LABELS[value]}
      onClick={() => onChange(value === selected ? null : value)}
      className={clsx(
        'w-8 h-8 rounded-lg text-xs font-bold border-2 transition-all duration-100 select-none',
        selected === value
          ? c.active
          : `bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-600 ${c.hover}`
      )}
    >
      {value}
    </button>
  )
}

function ScoreGroup({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3, 4].map((v) => (
        <ScoreBtn key={v} value={v} selected={value} onChange={onChange} />
      ))}
    </div>
  )
}

// ── Live weighted score ───────────────────────────────────────────────────────

function computeScore(row) {
  const keys = ['engagement', 'lab', 'teamwork', 'punctuality', 'professionalism']
  if (keys.some((k) => row[k] == null)) return null
  return calcWeightedScore({
    engagement: row.engagement,
    lab: row.lab,
    teamwork: row.teamwork,
    punctuality: row.punctuality,
    professionalism: row.professionalism,
  })
}

// ── Empty row factory ─────────────────────────────────────────────────────────

function emptyRow(studentId) {
  return {
    studentId,
    engagement: null,
    lab: null,
    teamwork: null,
    punctuality: null,
    professionalism: null,
    feedback: '',
    existingId: null,
    dirty: false,
    showFeedback: false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Participation() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const myId = profile?.id

  // Reference data
  const [terms, setTerms] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [allClasses, setAllClasses] = useState([])
  const [allTrainers, setAllTrainers] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [myAssignments, setMyAssignments] = useState([])

  // Session context (top selector bar)
  const [sessionTerm, setSessionTerm] = useState('')
  const [sessionSubject, setSessionSubject] = useState('')
  const [sessionAssignments, setSessionAssignments] = useState([])
  const [sessionClass, setSessionClass] = useState('')
  const [sessionTrainer, setSessionTrainer] = useState('')
  const [sessionWeek, setSessionWeek] = useState('')
  const [sessionMonth, setSessionMonth] = useState(MONTHS[new Date().getMonth()])
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])

  // Bulk entry grid
  const [sessionStudents, setSessionStudents] = useState([])
  const [rows, setRows] = useState({}) // { [studentId]: row }
  const [saving, setSaving] = useState(false)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  // Records list
  const [records, setRecords] = useState([])
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [filterTerm, setFilterTerm] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [showRecords, setShowRecords] = useState(false)

  // Edit modal (single record)
  const [editModal, setEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm()
  const [editScore, setEditScore] = useState(null)

  const watchedScores = watch(['engagement', 'lab', 'teamwork', 'punctuality', 'professionalism'])
  useEffect(() => {
    const [e, l, t, p, pr] = watchedScores.map(Number)
    if ([e, l, t, p, pr].some(isNaN)) { setEditScore(null); return }
    setEditScore(calcWeightedScore({ engagement: e, lab: l, teamwork: t, punctuality: p, professionalism: pr }))
  }, [JSON.stringify(watchedScores)])

  // ── Load reference data ───────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const [t, s, c, tr, stu] = await Promise.all([
        getTerms(),
        getSubjects(),
        getAllClasses(),
        getCollection('users', where('role', '==', 'trainer')),
        getCollection('users', where('role', '==', 'student')),
      ])
      setTerms(t)
      setAllSubjects(s)
      setAllClasses(c)
      setAllTrainers(tr)
      setAllStudents(stu)
      if (!isAdmin) {
        const a = await getAssignmentsByTrainer(myId)
        setMyAssignments(a)
      }
    }
    init()
  }, [])

  async function loadRecords() {
    setRecordsLoading(true)
    const recs = isAdmin
      ? await getParticipation()
      : await getTrainerParticipation(myId)
    setRecords(recs)
    setRecordsLoading(false)
  }

  useEffect(() => { loadRecords() }, [])

  // ── Session: subject changes → load assignments ───────────────────────────

  async function onSubjectChange(subjectId) {
    setSessionSubject(subjectId)
    setSessionClass('')
    setSessionTrainer('')
    setSessionStudents([])
    setRows({})
    setSessionLoaded(false)

    if (!subjectId) { setSessionAssignments([]); return }
    let a = await getAssignmentsBySubject(subjectId)
    if (!isAdmin) a = a.filter((x) => x.trainerId === myId)
    setSessionAssignments(a)
  }

  // Unique class options from session assignments
  const sessionClassOptions = useMemo(() => {
    const seen = new Set()
    return sessionAssignments.filter((a) => {
      if (seen.has(a.classId)) return false
      seen.add(a.classId); return true
    })
  }, [sessionAssignments])

  const sessionTrainerOptions = useMemo(
    () => sessionAssignments.filter((a) => a.classId === sessionClass),
    [sessionAssignments, sessionClass]
  )

  const sessionSubjects = useMemo(() => {
    if (isAdmin) return sessionTerm ? allSubjects.filter((s) => s.termId === sessionTerm) : allSubjects
    const ids = new Set(myAssignments.map((a) => a.subjectId))
    return allSubjects.filter((s) => ids.has(s.id) && (!sessionTerm || s.termId === sessionTerm))
  }, [sessionTerm, allSubjects, myAssignments, isAdmin])

  // ── Load students into the grid ───────────────────────────────────────────

  async function loadSession() {
    if (!sessionClass || !sessionWeek) {
      toast.error('Select a class and week first')
      return
    }
    const students = await getStudents(sessionClass)
    setSessionStudents(students)

    // Load existing records for this session to pre-fill
    const existing = await getParticipation(
      where('classId', '==', sessionClass),
      where('subjectId', '==', sessionSubject || ''),
      where('week', '==', Number(sessionWeek))
    )
    const existingMap = {}
    existing.forEach((r) => { existingMap[r.studentId] = r })

    const initialRows = {}
    students.forEach((s) => {
      const ex = existingMap[s.id]
      initialRows[s.id] = ex
        ? {
            studentId: s.id,
            engagement: ex.engagement,
            lab: ex.lab,
            teamwork: ex.teamwork,
            punctuality: ex.punctuality,
            professionalism: ex.professionalism,
            feedback: ex.feedback || '',
            existingId: ex.id,
            dirty: false,
            showFeedback: false,
          }
        : emptyRow(s.id)
    })
    setRows(initialRows)
    setSessionLoaded(true)
  }

  // ── Row updates ───────────────────────────────────────────────────────────

  function updateRow(studentId, field, value) {
    setRows((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value, dirty: true },
    }))
  }

  // ── Save session ──────────────────────────────────────────────────────────

  async function saveSession() {
    const dirtyRows = Object.values(rows).filter((r) => r.dirty)
    if (!dirtyRows.length) { toast('No changes to save'); return }

    const incomplete = dirtyRows.filter((r) => computeScore(r) === null)
    if (incomplete.length) {
      toast.error(`${incomplete.length} student(s) have incomplete scores`)
      return
    }

    setSaving(true)
    try {
      await Promise.all(
        dirtyRows.map((r) => {
          const ws = computeScore(r)
          const payload = {
            studentId: r.studentId,
            classId: sessionClass,
            subjectId: sessionSubject || '',
            termId: sessionTerm || '',
            trainerId: sessionTrainer || myId,
            week: Number(sessionWeek),
            month: sessionMonth,
            date: sessionDate,
            engagement: r.engagement,
            lab: r.lab,
            teamwork: r.teamwork,
            punctuality: r.punctuality,
            professionalism: r.professionalism,
            weightedScore: ws,
            grade: getGrade(ws),
            feedback: r.feedback || '',
            remark: '',
          }
          return r.existingId
            ? updateParticipation(r.existingId, payload)
            : addParticipation(payload)
        })
      )
      toast.success(`Saved ${dirtyRows.length} record(s)`)
      setRows((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((id) => { next[id] = { ...next[id], dirty: false } })
        return next
      })
      loadRecords()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Edit modal ────────────────────────────────────────────────────────────

  function openEdit(rec) {
    setEditTarget(rec)
    reset(rec)
    setEditScore(rec.weightedScore)
    setEditModal(true)
  }

  async function onEditSubmit(data) {
    try {
      const scores = {
        engagement: Number(data.engagement),
        lab: Number(data.lab),
        teamwork: Number(data.teamwork),
        punctuality: Number(data.punctuality),
        professionalism: Number(data.professionalism),
      }
      const ws = calcWeightedScore(scores)
      await updateParticipation(editTarget.id, {
        ...scores,
        weightedScore: ws,
        grade: getGrade(ws),
        feedback: data.feedback || '',
        remark: data.remark || '',
      })
      toast.success('Record updated')
      setEditModal(false)
      loadRecords()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this record?')) return
    await deleteParticipation(id)
    toast.success('Deleted')
    loadRecords()
  }

  // ── Lookup helpers ────────────────────────────────────────────────────────

  const lookupName = (arr, id, fields = ['name']) => {
    const item = arr.find((x) => x.id === id)
    return item ? fields.map((f) => item[f]).filter(Boolean).join(' ') : '—'
  }

  const filteredRecords = useMemo(() => records.filter((r) => {
    if (filterTerm && r.termId !== filterTerm) return false
    if (filterSubject && r.subjectId !== filterSubject) return false
    if (filterClass && r.classId !== filterClass) return false
    return true
  }), [records, filterTerm, filterSubject, filterClass])

  const filterSubjectOptions = useMemo(
    () => filterTerm ? allSubjects.filter((s) => s.termId === filterTerm) : allSubjects,
    [filterTerm, allSubjects]
  )

  const dirtyCount = Object.values(rows).filter((r) => r.dirty).length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Participation Entry</h1>
          <p className="text-sm text-gray-500">Select a session to score all students at once</p>
        </div>
      </div>

      {/* ── SESSION ENTRY PANEL ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10 overflow-hidden">

        {/* Context selector */}
        <div className="px-5 py-4 border-b border-primary-100 dark:border-primary-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 mb-3">Session</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

            <Select
              label="Term"
              value={sessionTerm}
              onChange={(e) => {
                setSessionTerm(e.target.value)
                setSessionSubject('')
                setSessionAssignments([])
                setSessionClass('')
                setSessionStudents([])
                setRows({})
                setSessionLoaded(false)
              }}
            >
              <option value="">All Terms</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>

            <Select
              label="Subject *"
              value={sessionSubject}
              onChange={(e) => onSubjectChange(e.target.value)}
            >
              <option value="">Select subject</option>
              {sessionSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>

            <Select
              label="Class *"
              value={sessionClass}
              onChange={(e) => {
                setSessionClass(e.target.value)
                setSessionTrainer('')
                setSessionStudents([])
                setRows({})
                setSessionLoaded(false)
              }}
            >
              <option value="">Select class</option>
              {sessionClassOptions.map((a) => (
                <option key={a.classId} value={a.classId}>
                  {lookupName(allClasses, a.classId)}
                </option>
              ))}
            </Select>

            <Select
              label="Week *"
              value={sessionWeek}
              onChange={(e) => { setSessionWeek(e.target.value); setSessionLoaded(false) }}
            >
              <option value="">Week</option>
              {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </Select>

            <Select label="Month" value={sessionMonth} onChange={(e) => setSessionMonth(e.target.value)}>
              {MONTHS.map((m) => <option key={m}>{m}</option>)}
            </Select>

            <Input
              label="Date"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>

          {/* Admin trainer selector */}
          {isAdmin && sessionTrainerOptions.length > 0 && (
            <div className="mt-3 max-w-xs">
              <Select
                label="Trainer"
                value={sessionTrainer}
                onChange={(e) => setSessionTrainer(e.target.value)}
              >
                <option value="">Select trainer</option>
                {sessionTrainerOptions.map((a) => (
                  <option key={a.trainerId} value={a.trainerId}>
                    {lookupName(allTrainers, a.trainerId, ['firstName', 'lastName'])}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={loadSession} variant="primary" size="sm">
              Load Students
            </Button>
            {sessionLoaded && (
              <span className="text-sm text-primary-700 dark:text-primary-400">
                {sessionStudents.length} students loaded
              </span>
            )}
          </div>
        </div>

        {/* Student scoring grid */}
        {sessionLoaded && sessionStudents.length > 0 && (
          <>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 px-5 py-3 bg-white dark:bg-gray-800/50 text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
              <span className="font-semibold text-gray-600 dark:text-gray-400">Score legend:</span>
              {[0,1,2,3,4].map((v) => (
                <span key={v} className="flex items-center gap-1">
                  <span className={clsx(
                    'inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold text-white',
                    v === 0 ? 'bg-red-500' : v === 1 ? 'bg-orange-400' : v === 2 ? 'bg-amber-400' : v === 3 ? 'bg-blue-500' : 'bg-emerald-500'
                  )}>{v}</span>
                  <span>{SCORE_LABELS[v].split(' ')[0]}</span>
                </span>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white dark:bg-gray-800/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold min-w-[180px]">Student</th>
                    {CRITERIA.map((c) => (
                      <th key={c.key} className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="text-gray-600 dark:text-gray-400 font-semibold">{c.label.split(' ')[0]}</div>
                        <div className="text-xs text-gray-400 font-normal">{c.weight}</div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center text-gray-600 dark:text-gray-400 font-semibold">Score</th>
                    <th className="px-3 py-3 text-center text-gray-600 dark:text-gray-400 font-semibold">Grade</th>
                    <th className="px-3 py-3 text-center text-gray-600 dark:text-gray-400 font-semibold w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {sessionStudents.map((student, idx) => {
                    const row = rows[student.id] || emptyRow(student.id)
                    const score = computeScore(row)
                    const grade = score !== null ? getGrade(score) : null
                    const isExisting = !!row.existingId
                    return (
                      <tr
                        key={student.id}
                        className={clsx(
                          'transition-colors',
                          row.dirty
                            ? 'bg-primary-50 dark:bg-primary-900/10'
                            : idx % 2 === 0
                            ? 'bg-white dark:bg-gray-800'
                            : 'bg-gray-50/50 dark:bg-gray-800/50'
                        )}
                      >
                        {/* Student name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 text-xs font-bold">
                              {student.firstName?.[0]}{student.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">
                                {student.firstName} {student.lastName}
                              </p>
                              {isExisting && (
                                <span className="text-xs text-emerald-600">existing record</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Score buttons for each criterion */}
                        {CRITERIA.map((c) => (
                          <td key={c.key} className="px-3 py-3">
                            <ScoreGroup
                              value={row[c.key]}
                              onChange={(v) => updateRow(student.id, c.key, v)}
                            />
                          </td>
                        ))}

                        {/* Live score */}
                        <td className="px-3 py-3 text-center">
                          <span className={clsx(
                            'text-base font-bold',
                            score === null ? 'text-gray-300' : 'text-primary-600'
                          )}>
                            {score !== null ? `${score}%` : '—'}
                          </span>
                        </td>

                        {/* Grade */}
                        <td className="px-3 py-3 text-center">
                          {grade ? <GradeBadge grade={grade} /> : <span className="text-gray-300 text-xs">—</span>}
                        </td>

                        {/* Feedback toggle */}
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            title="Feedback"
                            onClick={() => updateRow(student.id, 'showFeedback', !row.showFeedback)}
                            className={clsx(
                              'rounded-lg p-1.5 transition-colors',
                              row.showFeedback || row.feedback
                                ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                                : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                            )}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Inline feedback rows */}
                  {sessionStudents.map((student) => {
                    const row = rows[student.id]
                    if (!row?.showFeedback) return null
                    return (
                      <tr key={`fb-${student.id}`} className="bg-blue-50/50 dark:bg-blue-900/10">
                        <td colSpan={9} className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 font-medium w-32 flex-shrink-0">
                              {student.firstName}'s feedback:
                            </span>
                            <input
                              type="text"
                              value={row.feedback}
                              onChange={(e) => updateRow(student.id, 'feedback', e.target.value)}
                              placeholder="Optional trainer feedback..."
                              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Save bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500">
                {dirtyCount > 0
                  ? <span className="text-primary-600 font-medium">{dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}</span>
                  : 'All saved'}
              </p>
              <Button
                icon={Save}
                onClick={saveSession}
                loading={saving}
                disabled={dirtyCount === 0}
              >
                Save {dirtyCount > 0 ? `(${dirtyCount})` : 'All'}
              </Button>
            </div>
          </>
        )}

        {sessionLoaded && sessionStudents.length === 0 && (
          <div className="px-5 py-10 text-center text-gray-400">
            No students found in this class.
          </div>
        )}
      </div>

      {/* ── RECORDS LIST ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
          onClick={() => setShowRecords((v) => !v)}
        >
          <div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">All Records</span>
            <span className="ml-2 text-sm text-gray-500">({filteredRecords.length})</span>
          </div>
          {showRecords ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {showRecords && (
          <>
            {/* Filters */}
            <div className="flex gap-3 flex-wrap px-5 pb-4 border-b border-gray-100 dark:border-gray-700">
              <Select value={filterTerm} onChange={(e) => { setFilterTerm(e.target.value); setFilterSubject('') }}>
                <option value="">All Terms</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <Select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                <option value="">All Subjects</option>
                {filterSubjectOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {allClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-3">Student</th>
                    <th className="text-left px-4 py-3">Subject</th>
                    <th className="text-left px-4 py-3">Class</th>
                    <th className="text-center px-4 py-3">Term</th>
                    <th className="text-center px-4 py-3">Wk</th>
                    <th className="text-center px-4 py-3">Eng</th>
                    <th className="text-center px-4 py-3">Lab</th>
                    <th className="text-center px-4 py-3">Team</th>
                    <th className="text-center px-4 py-3">Punct</th>
                    <th className="text-center px-4 py-3">Prof</th>
                    <th className="text-center px-4 py-3">Score</th>
                    <th className="text-center px-4 py-3">Grade</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {lookupName(allStudents, r.studentId, ['firstName', 'lastName'])}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{lookupName(allSubjects, r.subjectId)}</td>
                      <td className="px-4 py-3 text-gray-500">{lookupName(allClasses, r.classId)}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{lookupName(terms, r.termId)}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{r.week}</td>
                      <td className="px-4 py-3 text-center">{r.engagement}</td>
                      <td className="px-4 py-3 text-center">{r.lab}</td>
                      <td className="px-4 py-3 text-center">{r.teamwork}</td>
                      <td className="px-4 py-3 text-center">{r.punctuality}</td>
                      <td className="px-4 py-3 text-center">{r.professionalism}</td>
                      <td className="px-4 py-3 text-center font-semibold text-primary-600">{r.weightedScore}%</td>
                      <td className="px-4 py-3 text-center"><GradeBadge grade={r.grade} /></td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu items={[
                          { label: 'Edit', icon: Pencil, onClick: () => openEdit(r) },
                          { divider: true },
                          { label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(r.id) },
                        ]} />
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr><td colSpan={13} className="text-center py-10 text-gray-400">No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── EDIT MODAL (single record) ──────────────────────────────────── */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Record" size="lg">
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {CRITERIA.map((c) => (
              <Select key={c.key} label={`${c.label} (${c.weight})`} error={errors[c.key]?.message} {...register(c.key, { required: 'Required' })}>
                <option value="">Select</option>
                {[4, 3, 2, 1, 0].map((v) => (
                  <option key={v} value={v}>{v} — {SCORE_LABELS[v]}</option>
                ))}
              </Select>
            ))}
          </div>

          {editScore !== null && (
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-700 px-4 py-3">
              <span className="text-sm text-gray-500">Weighted score:</span>
              <span className="text-lg font-bold text-primary-600">{editScore}%</span>
              <GradeBadge grade={getGrade(editScore)} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Textarea label="Feedback" rows={3} {...register('feedback')} />
            <Textarea label="Remark" rows={3} {...register('remark')} />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Update</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
