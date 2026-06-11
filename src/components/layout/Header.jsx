import { useState, useRef, useEffect } from 'react'
import { Menu, Sun, Moon, UserCircle, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { logoutUser } from '../../firebase/auth'
import toast from 'react-hot-toast'
import ProfileModal from '../ui/ProfileModal'

export default function Header({ onMenuClick }) {
  const { dark, toggle } = useTheme()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef()

  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleSignOut() {
    setDropdownOpen(false)
    await logoutUser()
    navigate('/login')
    toast.success('Signed out')
  }

  function openProfile() {
    setDropdownOpen(false)
    setProfileOpen(true)
  }

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

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2.5 pl-2 border-l border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity focus:outline-none"
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

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                {/* Identity header */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {profile?.firstName} {profile?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile?.email}</p>
                </div>

                <button
                  onClick={openProfile}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <UserCircle className="h-4 w-4 text-gray-400" />
                  Update Profile
                </button>

                <div className="border-t border-gray-100 dark:border-gray-700" />

                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
