import { useEffect, useState, useMemo } from 'react'
import { Download, Printer, Trophy } from 'lucide-react'
import { getStudents, getAllClasses, getParticipation } from '../../firebase/firestore'
import { averageScore, getGrade, gradeDistribution } from '../../utils/calculations'
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils'
import Button from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { GradeBadge } from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import GradeDonutChart from '../../components/charts/GradeDonutChart'
import ProgressLineChart from '../../components/charts/ProgressLineChart'
import RubricRadarChart from '../../components/charts/RubricRadarChart'
import { CRITERIA } from '../../utils/constants'

export default function Reports() {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterClass, setFilterClass] = useState('')

  useEffect(() => {
    async function load() {
      const [s, c, r] = await Promise.all([getStudents(), getAllClasses(), getParticipation()])
      setStudents(s)
      setClasses(c)
      setRecords(r)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!filterClass) return records
    return records.filter((r) => r.classId === filterClass)
  }, [records, filterClass])

  const filteredStudents = useMemo(() => {
    if (!filterClass) return students
    return students.filter((s) => s.classId === filterClass)
  }, [students, filterClass])

  // Leaderboard
  const leaderboard = useMemo(() => {
    return filteredStudents
      .map((s) => {
        const recs = filtered.filter((r) => r.studentId === s.id)
        const avg = averageScore(recs)
        return { ...s, avg, grade: getGrade(avg), entries: recs.length }
      })
      .sort((a, b) => b.avg - a.avg)
  }, [filteredStudents, filtered])

  const gradeData = useMemo(() => gradeDistribution(filtered), [filtered])

  const lineData = useMemo(() => {
    const byWeek = {}
    filtered.forEach((r) => {
      if (!byWeek[r.week]) byWeek[r.week] = []
      byWeek[r.week].push(r.weightedScore)
    })
    return Object.entries(byWeek).sort(([a], [b]) => Number(a) - Number(b)).map(([w, scores]) => ({
      label: `Wk ${w}`,
      score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }))
  }, [filtered])

  const radarData = useMemo(() => {
    const totals = { engagement: 0, lab: 0, teamwork: 0, punctuality: 0, professionalism: 0 }
    const count = filtered.length || 1
    filtered.forEach((r) => Object.keys(totals).forEach((k) => { totals[k] += r[k] || 0 }))
    return CRITERIA.map((c) => ({ subject: c.label.split(' ')[0], score: +(totals[c.key] / count).toFixed(2) }))
  }, [filtered])

  function exportReport() {
    const data = leaderboard.map((s, i) => ({
      Rank: i + 1,
      'Student ID': s.studentId || '',
      Name: `${s.firstName} ${s.lastName}`,
      Gender: s.gender,
      Class: classes.find((c) => c.id === s.classId)?.name || '',
      'Avg Score (%)': s.avg,
      Grade: s.grade,
      Entries: s.entries,
    }))
    exportToPDF(
      'Student Participation Report',
      ['Rank', 'Student ID', 'Name', 'Gender', 'Class', 'Avg Score (%)', 'Grade', 'Entries'],
      data.map((r) => Object.values(r).map(String)),
      'participation_report'
    )
  }

  if (loading) return <LoadingSpinner />

  const rankColors = ['text-amber-500', 'text-gray-400', 'text-amber-700']

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500">Analytics & leaderboard</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Button icon={Download} onClick={exportReport}>Export PDF</Button>
          <Button icon={Printer} variant="outline" onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProgressLineChart data={lineData} title="Weekly Score Trend" />
        </div>
        <GradeDonutChart data={gradeData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RubricRadarChart data={radarData} />

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> Student Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Student</th>
                    <th className="text-center px-4 py-3">Score</th>
                    <th className="text-center px-4 py-3">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {leaderboard.slice(0, 15).map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className={`px-4 py-3 font-bold ${rankColors[i] || 'text-gray-500'}`}>{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 text-xs font-semibold">
                            {s.firstName?.[0]}{s.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{s.firstName} {s.lastName}</p>
                            <p className="text-xs text-gray-400">{classes.find((c) => c.id === s.classId)?.name || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-primary-600">{s.avg}%</td>
                      <td className="px-4 py-3 text-center"><GradeBadge grade={s.grade} /></td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">No data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
