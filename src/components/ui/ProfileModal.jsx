import { useRef, useState } from 'react'
import { Camera, LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { updateDocument } from '../../firebase/firestore'
import { logoutUser } from '../../firebase/auth'
import toast from 'react-hot-toast'
import Modal from './Modal'
import Button from './Button'

async function compressImage(file, maxSize = 300) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function ProfileModal({ open, onClose }) {
  const { profile, setProfile } = useAuth()
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()
  const navigate = useNavigate()

  async function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const b64 = await compressImage(f)
    setPreview(b64)
  }

  async function savePhoto() {
    setSaving(true)
    try {
      await updateDocument('users', profile.id, { photoURL: preview })
      setProfile({ ...profile, photoURL: preview })
      toast.success('Profile photo updated')
      setPreview(null)
      onClose()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setPreview(null)
    onClose()
  }

  async function handleSignOut() {
    await logoutUser()
    navigate('/login')
    toast.success('Signed out')
  }

  const displayPhoto = preview || profile?.photoURL
  const initials = `${profile?.firstName?.[0] || ''}${profile?.lastName?.[0] || ''}`

  return (
    <Modal open={open} onClose={handleClose} title="My Profile">
      <div className="space-y-6">

        {/* Avatar upload */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative group focus:outline-none"
          >
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover ring-4 ring-primary-100 dark:ring-primary-900/30"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-primary-100 dark:ring-primary-900/30">
                {initials}
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
              <span className="text-white text-xs mt-0.5">Change</span>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <p className="text-xs text-gray-400">Click to change profile photo</p>
        </div>

        {/* Preview notice */}
        {preview && (
          <div className="rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 px-4 py-2.5 text-sm text-primary-700 dark:text-primary-400 text-center">
            New photo selected — click Save to apply
          </div>
        )}

        {/* Profile info */}
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Name</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {profile?.firstName} {profile?.lastName}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-700 dark:text-gray-300">{profile?.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Role</span>
            <span className="capitalize text-gray-700 dark:text-gray-300">{profile?.role}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          {preview && (
            <Button onClick={savePhoto} loading={saving} className="w-full justify-center">
              Save Profile Photo
            </Button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-800 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </Modal>
  )
}
