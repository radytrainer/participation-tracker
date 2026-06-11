import { useRef, useState } from 'react'
import { Camera, KeyRound, Eye, EyeOff } from 'lucide-react'
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth'
import { useAuth } from '../../context/AuthContext'
import { updateDocument } from '../../firebase/firestore'
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
  const fileRef = useRef()

  // Photo
  const [preview, setPreview] = useState(null)
  const [photoSaving, setPhotoSaving] = useState(false)

  // Password
  const [changePw, setChangePw] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [pwSaving, setPwSaving] = useState(false)

  async function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setPreview(await compressImage(f))
  }

  async function savePhoto() {
    setPhotoSaving(true)
    try {
      await updateDocument('users', profile.id, { photoURL: preview })
      setProfile({ ...profile, photoURL: preview })
      toast.success('Profile photo updated')
      setPreview(null)
      onClose()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setPhotoSaving(false)
    }
  }

  async function handlePasswordChange() {
    if (!pwForm.current) { toast.error('Enter your current password'); return }
    if (pwForm.next.length < 6) { toast.error('New password must be at least 6 characters'); return }
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return }

    setPwSaving(true)
    try {
      const auth = getAuth()
      const user = auth.currentUser
      const credential = EmailAuthProvider.credential(user.email, pwForm.current)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, pwForm.next)
      toast.success('Password changed successfully')
      setChangePw(false)
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect')
      } else {
        toast.error(e.message)
      }
    } finally {
      setPwSaving(false)
    }
  }

  function handleClose() {
    setPreview(null)
    setChangePw(false)
    setPwForm({ current: '', next: '', confirm: '' })
    setShowPw({ current: false, next: false, confirm: false })
    onClose()
  }

  const displayPhoto = preview || profile?.photoURL
  const initials = `${profile?.firstName?.[0] || ''}${profile?.lastName?.[0] || ''}`

  const pwLabels = { current: 'Current password', next: 'New password', confirm: 'Confirm new password' }
  const pwPlaceholders = { current: 'Enter current password', next: 'Min 6 characters', confirm: 'Repeat new password' }

  return (
    <Modal open={open} onClose={handleClose} title="Update Profile">
      <div className="space-y-5">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className="relative group focus:outline-none">
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
            <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
              <span className="text-white text-xs mt-0.5">Change</span>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <p className="text-xs text-gray-400">Click photo to change</p>
        </div>

        {preview && (
          <div className="rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 px-4 py-2.5 text-sm text-primary-700 dark:text-primary-400 text-center">
            New photo selected — click Save to apply
          </div>
        )}

        {preview && (
          <Button onClick={savePhoto} loading={photoSaving} className="w-full justify-center">
            Save Profile Photo
          </Button>
        )}

        {/* Profile info */}
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Name</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{profile?.firstName} {profile?.lastName}</span>
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

        {/* Change password */}
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setChangePw((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-gray-400" />
              Change Password
            </div>
            <span className="text-xs text-primary-500">{changePw ? 'Cancel' : 'Edit'}</span>
          </button>

          {changePw && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
              {(['current', 'next', 'confirm']).map((key) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{pwLabels[key]}</label>
                  <div className="relative">
                    <input
                      type={showPw[key] ? 'text' : 'password'}
                      value={pwForm[key]}
                      onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={pwPlaceholders[key]}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPw[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <Button onClick={handlePasswordChange} loading={pwSaving} className="w-full justify-center" size="sm">
                Update Password
              </Button>
            </div>
          )}
        </div>

      </div>
    </Modal>
  )
}
