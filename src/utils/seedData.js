/**
 * Run this once in browser console or a one-off script to seed sample data.
 * Import and call seedSampleData() from a dev-only route or component.
 */
import { db, auth } from '../firebase/config'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { calcWeightedScore, getGrade } from './calculations'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June']

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function seedSampleData() {
  console.log('Seeding sample data...')

  // Create trainer
  const trainerCred = await createUserWithEmailAndPassword(auth, 'trainer@demo.com', 'demo123')
  await setDoc(doc(db, 'users', trainerCred.user.uid), {
    role: 'trainer',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'trainer@demo.com',
    gender: 'Female',
    classId: '',
    createdAt: new Date().toISOString(),
  })

  // Create 2 classes
  const class1 = await addDoc(collection(db, 'classes'), {
    name: 'React Bootcamp',
    course: 'Web Development',
    trainerId: trainerCred.user.uid,
    startDate: '2026-01-06',
    endDate: '2026-06-30',
    archived: false,
    createdAt: serverTimestamp(),
  })

  const class2 = await addDoc(collection(db, 'classes'), {
    name: 'Data Science 101',
    course: 'Data Science',
    trainerId: trainerCred.user.uid,
    startDate: '2026-02-01',
    endDate: '2026-07-31',
    archived: false,
    createdAt: serverTimestamp(),
  })

  const studentTemplates = [
    { firstName: 'Ava', lastName: 'Chen', gender: 'Female', email: 'ava@demo.com' },
    { firstName: 'Ben', lastName: 'Marks', gender: 'Male', email: 'ben@demo.com' },
    { firstName: 'Clara', lastName: 'Park', gender: 'Female', email: 'clara@demo.com' },
    { firstName: 'David', lastName: 'Kim', gender: 'Male', email: 'david@demo.com' },
    { firstName: 'Emma', lastName: 'Lee', gender: 'Female', email: 'emma@demo.com' },
    { firstName: 'Frank', lastName: 'Wu', gender: 'Male', email: 'frank@demo.com' },
  ]

  const classIds = [class1.id, class2.id]
  const studentIds = []

  for (let i = 0; i < studentTemplates.length; i++) {
    const tmpl = studentTemplates[i]
    const cred = await createUserWithEmailAndPassword(auth, tmpl.email, 'demo123')
    const classId = classIds[i % 2]
    await setDoc(doc(db, 'users', cred.user.uid), {
      role: 'student',
      ...tmpl,
      studentId: `S00${i + 1}`,
      phone: `+1 555 000 000${i}`,
      classId,
      createdAt: new Date().toISOString(),
    })
    studentIds.push({ uid: cred.user.uid, classId })
  }

  // Seed 6 weeks of participation
  for (const { uid, classId } of studentIds) {
    for (let week = 1; week <= 6; week++) {
      const scores = {
        engagement: randInt(2, 4),
        lab: randInt(2, 4),
        teamwork: randInt(2, 4),
        punctuality: randInt(1, 4),
        professionalism: randInt(2, 4),
      }
      const weightedScore = calcWeightedScore(scores)
      const grade = getGrade(weightedScore)
      await addDoc(collection(db, 'participation'), {
        studentId: uid,
        classId,
        week,
        month: MONTHS[Math.min(week - 1, 5)],
        ...scores,
        weightedScore,
        grade,
        feedback: week % 2 === 0 ? 'Good effort this week. Keep up the engagement.' : '',
        remark: '',
        date: `2026-0${Math.min(week, 6)}-01`,
        createdAt: serverTimestamp(),
      })
    }
  }

  console.log('Seeding complete! trainer@demo.com / demo123')
}
