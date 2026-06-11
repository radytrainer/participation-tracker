import { useEffect, useState, useMemo, useRef } from 'react'
import {
  Users, BookOpen, TrendingUp, AlertTriangle, Award,
  ArrowUp, ArrowDown, Minus, LayoutDashboard, ArrowLeftRight, Search, X,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { getStudents, getAllClasses, getParticipation, getTerms } from '../../firebase/firestore'
import { averageScore, gradeDistribution } from '../../utils/calculations'
import { CRITERIA, MONTHS } from '../../utils/constants'
import StatCard from '../../components/ui/StatCard'
import ProgressLineChart from '../../components/charts/ProgressLineChart'
import ClassBarChart from '../../components/charts/ClassBarChart'
import GradeDonutChart from '../../components/charts/GradeDonutChart'
import RubricRadarChart from '../../components/charts/RubricRadarChart'
import GenderComparisonChart from '../../components/charts/GenderComparisonChart'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Select } from '../../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'

function getPeriodLabel(type, value, terms) {
  if (!value) return ''
  if (type === 'week') return `Week ${value}`
  if (type === 'month') return MONTHS[Number(value) - 1] || `Month ${value}`
  const term = terms.find((t) => t.id === value)
  return term?.name || `Term ${value}`
}

function filterByPeriod(records, type, value) {
  if (!value) return []
  if (type === 'week') return records.filter((p) => String(p.week) === String(value))
  if (type === 'month') return records.filter((p) => String(p.month) === String(value))
  return records.filter((p) => p.termId === value)
}

