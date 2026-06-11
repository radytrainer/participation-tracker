import { useState } from 'react'
import { Menu, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import ProfileModal from '../ui/ProfileModal'

export default function Header({ onMenuClick }) {
  const { dark, toggle } = useTheme()
  const { profile } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  const initials = `${profile?.firstName?.[0] || ''}${profile?.lastName?.[0] || ''}`

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 lg:px-6">
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Toggle dark mode"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Profile button */}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2.5 pl-2 border-l border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity focus:outline-none"
            title="Profile & sign out"
          >
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt=""
                className="h-8 w-8 rounded-full object-cover ring-2 ring-primary-100 dark:ring-primary-900/30"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                {initials}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                {profile?.firstName} {profile?.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{profile?.role}</p>
            </div>
          </button>
        </div>
      </header>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
