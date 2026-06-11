import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { GRADE_COLORS } from '../../utils/constants'

export default function GradeDonutChart({ data, title = 'Grade Distribution' }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={GRADE_COLORS[entry.name] || '#6b7280'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [`${v} (${total ? Math.round((v / total) * 100) : 0}%)`, '']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(val) => <span style={{ fontSize: 12, color: '#6b7280' }}>{val}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
