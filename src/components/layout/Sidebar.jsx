import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  LogOut, GraduationCap, ShieldCheck,
  CalendarDays, BookMarked, ChevronLeft, ChevronRight, HelpCircle, DatabaseBackup,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { logoutUser } from '../../firebase/auth'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const adminLinks = [
  { to: '/trainer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trainer/terms', icon: CalendarDays, label: 'Terms' },
  { to: '/trainer/subjects', icon: BookMarked, label: 'Subjects' },
  { to: '/trainer/classes', icon: BookOpen, label: 'Classes' },
  { to: '/trainer/students', icon: Users, label: 'Students' },
  { to: '/trainer/participation', icon: ClipboardList, label: 'Participation' },
  { divider: true },
  { to: '/trainer/trainers', icon: ShieldCheck, label: 'Trainers' },
  { to: '/trainer/guide', icon: HelpCircle, label: 'Evaluation Guide' },
  { to: '/trainer/backup', icon: DatabaseBackup, label: 'Data Backup' },
]

const trainerLinks = [
  { to: '/trainer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trainer/participation', icon: ClipboardList, label: 'Participation' },
  { divider: true },
  { to: '/trainer/guide', icon: HelpCircle, label: 'Evaluation Guide' },
]

const studentLinks = [
  { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/student/guide', icon: HelpCircle, label: 'Evaluation Guide' },
]

export default function Sidebar({ open, onClose, collapsed, onToggle }) {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const links =
    profile?.role === 'admin' ? adminLinks
    : profile?.role === 'student' ? studentLinks
    : trainerLinks

  async function handleLogout() {
    await logoutUser()
    navigate('/login')
    toast.success('Logged out')
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 flex flex-col bg-gray-900 dark:bg-gray-950 text-white',
          'transition-all duration-300 ease-in-out lg:static lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          'w-64',
          collapsed && 'lg:w-16',
        )}
      >
        {/* Logo / toggle */}
        <div className="flex h-16 flex-shrink-0 items-center border-b border-gray-700 overflow-hidden">
          {/* Expanded state */}
          <div className={clsx(
            'flex flex-1 items-center gap-3 px-5 transition-opacity duration-200',
            collapsed && 'lg:hidden'
          )}>
            <GraduationCap className="h-8 w-8 text-primary-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-white leading-tight">Participation</p>
              <p className="text-xs text-gray-400">Tracker</p>
            </div>
          </div>

          {/* Collapsed icon */}
          <div className={clsx(
            'hidden flex-1 justify-center',
            collapsed && 'lg:flex'
          )}>
            <GraduationCap className="h-7 w-7 text-primary-400" />
          </div>

          {/* Desktop toggle button */}
          <button
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={clsx(
              'hidden lg:flex items-center justify-center flex-shrink-0 rounded-md p-1.5',
              'text-gray-400 hover:text-white hover:bg-gray-800 transition-colors',
              collapsed ? 'mx-auto' : 'mr-3'
            )}
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4" />
              : <ChevronLeft className="h-4 w-4" />
            }
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-0.5">
          {links.map((item, i) => {
            if (item.divider) {
              return <div key={`divider-${i}`} className="my-2 border-t border-gray-700" />
            }
            const { to, icon: Icon, label } = item
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                title={label}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    collapsed && 'lg:justify-center lg:px-0',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className={clsx(
                  'truncate transition-all duration-200',
                  collapsed && 'lg:hidden'
                )}>
                  {label}
                </span>
              </NavLink>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="flex-shrink-0 border-t border-gray-700 p-3 space-y-1 overflow-hidden">
          <div className={clsx(
            'rounded-lg bg-gray-800 px-3 py-2',
            collapsed && 'lg:flex lg:justify-center lg:px-1'
          )}>
            <div className={clsx(collapsed && 'lg:hidden')}>
              <p className="text-sm font-medium text-white truncate">
                {profile?.firstName} {profile?.lastName}
              </p>
              <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
            </div>
            <div className={clsx(
              'hidden h-7 w-7 rounded-full bg-primary-600 items-center justify-center text-xs font-bold text-white',
              collapsed && 'lg:flex'
            )}>
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className={clsx(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm',
              'text-gray-300 hover:bg-gray-800 hover:text-white transition-colors',
              collapsed && 'lg:justify-center lg:px-0'
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className={clsx(collapsed && 'lg:hidden')}>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
