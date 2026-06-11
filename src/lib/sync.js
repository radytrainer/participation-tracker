import { supabase } from './supabase'

// Convert Firestore-specific objects to plain JS before storing as JSONB
function sanitize(data) {
  return JSON.parse(
    JSON.stringify(data, (_key, val) => {
      if (val == null) return val
      // Firestore Timestamp instance (.toDate is a function)
      if (typeof val.toDate === 'function') return val.toDate().toISOString()
      // Firestore serverTimestamp sentinel
      if (val._methodName === 'serverTimestamp') return new Date().toISOString()
      return val
    })
  )
}

/**
 * Upsert a document into the Supabase `backups` table.
 * Fire-and-forget — never throws, never blocks the caller.
 */
export function syncUpsert(collection, docId, data) {
  if (!supabase) return
  try {
    supabase
      .from('backups')
      .upsert({
        collection,
        doc_id: docId,
        data: sanitize({ ...data, id: docId }),
        synced_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.warn('[sync] upsert failed:', collection, docId, error.message)
      })
  } catch (e) {
    console.warn('[sync] unexpected error:', e)
  }
}

/**
 * Delete a document from the Supabase `backups` table.
 * Fire-and-forget — never throws.
 */
export function syncDelete(collection, docId) {
  if (!supabase) return
  try {
    supabase
      .from('backups')
      .delete()
      .eq('collection', collection)
      .eq('doc_id', docId)
      .then(({ error }) => {
        if (error) console.warn('[sync] delete failed:', collection, docId, error.message)
      })
  } catch (e) {
    console.warn('[sync] unexpected error:', e)
  }
}

/**
 * Full backup: push all Firestore docs for a given collection to Supabase.
 * Returns { count, errors }.
 */
export async function fullBackupCollection(collection, docs) {
  if (!supabase) throw new Error('Supabase is not configured')
  let count = 0
  const errors = []
  for (const d of docs) {
    const { error } = await supabase
      .from('backups')
      .upsert({
        collection,
        doc_id: d.id,
        data: sanitize(d),
        synced_at: new Date().toISOString(),
      })
    if (error) errors.push({ id: d.id, msg: error.message })
    else count++
  }
  return { count, errors }
}

/**
 * Count records in Supabase for a given collection.
 */
export async function countBackedUp(collection) {
  if (!supabase) return null
  const { count, error } = await supabase
    .from('backups')
    .select('*', { count: 'exact', head: true })
    .eq('collection', collection)
  if (error) return null
  return count
}

/**
 * Get the latest synced_at timestamp for a collection.
 */
export async function lastSyncTime(collection) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('backups')
    .select('synced_at')
    .eq('collection', collection)
    .order('synced_at', { ascending: false })
    .limit(1)
  if (error || !data?.length) return null
  return data[0].synced_at
}
