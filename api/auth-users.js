import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel env vars encode \n as literal \\n
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const app = getAdminApp()
    const auth = getAuth(app)
    const db = getFirestore(app)

    // Verify the caller's ID token
    const decoded = await auth.verifyIdToken(token)

    // Confirm caller is an admin in Firestore
    const callerDoc = await db.collection('users').doc(decoded.uid).get()
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required' })
    }

    // Page through all Firebase Auth users
    const authUsers = []
    let pageToken
    do {
      const result = await auth.listUsers(1000, pageToken)
      for (const u of result.users) {
        authUsers.push({
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName || '',
          emailVerified: u.emailVerified,
          authDisabled: u.disabled,
          creationTime: u.metadata.creationTime,
          lastSignInTime: u.metadata.lastSignInTime || null,
        })
      }
      pageToken = result.pageToken
    } while (pageToken)

    return res.status(200).json({ users: authUsers })
  } catch (err) {
    console.error('[auth-users]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
