import { useEffect, useState, useMemo, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, Download, Camera, Upload } from 'lucide-react'
import ActionMenu from '../../components/ui/ActionMenu'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { getStudents, getAllClasses, updateStudent, deleteStudent } from '../../firebase/firestore'
import { registerUser } from '../../firebase/auth'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'
import { exportToCSV, exportToExcel } from '../../utils/exportUtils'
import ImportModal from '../../components/ui/ImportModal'

function compressImage(file, maxSize = 300) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function Avatar({ student, size = 8 }) {
  const cls = `h-${size} w-${size} rounded-full object-cover flex-shrink-0`
  if (student.photoURL) {
    return <img src={student.photoURL} alt="" className={cls} />
  }
  const textSize = size <= 6 ? 'text-xs' : 'text-sm'
  return (
    <div className={`h-${size} w-${size} rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 ${textSize} font-bold flex-shrink-0`}>
      {student.firstName?.[0]}{student.lastName?.[0]}
    </div>
  )
}

export default function Students() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const importerRef = useRef(null)
  const photoInputRef = useRef(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  async function load() {
    const [s, c] = await Promise.all([getStudents(), getAllClasses()])
    setStudents(s)
    setClasses(c)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Clear selection whenever visible rows change
  useEffect(() => { setSelected(new Set()) }, [search, filterClass, filterGender])

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase()
      const nameMatch = `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q)
      const classMatch = !filterClass || s.classId === filterClass
      const genderMatch = !filterGender || s.gender === filterGender
      return nameMatch && classMatch && genderMatch
    })
  }, [students, search, filterClass, filterGender])

  function openAdd() {
    reset({})
    setEditing(null)
    setPhotoPreview(null)
    setModalOpen(true)
  }

  function openEdit(student) {
    reset(student)
    setEditing(student)
    setPhotoPreview(student.photoURL || null)
    setModalOpen(true)
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setPhotoPreview(compressed)
  }

  async function onSubmit(data) {
    try {
      const others = editing ? students.filter((s) => s.id !== editing.id) : students

      if (others.some((s) => s.email?.toLowerCase() === data.email?.toLowerCase())) {
        toast.error('Email is already in use by another student.')
        return
      }
      if (data.studentId && others.some((s) => s.studentId === data.studentId)) {
        toast.error('Student ID is already taken.')
        return
      }

      if (editing) {
        const { email, password, ...rest } = data
        await updateStudent(editing.id, { ...rest, photoURL: photoPreview || '' })
        toast.success('Student updated')
      } else {
        await registerUser(data.email, data.password, {
          role: 'student',
          firstName: data.firstName,
          lastName: data.lastName,
          gender: data.gender,
          classId: data.classId || '',
          studentId: data.studentId || '',
          photoURL: photoPreview || '',
        })
        toast.success('Student added')
      }
      setModalOpen(false)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this student?')) return
    await deleteStudent(id)
    toast.success('Student deleted')
    load()
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id))
  const someSelected = selected.size > 0

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((s) => s.id)))
    }
  }

  async function handleDeleteSelected() {
    if (!confirm(`Permanently delete ${selected.size} student${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setDeleting(true)
    const ids = [...selected]
    for (const id of ids) {
      await deleteStudent(id)
    }
    toast.success(`${ids.length} student${ids.length !== 1 ? 's' : ''} deleted`)
    setSelected(new Set())
    setDeleting(false)
    load()
  }

  function openImport() {
    const seenEmails = new Set(students.map((s) => s.email?.toLowerCase()).filter(Boolean))
    const get = (row, keys) => keys.map((k) => (row[k] || '').toString().trim()).find(Boolean) || ''

    importerRef.current = async (row) => {
      const firstName = get(row, ['First Name', 'first_name', 'FirstName'])
      const lastName  = get(row, ['Last Name',  'last_name',  'LastName'])
      const email     = get(row, ['Email', 'email'])
      const password  = get(row, ['Password', 'password']) || 'Password@123'
      const gender    = get(row, ['Gender', 'gender'])
      const className = get(row, ['Class', 'class', 'Class Name'])

      if (!firstName) throw new Error('First Name is required')
      if (!email)     throw new Error('Email is required')

      const emailLower = email.toLowerCase()
      if (seenEmails.has(emailLower)) throw new Error(`Email "${email}" already exists`)

      const cls = classes.find((c) => c.name.toLowerCase() === className.toLowerCase())

      await registerUser(email, password, {
        role: 'student',
        firstName, lastName, gender,
        classId: cls?.id || '',
        studentId: '',
        photoURL: '',
      })

      seenEmails.add(emailLower)
    }

    setImportOpen(true)
  }

  function handleExportCSV() {
    exportToCSV(
      filtered.map((s) => ({
        'Student ID': s.studentId,
        'First Name': s.firstName,
        'Last Name': s.lastName,
        Gender: s.gender,
        Email: s.email,
        Class: classes.find((c) => c.id === s.classId)?.name || '',
      })),
      'students'
    )
  }

  function handleExportExcel() {
    exportToExcel(
      filtered.map((s) => ({
        'Student ID': s.studentId,
        'First Name': s.firstName,
        'Last Name': s.lastName,
        Gender: s.gender,
        Email: s.email,
        Class: classes.find((c) => c.id === s.classId)?.name || '',
      })),
      'students'
    )
  }

  const className = (id) => classes.find((c) => c.id === id)?.name || '—'

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="text-sm text-gray-500">{filtered.length} of {students.length} students</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>CSV</Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportExcel}>Excel</Button>
          {isAdmin && <Button variant="outline" size="sm" icon={Upload} onClick={openImport}>Import</Button>}
          {isAdmin && <Button icon={Plus} onClick={openAdd}>Add Student</Button>}
        </div>
      </div>

      {/* Bulk action bar */}
      {isAdmin && someSelected && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2.5">
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            {selected.size} student{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              Clear
            </button>
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              onClick={handleDeleteSelected}
              loading={deleting}
            >
              Delete {selected.size}
            </Button>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          View only — contact your administrator to manage students.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
          <option value="">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                {isAdmin && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Gender</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${selected.has(s.id) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                >
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleRow(s.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar student={s} size={8} />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {s.firstName} {s.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={s.gender === 'Male' ? 'blue' : 'purple'}>{s.gender}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{className(s.classId)}</td>
                  <td className="px-4 py-3 text-gray-500">{s.email}</td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && (
                      <ActionMenu items={[
                        { label: 'Edit', icon: Pencil, onClick: () => openEdit(s) },
                        { divider: true },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(s.id) },
                      ]} />
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="text-center py-10 text-gray-400">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import modal */}
      <ImportModal
        open={importOpen}
        onClose={(didImport) => { setImportOpen(false); if (didImport) load() }}
        title="Import Students"
        templateFilename="students"
        templateSample={[{
          'First Name': 'John',
          'Last Name': 'Doe',
          'Gender': 'Male',
          'Class': classes[0]?.name || 'IT101',
          'Email': 'john@example.com',
          'Password': 'Password@123',
        }]}
        onImport={importerRef.current || (() => {})}
      />

      {/* Add/Edit modal — admin only */}
      {isAdmin && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Student' : 'Add Student'} size="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Profile image — spans full width, centered */}
            <div className="col-span-full flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="relative group"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile"
                    className="h-20 w-20 rounded-full object-cover border-2 border-primary-300 dark:border-primary-600"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <Camera className="h-7 w-7 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </button>
              <span className="text-xs text-gray-400">Click to upload profile photo</span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <Select label="Class" {...register('classId')}>
              <option value="">No class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="First Name" placeholder="John" error={errors.firstName?.message} {...register('firstName', { required: 'Required' })} />
            <Input label="Last Name" placeholder="Doe" error={errors.lastName?.message} {...register('lastName', { required: 'Required' })} />
            <Select label="Gender" error={errors.gender?.message} {...register('gender', { required: 'Required' })}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </Select>
            <Input label="Email" type="email" placeholder="student@example.com" error={errors.email?.message} {...register('email', { required: 'Required' })} />
            {!editing && (
              <Input label="Password" type="password" placeholder="Min 6 chars" error={errors.password?.message} {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })} />
            )}
            <div className="col-span-full flex gap-3 justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Add Student'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
