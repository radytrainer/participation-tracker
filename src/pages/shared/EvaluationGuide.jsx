import { BookOpen, CheckCircle, Calculator, Award, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'

const RUBRIC = [
  {
    key: 'engagement',
    label: 'Engagement & Verbal Contribution',
    weight: '25%',
    col: 'C1',
    color: 'bg-yellow-50 dark:bg-yellow-900/10',
    scores: {
      4: ['Volunteers answers', 'Asks insightful questions', 'Drives discussion', 'Pays attention, follows instructions, stays on task'],
      3: ['Responds when called on with relevant answers', 'Occasionally volunteers'],
      2: ['Responds when prompted but answers vague or incomplete'],
      1: ['Rarely responds', 'Minimal verbal contribution even when prompted'],
      0: ['Silent', 'No contribution observed'],
    },
  },
  {
    key: 'lab',
    label: 'Lab & Hands-on Involvement',
    weight: '30%',
    col: 'C2',
    color: 'bg-blue-50 dark:bg-blue-900/10',
    scores: {
      4: ['Fully engaged', 'Completes all tasks', 'Helps peers', 'Experiments beyond requirements'],
      3: ['Actively works through lab tasks', 'Completes most steps independently'],
      2: ['Participates but relies on peers', 'Completes partial tasks'],
      1: ['Present but disengaged', 'Lets others do the work'],
      0: ['Did not attempt lab tasks'],
    },
  },
  {
    key: 'teamwork',
    label: 'Teamwork & Peer Collaboration',
    weight: '20%',
    col: 'C3',
    color: 'bg-green-50 dark:bg-green-900/10',
    scores: {
      4: ['Actively supports teammates', 'Shares knowledge', 'Resolves disagreements constructively', 'Works effectively with classmates during activities'],
      3: ['Works cooperatively', 'Contributes fairly to group tasks'],
      2: ['Works with group when directed', 'Limited initiative in collaboration'],
      1: ['Works mostly alone or disrupts group dynamic'],
      0: ['Refused to work with peers'],
    },
  },
  {
    key: 'punctuality',
    label: 'Punctuality & Preparedness',
    weight: '15%',
    col: 'C4',
    color: 'bg-orange-50 dark:bg-orange-900/10',
    scores: {
      4: ['Always on time', 'Materials ready', 'Previewed content before class', 'Note taking during class'],
      3: ['On time with materials', 'Occasionally unprepared but recovers quickly', 'Takes notes, but partially'],
      2: ['Sometimes late or missing materials', 'Needs reminders to start'],
      1: ['Frequently late or missing required materials', 'Disrupts class start', 'No material for taking note'],
      0: ['Absent or extremely late with no preparation'],
    },
  },
  {
    key: 'professionalism',
    label: 'Professional Behavior',
    weight: '10%',
    col: 'C5',
    color: 'bg-purple-50 dark:bg-purple-900/10',
    scores: {
      4: ['Respectful communication', 'Professional language', 'Proper classroom conduct'],
      3: ['Mostly professional in communication', 'No serious misbehavior shown in class'],
      2: ['Shows unprofessional behavior', 'Correctable / accepts point to improve'],
      1: ['Unprofessional behavior affects learning environment'],
      0: ['Repeatedly violates professional conduct'],
    },
  },
]

const GRADE_SCALE = [
  { grade: 'Excellent',         range: '85% – 100%', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { grade: 'Good',              range: '70% – 84%',  color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { grade: 'Satisfactory',      range: '55% – 69%',  color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { grade: 'Needs Improvement', range: '0% – 54%',   color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20' },
]

const SCORE_HEADERS = [
  { score: 4, label: '4 — Exemplary',  bg: 'bg-green-700',  text: 'text-white' },
  { score: 3, label: '3 — Proficient', bg: 'bg-blue-700',   text: 'text-white' },
  { score: 2, label: '2 — Developing', bg: 'bg-amber-600',  text: 'text-white' },
  { score: 1, label: '1 — Minimal',    bg: 'bg-red-700',    text: 'text-white' },
  { score: 0, label: '0 — Absent',     bg: 'bg-gray-600',   text: 'text-white' },
]

const STEPS = [
  {
    n: 1,
    title: 'Observe the student during class',
    body: 'Watch for verbal contributions, lab engagement, teamwork behaviour, punctuality, and professionalism throughout the session before assigning any score.',
  },
  {
    n: 2,
    title: 'Score each criterion independently (0 – 4)',
    body: 'Use the rubric descriptors above to select the score that best matches what you observed. Scores should reflect the whole session, not a single moment.',
  },
  {
    n: 3,
    title: 'The app calculates the weighted score automatically',
    body: 'You do not need to do the maths. Once you enter the five scores, the system computes the weighted percentage using the formula shown below.',
  },
  {
    n: 4,
    title: 'Add feedback or a remark (optional but encouraged)',
    body: 'A short note helps the student understand their performance and gives context when comparing scores across periods.',
  },
  {
    n: 5,
    title: 'Review the grade — intervene early for at-risk students',
    body: 'Any student consistently scoring Needs Improvement (< 55%) should receive additional support. The dashboard flags these students under the "At Risk" stat card.',
  },
]

export default function EvaluationGuide() {
  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Evaluation Guide</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Class Participation Rubric
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Recommended weight: 10–15% of final grade</span>
          <span className="flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Score period: every 4–5 weeks</span>
          <span className="flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Total periods: 3</span>
        </div>
      </div>

      {/* Rubric table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-500" />
            Scoring Rubric
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-800 dark:bg-gray-950 text-white">
                  <th className="text-left px-4 py-3 font-semibold w-40">Criterion</th>
                  <th className="text-center px-3 py-3 font-semibold w-16">Weight</th>
                  {SCORE_HEADERS.map(({ score, label, bg, text }) => (
                    <th key={score} className={`text-left px-3 py-3 font-semibold ${bg} ${text}`}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {RUBRIC.map((row) => (
                  <tr key={row.key} className={row.color}>
                    <td className="px-4 py-4 font-medium text-gray-900 dark:text-gray-100 align-top">
                      <div>{row.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{row.col}</div>
                    </td>
                    <td className="px-3 py-4 text-center font-bold text-gray-700 dark:text-gray-300 align-top">
                      {row.weight}
                    </td>
                    {SCORE_HEADERS.map(({ score }) => (
                      <td key={score} className="px-3 py-4 align-top text-xs text-gray-700 dark:text-gray-300">
                        <ul className="space-y-1">
                          {row.scores[score].map((desc, i) => (
                            <li key={i} className="flex gap-1">
                              <span className="text-gray-400 flex-shrink-0">–</span>
                              <span>{desc}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* How to use */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary-500" />
              How to Use This Evaluation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="flex gap-3">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {n}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Weighted score formula */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary-500" />
                Weighted Score Formula
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                <p className="font-semibold text-gray-900 dark:text-white mb-2">Weighted Score (%) =</p>
                <p>( Engagement × 0.25</p>
                <p>+ Lab × 0.30</p>
                <p>+ Teamwork × 0.20</p>
                <p>+ Punctuality × 0.15</p>
                <p>+ Professionalism × 0.10 )</p>
                <p className="border-t border-gray-300 dark:border-gray-600 mt-1 pt-1">÷ 4 × 100</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Scores range from 0 to 4. Dividing by 4 normalises the result to a 0–100% scale.
              </p>
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Example</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                  (4×0.25 + 3×0.30 + 3×0.20 + 4×0.15 + 3×0.10) / 4 × 100
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                  = (1.00 + 0.90 + 0.60 + 0.60 + 0.30) / 4 × 100 = <strong>85.0%</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Grade scale */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary-500" />
                Grade Scale
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 dark:bg-gray-950 text-white text-xs uppercase">
                    <th className="text-center px-4 py-3 font-semibold">Grade</th>
                    <th className="text-center px-4 py-3 font-semibold">Score Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {GRADE_SCALE.map(({ grade, range, color, bg }) => (
                    <tr key={grade} className={bg}>
                      <td className={`text-center px-4 py-3 font-bold ${color}`}>{grade}</td>
                      <td className={`text-center px-4 py-3 font-semibold ${color}`}>{range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