function StudentSearch({ students, classes, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const selected = value ? students.find((s) => s.id === value) : null

  const suggestions = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return students
      .filter((s) => `${s.firstName} ${s.lastName} ${s.studentId || ''}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [students, query])

  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(s) {
    onChange(s.id)
    setQuery('')
    setOpen(false)
  }

  const className = (classId) => classes.find((c) => c.id === classId)?.name || '—'

  if (selected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-sm">
        {selected.photoURL ? (
          <img src={selected.photoURL} alt="" className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {selected.firstName?.[0]}{selected.lastName?.[0]}
          </div>
        )}
        <div className="flex flex-col leading-tight">
          <span className="font-medium text-primary-700 dark:text-primary-300 leading-snug">
            {selected.firstName} {selected.lastName}
          </span>
          <span className="text-xs text-primary-400">
            {selected.studentId || 'No ID'} · {className(selected.classId)}
          </span>
        </div>
        <button onClick={() => onChange('')} className="ml-1 text-primary-400 hover:text-primary-600 flex-shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search student…"
          className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 w-48"
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onMouseDown={() => select(s)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
            >
              {s.photoURL ? (
                <img src={s.photoURL} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold flex-shrink-0">
                  {s.firstName?.[0]}{s.lastName?.[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {s.firstName} {s.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {s.studentId || '—'} · {className(s.classId)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TrainerDashboard() {
  const { profile } = useAuth()
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [terms, setTerms] = useState([])
  const [participation, setParticipation] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterClass, setFilterClass] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterStudent, setFilterStudent] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [comparePeriodType, setComparePeriodType] = useState('week')
  const [periodA, setPeriodA] = useState('')
  const [periodB, setPeriodB] = useState('')

  useEffect(() => {
    async function load() {
      const [s, c, t] = await Promise.all([getStudents(), getAllClasses(), getTerms()])
      setStudents(s)
      setClasses(c)
      setTerms(t)
      setParticipation(await getParticipation())
      setLoading(false)
    }
    load()
  }, [])

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (filterClass && s.classId !== filterClass) return false
      if (filterGender && s.gender !== filterGender) return false
      return true
    })
  }, [students, filterClass, filterGender])

  const displayStudents = useMemo(() => {
    if (filterStudent) return students.filter((s) => s.id === filterStudent)
    return filteredStudents
  }, [filteredStudents, filterStudent, students])

  const filteredParticipation = useMemo(() => {
    const ids = new Set(displayStudents.map((s) => s.id))
    return participation.filter((p) => ids.has(p.studentId))
  }, [displayStudents, participation])

  const stats = useMemo(() => {
    const avg = averageScore(filteredParticipation)
    const gradeMap = {}
    filteredParticipation.forEach((p) => { gradeMap[p.studentId] = p.grade })
    const excellent = Object.values(gradeMap).filter((g) => g === 'Excellent').length
    const atRisk = Object.values(gradeMap).filter((g) => g === 'Needs Improvement').length
    return { avg, excellent, atRisk }
  }, [filteredParticipation])

  const lineData = useMemo(() => {
    const byWeek = {}
    filteredParticipation.forEach((p) => {
      if (!byWeek[p.week]) byWeek[p.week] = []
      byWeek[p.week].push(p.weightedScore)
    })
    return Object.entries(byWeek)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([week, scores]) => ({
        label: `Wk ${week}`,
        score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      }))
  }, [filteredParticipation])

  const classBarData = useMemo(() => {
    return classes.map((c) => {
      const recs = participation.filter((p) => p.classId === c.id)
      return { name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name, score: averageScore(recs) }
    })
  }, [classes, participation])

  const gradeData = useMemo(() => gradeDistribution(filteredParticipation), [filteredParticipation])

  const radarData = useMemo(() => {
    const totals = { engagement: 0, lab: 0, teamwork: 0, punctuality: 0, professionalism: 0 }
    const count = filteredParticipation.length || 1
    filteredParticipation.forEach((p) => {
      Object.keys(totals).forEach((k) => { totals[k] += p[k] || 0 })
    })
    return CRITERIA.map((c) => ({
      subject: c.label.split(' ')[0],
      score: Math.round((totals[c.key] / count) * 10) / 10,
    }))
  }, [filteredParticipation])

  const genderData = useMemo(() => {
    const weeks = [...new Set(filteredParticipation.map((p) => p.week))].sort((a, b) => a - b)
    return weeks.slice(-6).map((week) => {
      const weekRecs = filteredParticipation.filter((p) => p.week === week)
      const maleIds = new Set(displayStudents.filter((s) => s.gender === 'Male').map((s) => s.id))
      const femaleIds = new Set(displayStudents.filter((s) => s.gender === 'Female').map((s) => s.id))
      return {
        label: `Wk ${week}`,
        Male: averageScore(weekRecs.filter((p) => maleIds.has(p.studentId))),
        Female: averageScore(weekRecs.filter((p) => femaleIds.has(p.studentId))),
      }
    })
  }, [filteredParticipation, displayStudents])

  // Available period values for comparison dropdowns
  const availablePeriods = useMemo(() => ({
    week: [...new Set(filteredParticipation.map((p) => p.week))].filter(Boolean).sort((a, b) => Number(a) - Number(b)),
    month: [...new Set(filteredParticipation.map((p) => p.month))].filter(Boolean).sort((a, b) => Number(a) - Number(b)),
    term: [...new Set(filteredParticipation.map((p) => p.termId))].filter(Boolean),
  }), [filteredParticipation])

  const periodARecords = useMemo(
    () => filterByPeriod(filteredParticipation, comparePeriodType, periodA),
    [filteredParticipation, comparePeriodType, periodA]
  )
  const periodBRecords = useMemo(
    () => filterByPeriod(filteredParticipation, comparePeriodType, periodB),
    [filteredParticipation, comparePeriodType, periodB]
  )

  const comparisonRadarData = useMemo(() => {
    return CRITERIA.map((c) => {
      const avg = (records) =>
        records.length
          ? Math.round((records.reduce((sum, p) => sum + (p[c.key] || 0), 0) / records.length) * 10) / 10
          : 0
      return { subject: c.label.split(' ')[0], A: avg(periodARecords), B: avg(periodBRecords) }
    })
  }, [periodARecords, periodBRecords])

  const scoreA = averageScore(periodARecords)
  const scoreB = averageScore(periodBRecords)
  const scoreDiff = Math.round((scoreB - scoreA) * 10) / 10

  if (loading) return <LoadingSpinner />

  const selectedStudent = filterStudent ? students.find((s) => s.id === filterStudent) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {selectedStudent
            ? `Viewing: ${selectedStudent.firstName} ${selectedStudent.lastName}`
            : `Welcome back, ${profile?.firstName}`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
          { id: 'compare', label: 'Period Comparison', Icon: ArrowLeftRight },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filterClass}
          onChange={(e) => { setFilterClass(e.target.value); setFilterStudent('') }}
          className="text-sm"
        >
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select
          value={filterGender}
          onChange={(e) => { setFilterGender(e.target.value); setFilterStudent('') }}
          className="text-sm"
        >
          <option value="">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </Select>
        <StudentSearch
          students={filteredStudents.slice().sort((a, b) =>
            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
          )}
          classes={classes}
          value={filterStudent}
          onChange={setFilterStudent}
        />
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <StatCard label="Total Students" value={displayStudents.length} icon={Users} color="blue" />
            <StatCard label="Male" value={displayStudents.filter((s) => s.gender === 'Male').length} icon={Users} color="blue" />
            <StatCard label="Female" value={displayStudents.filter((s) => s.gender === 'Female').length} icon={Users} color="purple" />
            <StatCard label="Active Classes" value={classes.length} icon={BookOpen} color="green" />
            <StatCard label="Avg Score" value={`${stats.avg}%`} icon={TrendingUp} color="amber" />
            <StatCard label="Excellent" value={stats.excellent} icon={Award} color="green" />
            <StatCard label="At Risk" value={stats.atRisk} icon={AlertTriangle} color="red" />
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ProgressLineChart data={lineData} title="Weekly Average Score" />
            </div>
            <GradeDonutChart data={gradeData} />
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ClassBarChart data={classBarData} />
            <RubricRadarChart data={radarData} />
            <GenderComparisonChart data={genderData} />
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="space-y-6">
          {/* Period selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={comparePeriodType}
              onChange={(e) => { setComparePeriodType(e.target.value); setPeriodA(''); setPeriodB('') }}
              className="text-sm"
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="term">Term</option>
            </Select>
            <Select value={periodA} onChange={(e) => setPeriodA(e.target.value)} className="text-sm">
              <option value="">— Period A —</option>
              {availablePeriods[comparePeriodType].map((v) => (
                <option key={v} value={v}>{getPeriodLabel(comparePeriodType, v, terms)}</option>
              ))}
            </Select>
            <span className="text-gray-400 font-bold px-1">vs</span>
            <Select value={periodB} onChange={(e) => setPeriodB(e.target.value)} className="text-sm">
              <option value="">— Period B —</option>
              {availablePeriods[comparePeriodType].map((v) => (
                <option key={v} value={v}>{getPeriodLabel(comparePeriodType, v, terms)}</option>
              ))}
            </Select>
          </div>

          {!periodA || !periodB ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
              <ArrowLeftRight className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Select two periods above to compare them.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Score summary cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="py-5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      {getPeriodLabel(comparePeriodType, periodA, terms)}
                    </p>
                    <p className="text-3xl font-bold text-blue-600">{scoreA}%</p>
                    <p className="text-sm text-gray-400 mt-1">{periodARecords.length} sessions</p>
                  </CardContent>
                </Card>

                <Card className="flex items-center justify-center">
                  <CardContent className="py-5 text-center w-full">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Change</p>
                    <div className={clsx(
                      'flex items-center justify-center gap-1 text-2xl font-bold',
                      scoreDiff > 0 ? 'text-emerald-600' : scoreDiff < 0 ? 'text-red-500' : 'text-gray-400'
                    )}>
                      {scoreDiff > 0
                        ? <ArrowUp className="h-6 w-6" />
                        : scoreDiff < 0
                          ? <ArrowDown className="h-6 w-6" />
                          : <Minus className="h-6 w-6" />}
                      {Math.abs(scoreDiff)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="py-5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      {getPeriodLabel(comparePeriodType, periodB, terms)}
                    </p>
                    <p className="text-3xl font-bold text-purple-600">{scoreB}%</p>
                    <p className="text-sm text-gray-400 mt-1">{periodBRecords.length} sessions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Dual radar + grade donuts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Rubric Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={comparisonRadarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 4]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickCount={5} />
                        <Radar
                          name={getPeriodLabel(comparePeriodType, periodA, terms)}
                          dataKey="A"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                        <Radar
                          name={getPeriodLabel(comparePeriodType, periodB, terms)}
                          dataKey="B"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                          formatter={(v) => [v.toFixed(2), '']}
                        />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <GradeDonutChart
                    data={gradeDistribution(periodARecords)}
                    title={getPeriodLabel(comparePeriodType, periodA, terms)}
                  />
                  <GradeDonutChart
                    data={gradeDistribution(periodBRecords)}
                    title={getPeriodLabel(comparePeriodType, periodB, terms)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
