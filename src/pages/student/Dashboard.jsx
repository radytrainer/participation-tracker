import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, Star, MessageSquare, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getStudentParticipation } from '../../firebase/firestore'
import { averageScore, getGrade, gradeDistribution } from '../../utils/calculations'
import { CRITERIA } from '../../utils/constants'
import StatCard from '../../components/ui/StatCard'
import { GradeBadge } from '../../components/ui/Badge'
import ProgressLineChart from '../../components/charts/ProgressLineChart'
import RubricRadarChart from '../../components/charts/RubricRadarChart'
import GradeDonutChart from '../../components/charts/GradeDonutChart'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'

export default function StudentDashboard() {
  const { profile } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    getStudentParticipation(profile.id).then((data) => {
      setRecords(data.sort((a, b) => Number(a.week) - Number(b.week)))
      setLoading(false)
    })
  }, [profile])

  const avg = useMemo(() => averageScore(records), [records])
  const grade = useMemo(() => getGrade(avg), [avg])
  const latest = records[records.length - 1]

  const weeklyData = useMemo(() =>
    records.map((r) => ({ label: `Wk ${r.week}`, score: r.weightedScore })),
    [records]
  )

  const monthlyData = useMemo(() => {
    const byMonth = {}
    records.forEach((r) => {
      if (!byMonth[r.month]) byMonth[r.month] = []
      byMonth[r.month].push(r.weightedScore)
    })
    return Object.entries(byMonth).map(([month, scores]) => ({
      label: month.slice(0, 3),
      score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }))
  }, [records])

  const radarData = useMemo(() => {
    const totals = { engagement: 0, lab: 0, teamwork: 0, punctuality: 0, professionalism: 0 }
    const count = records.length || 1
    records.forEach((r) => Object.keys(totals).forEach((k) => { totals[k] += r[k] || 0 }))
    return CRITERIA.map((c) => ({ subject: c.label.split(' ')[0], score: +(totals[c.key] / count).toFixed(2) }))
  }, [records])

  const gradeData = useMemo(() => gradeDistribution(records), [records])

  const feedbacks = useMemo(() =>
    [...records].reverse().filter((r) => r.feedback).slice(0, 5),
    [records]
  )

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome, {profile?.firstName}!
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your participation dashboard
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Overall Score" value={`${avg}%`} icon={TrendingUp} color="blue" />
        <StatCard label="Grade" value={grade} icon={Star} color={avg >= 85 ? 'green' : avg >= 70 ? 'blue' : avg >= 55 ? 'amber' : 'red'} />
        <StatCard label="Sessions Tracked" value={records.length} icon={Calendar} color="purple" />
        <StatCard
          label="Latest Score"
          value={latest ? `${latest.weightedScore}%` : '—'}
          icon={TrendingUp}
          color="green"
          sub={latest ? `Week ${latest.week}` : undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProgressLineChart data={weeklyData} title="Weekly Progress" />
        <ProgressLineChart data={monthlyData} title="Monthly Progress" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RubricRadarChart data={radarData} title="Rubric Breakdown" />
        <GradeDonutChart data={gradeData} title="Grade History" />
      </div>

      {/* Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary-500" /> Trainer Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {feedbacks.length === 0 && (
            <p className="text-sm text-gray-400">No feedback yet.</p>
          )}
          {feedbacks.map((r) => (
            <div key={r.id} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Week {r.week} · {r.month}</span>
                  <GradeBadge grade={r.grade} />
                </div>
                <span className="text-xs font-semibold text-primary-600">{r.weightedScore}%</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{r.feedback}</p>
              {r.remark && (
                <p className="text-xs text-gray-500 mt-1 italic">Remark: {r.remark}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Score history table */}
      <Card>
        <CardHeader>
          <CardTitle>Score History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">Week</th>
                  <th className="text-left px-4 py-3">Month</th>
                  <th className="text-center px-4 py-3">Eng</th>
                  <th className="text-center px-4 py-3">Lab</th>
                  <th className="text-center px-4 py-3">Team</th>
                  <th className="text-center px-4 py-3">Punct</th>
                  <th className="text-center px-4 py-3">Prof</th>
                  <th className="text-center px-4 py-3">Score</th>
                  <th className="text-center px-4 py-3">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[...records].reverse().map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium">{r.week}</td>
                    <td className="px-4 py-3 text-gray-500">{r.month}</td>
                    <td className="px-4 py-3 text-center">{r.engagement}</td>
                    <td className="px-4 py-3 text-center">{r.lab}</td>
                    <td className="px-4 py-3 text-center">{r.teamwork}</td>
                    <td className="px-4 py-3 text-center">{r.punctuality}</td>
                    <td className="px-4 py-3 text-center">{r.professionalism}</td>
                    <td className="px-4 py-3 text-center font-semibold text-primary-600">{r.weightedScore}%</td>
                    <td className="px-4 py-3 text-center"><GradeBadge grade={r.grade} /></td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">No records yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
