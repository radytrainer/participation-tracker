import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  getAuth,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { auth, db } from './config'

// Secondary app — used only for creating new accounts so the admin's
// session in the primary app is never disturbed.
const secondaryApp = initializeApp(auth.app.options, 'secondary')
const secondaryAuth = getAuth(secondaryApp)
const secondaryDb = getFirestore(secondaryApp) // Firestore authenticated as the new user

export async function registerUser(email, password, userData) {
  let credential = null
  try {
    // Create the auth account in the secondary app
    credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)

    await updateProfile(credential.user, {
      displayName: `${userData.firstName} ${userData.lastName}`,
    })

    // Write the Firestore doc using the secondary app's db so that
    // request.auth.uid == credential.user.uid — satisfying the rules.
    await setDoc(doc(secondaryDb, 'users', credential.user.uid), {
      ...userData,
      email,
      createdAt: new Date().toISOString(),
    })

    await signOut(secondaryAuth)
    return credential.user
  } catch (err) {
    // If anything fails after the Auth account was created, delete it so
    // the email is not left orphaned and can be retried.
    if (credential?.user) {
      try { await credential.user.delete() } catch (_) {}
      try { await signOut(secondaryAuth) } catch (_) {}
    }
    throw err
  }
}

export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const snap = await getDoc(doc(db, 'users', credential.user.uid))
  if (snap.exists() && snap.data().disabled) {
    await signOut(auth)
    throw new Error('This account has been disabled. Contact your administrator.')
  }
  return credential.user
}

export async function logoutUser() {
  return signOut(auth)
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (snap.exists()) return { id: snap.id, ...snap.data() }
  return null
}
