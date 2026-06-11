import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, CheckCircle, XCircle, Loader } from 'lucide-react'
import { registerUser } from '../../firebase/auth'
import { getCollection } from '../../firebase/firestore'
import { where } from 'firebase/firestore'

const ADMIN = {
  email: 'rady.y@passerellesnumeriques.org',
  password: '123456',
  firstName: 'Rady',
  lastName: 'Y',
  role: 'admin',
  gender: '',
  classId: '',
}

export default function Setup() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking') // checking | creating | done | exists | error
  const [error, setError] = useState('')

  useEffect(() => {
    async function run() {
      try {
        // Check if an admin already exists
        const admins = await getCollection('users', where('role', '==', 'admin'))
        if (admins.length > 0) {
          setStatus('exists')
          setTimeout(() => navigate('/login'), 3000)
          return
        }

        setStatus('creating')
        const { email, password, ...rest } = ADMIN
        await registerUser(email, password, rest)
        setStatus('done')
        setTimeout(() => navigate('/login'), 3000)
      } catch (err) {
        setError(err.message)
        setStatus('error')
      }
    }
    run()
  }, [])

  const states = {
    checking: {
      icon: <Loader className="h-10 w-10 text-primary-500 animate-spin" />,
      title: 'Checking setup…',
      sub: 'Looking for existing admin accounts.',
    },
    creating: {
      icon: <Loader className="h-10 w-10 text-primary-500 animate-spin" />,
      title: 'Creating admin account…',
      sub: `Setting up ${ADMIN.email}`,
    },
    done: {
      icon: <CheckCircle className="h-10 w-10 text-emerald-500" />,
      title: 'Admin created!',
      sub: 'Redirecting to login…',
    },
    exists: {
      icon: <CheckCircle className="h-10 w-10 text-blue-500" />,
      title: 'Admin already exists.',
      sub: 'Redirecting to login…',
    },
    error: {
      icon: <XCircle className="h-10 w-10 text-red-500" />,
      title: 'Setup failed',
      sub: error,
    },
  }

  const s = states[status]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary-600 mb-6">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>

        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-8 space-y-4">
          <div className="flex justify-center">{s.icon}</div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{s.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{s.sub}</p>

          {status === 'done' && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-4 text-left text-sm space-y-1">
              <p className="text-gray-500">Login with:</p>
              <p className="font-mono text-gray-800 dark:text-gray-200">{ADMIN.email}</p>
              <p className="font-mono text-gray-800 dark:text-gray-200">{ADMIN.password}</p>
            </div>
          )}

          {status === 'error' && (
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-primary-600 hover:underline"
            >
              Go to login →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
