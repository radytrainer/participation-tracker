import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Archive, BookOpen, Users, BookMarked } from 'lucide-react'
import { formatDate } from '../../utils/dateUtils'
import ActionMenu from '../../components/ui/ActionMenu'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import {
  getAllClasses, addClass, updateClass, deleteClass,
  getSubjects, getAssignments, getCollection,
} from '../../firebase/firestore'
import { where } from 'firebase/firestore'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Badge } from '../../components/ui/Badge'

export default function Classes() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [trainers, setTrainers] = useState([])
  const [assignmentsByClass, setAssignmentsByClass] = useState({})
  const [studentCountByClass, setStudentCountByClass] = useState({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  async function load() {
    const [allClasses, allSubjects, allTrainers, allAssignments, allStudents] = await Promise.all([
      getAllClasses(),
      getSubjects(),
      getCollection('users', where('role', '==', 'trainer')),
      getAssignments(),
      getCollection('users', where('role', '==', 'student')),
    ])

    setSubjects(allSubjects)
    setTrainers(allTrainers)

    // Group assignments by classId → { subjectId → trainerIds[] }
    const byClass = {}
    allAssignments.forEach((a) => {
      if (!byClass[a.classId]) byClass[a.classId] = {}
      if (!byClass[a.classId][a.subjectId]) byClass[a.classId][a.subjectId] = []
      byClass[a.classId][a.subjectId].push(a.trainerId)
    })
    setAssignmentsByClass(byClass)

    // Student count per class
    const counts = {}
    allStudents.forEach((s) => {
      if (s.classId) counts[s.classId] = (counts[s.classId] || 0) + 1
    })
    setStudentCountByClass(counts)

    // Trainers only see their assigned classes
    if (!isAdmin) {
      const myClassIds = new Set(
        allAssignments.filter((a) => a.trainerId === profile.id).map((a) => a.classId)
      )
      setClasses(allClasses.filter((c) => myClassIds.has(c.id)))
    } else {
      setClasses(allClasses)
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() { reset({}); setEditing(null); setModalOpen(true) }
  function openEdit(cls) { reset(cls); setEditing(cls); setModalOpen(true) }

  async function onSubmit(data) {
    try {
      if (editing) {
        await updateClass(editing.id, data)
        toast.success('Class updated')
      } else {
        await addClass({ ...data, archived: false })
        toast.success('Class created')
      }
      setModalOpen(false)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this class?')) return
    await deleteClass(id)
    toast.success('Class deleted')
    load()
  }

  async function toggleArchive(cls) {
    await updateClass(cls.id, { archived: !cls.archived })
    toast.success(cls.archived ? 'Class restored' : 'Class archived')
    load()
  }

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || '—'
  const trainerName = (id) => {
    const t = trainers.find((x) => x.id === id)
    return t ? `${t.firstName} ${t.lastName}` : '—'
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Classes</h1>
          <p className="text-sm text-gray-500">{classes.length} class{classes.length !== 1 ? 'es' : ''}</p>
        </div>
        {isAdmin && <Button icon={Plus} onClick={openAdd}>Add Class</Button>}
      </div>

      {!isAdmin && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Showing classes you are assigned to teach.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => {
          const subjectMap = assignmentsByClass[cls.id] || {}
          const subjectIds = Object.keys(subjectMap)
          const studentCount = studentCountByClass[cls.id] || 0

          return (
            <div
              key={cls.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-3">
                    <BookOpen className="h-5 w-5 text-primary-600" />
                  </div>
                  <Badge color={cls.archived ? 'gray' : 'green'}>
                    {cls.archived ? 'Archived' : 'Active'}
                  </Badge>
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white">{cls.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{cls.course}</p>

                {cls.startDate && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    {formatDate(cls.startDate)} → {cls.endDate ? formatDate(cls.endDate) : '…'}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Users className="h-3.5 w-3.5" />
                    {studentCount} student{studentCount !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <BookMarked className="h-3.5 w-3.5" />
                    {subjectIds.length} subject{subjectIds.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Subjects section */}
              {subjectIds.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3 space-y-2">
                  {subjectIds.map((subId) => (
                    <div key={subId} className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                        {subjectName(subId)}
                      </span>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        {subjectMap[subId].map((tId) => (
                          <span key={tId} className="text-xs text-gray-400 whitespace-nowrap">
                            {trainerName(tId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              {isAdmin && (
                <div className="flex justify-end px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                  <ActionMenu items={[
                    { label: 'Edit', icon: Pencil, onClick: () => openEdit(cls) },
                    { label: cls.archived ? 'Restore' : 'Archive', icon: Archive, onClick: () => toggleArchive(cls) },
                    { divider: true },
                    { label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(cls.id) },
                  ]} />
                </div>
              )}
            </div>
          )
        })}

        {classes.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>{isAdmin ? 'No classes yet. Create one to get started.' : 'You have no assigned classes yet.'}</p>
          </div>
        )}
      </div>

      {isAdmin && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Class' : 'Add Class'}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Class Name"
              placeholder="e.g. IT Support A"
              error={errors.name?.message}
              {...register('name', { required: 'Required' })}
            />
            <Input
              label="Course"
              placeholder="e.g. IT Support Fundamentals"
              error={errors.course?.message}
              {...register('course', { required: 'Required' })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" {...register('startDate')} />
              <Input label="End Date" type="date" {...register('endDate')} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
