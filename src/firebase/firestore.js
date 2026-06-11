import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from './config'
import { syncUpsert, syncDelete } from '../lib/sync'

// ── Generic helpers ──────────────────────────────────────────────────────────

export const colRef = (name) => collection(db, name)

export async function addDocument(colName, data) {
  const ref = await addDoc(colRef(colName), { ...data, createdAt: serverTimestamp() })
  syncUpsert(colName, ref.id, data)
  return ref
}

export async function setDocument(colName, id, data) {
  await setDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() }, { merge: true })
  syncUpsert(colName, id, data)
}

export async function updateDocument(colName, id, data) {
  await updateDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() })
  syncUpsert(colName, id, data)
}

export async function deleteDocument(colName, id) {
  await deleteDoc(doc(db, colName, id))
  syncDelete(colName, id)
}

export async function getDocument(colName, id) {
  const snap = await getDoc(doc(db, colName, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getCollection(colName, ...constraints) {
  const q = constraints.length ? query(colRef(colName), ...constraints) : colRef(colName)
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ── Terms ─────────────────────────────────────────────────────────────────────

export const getTerms = () => getCollection('terms', orderBy('order'))
export const addTerm = (data) => addDocument('terms', data)
export const updateTerm = (id, data) => updateDocument('terms', id, data)
export const deleteTerm = (id) => deleteDocument('terms', id)

// ── Subjects ──────────────────────────────────────────────────────────────────

export const getSubjects = (termId) =>
  termId
    ? getCollection('subjects', where('termId', '==', termId), orderBy('name'))
    : getCollection('subjects', orderBy('name'))

export const addSubject = (data) => addDocument('subjects', data)
export const updateSubject = (id, data) => updateDocument('subjects', id, data)
export const deleteSubject = (id) => deleteDocument('subjects', id)

// ── Assignments (subject ↔ class ↔ trainer) ───────────────────────────────────
// One record per unique subject+class+trainer combination

export const getAssignments = (...constraints) =>
  getCollection('assignments', ...constraints)

export const getAssignmentsBySubject = (subjectId) =>
  getCollection('assignments', where('subjectId', '==', subjectId))

export const getAssignmentsByTrainer = (trainerId) =>
  getCollection('assignments', where('trainerId', '==', trainerId))

export const addAssignment = (data) => addDocument('assignments', data)
export const updateAssignment = (id, data) => updateDocument('assignments', id, data)
export const deleteAssignment = (id) => deleteDocument('assignments', id)

// ── Classes ──────────────────────────────────────────────────────────────────

export const getAllClasses = () => getCollection('classes')
export const addClass = (data) => addDocument('classes', data)
export const updateClass = (id, data) => updateDocument('classes', id, data)
export const deleteClass = (id) => deleteDocument('classes', id)

// ── Students ─────────────────────────────────────────────────────────────────

export const getStudents = (classId) =>
  classId
    ? getCollection('users', where('role', '==', 'student'), where('classId', '==', classId))
    : getCollection('users', where('role', '==', 'student'))

export const updateStudent = (id, data) => updateDocument('users', id, data)
export const deleteStudent = (id) => deleteDocument('users', id)

// ── Participation ─────────────────────────────────────────────────────────────

export const getParticipation = (...constraints) =>
  getCollection('participation', ...constraints)

export const getStudentParticipation = (studentId) =>
  getCollection('participation', where('studentId', '==', studentId))

export const getClassParticipation = (classId) =>
  getCollection('participation', where('classId', '==', classId))

export const getTrainerParticipation = (trainerId) =>
  getCollection('participation', where('trainerId', '==', trainerId))

export const addParticipation = (data) => addDocument('participation', data)
export const updateParticipation = (id, data) => updateDocument('participation', id, data)
export const deleteParticipation = (id) => deleteDocument('participation', id)
