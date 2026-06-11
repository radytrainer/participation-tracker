export const WEIGHTS = {
  engagement: 0.25,
  lab: 0.30,
  teamwork: 0.20,
  punctuality: 0.15,
  professionalism: 0.10,
}

export function calcWeightedScore({ engagement, lab, teamwork, punctuality, professionalism }) {
  const raw =
    engagement * WEIGHTS.engagement +
    lab * WEIGHTS.lab +
    teamwork * WEIGHTS.teamwork +
    punctuality * WEIGHTS.punctuality +
    professionalism * WEIGHTS.professionalism
  return Math.round((raw / 4) * 100 * 10) / 10
}

export function getGrade(score) {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 55) return 'Satisfactory'
  return 'Needs Improvement'
}

export function getGradeColor(grade) {
  switch (grade) {
    case 'Excellent': return 'text-emerald-600'
    case 'Good': return 'text-blue-600'
    case 'Satisfactory': return 'text-amber-600'
    default: return 'text-red-600'
  }
}

export function getGradeBg(grade) {
  switch (grade) {
    case 'Excellent': return 'bg-emerald-100 text-emerald-700'
    case 'Good': return 'bg-blue-100 text-blue-700'
    case 'Satisfactory': return 'bg-amber-100 text-amber-700'
    default: return 'bg-red-100 text-red-700'
  }
}

export function averageScore(records) {
  if (!records.length) return 0
  const sum = records.reduce((acc, r) => acc + (r.weightedScore || 0), 0)
  return Math.round((sum / records.length) * 10) / 10
}

export function gradeDistribution(records) {
  const dist = { Excellent: 0, Good: 0, Satisfactory: 0, 'Needs Improvement': 0 }
  records.forEach((r) => {
    const g = r.grade || getGrade(r.weightedScore || 0)
    dist[g] = (dist[g] || 0) + 1
  })
  return Object.entries(dist).map(([name, value]) => ({ name, value }))
}

export function getWeekNumber(date) {
  const d = new Date(date)
  const startOfYear = new Date(d.getFullYear(), 0, 1)
  const pastDays = Math.floor((d - startOfYear) / 86400000)
  return Math.ceil((pastDays + startOfYear.getDay() + 1) / 7)
}
