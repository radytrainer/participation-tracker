import { useEffect, useState } from 'react'
import {
  DatabaseBackup, CheckCircle2, XCircle, RefreshCw,
  CloudUpload, AlertTriangle, Info,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { fullBackupCollection, countBackedUp, lastSyncTime } from '../../lib/sync'
import { getCollection } from '../../firebase/firestore'
import { where } from 'firebase/firestore'
import { formatDate } from '../../utils/dateUtils'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const COLLECTIONS = [
  { key: 'terms',         label: 'Terms' },
  { key: 'subjects',      label: 'Subjects' },
  { key: 'classes',       label: 'Classes' },
  { key: 'assignments',   label: 'Assignments' },
  { key: 'participation', label: 'Participation' },
  { key: 'users',         label: 'Users (students & trainers)' },
]

export default function Backup() {
  const configured = !!supabase
  const [stats, setStats] = useState({})     // { [col]: { firebase, supabase, lastSync } }
  const [loading, setLoading] = useState(true)
  const [backing, setBacking] = useState(false)
  const [progress, setProgress] = useState(null) // { col, done, total }

  async function loadStats() {
    setLoading(true)
    const next = {}
    await Promise.all(
      COLLECTIONS.map(async ({ key }) => {
        const fbDocs = await getCollection(key)
        const sbCount = configured ? await countBackedUp(key) : null
        const lastSync = configured ? await lastSyncTime(key) : null
        next[key] = { firebase: fbDocs.length, supabase: sbCount, lastSync }
      })
    )
    setStats(next)
    setLoading(false)
  }

  useEffect(() => { loadStats() }, [])

  async function runFullBackup() {
    if (!configured) return
    setBacking(true)
    setProgress(null)
    let totalSynced = 0
    let totalErrors = 0

    for (const { key, label } of COLLECTIONS) {
      const docs = await getCollection(key)
      setProgress({ col: label, done: 0, total: docs.length })
      const { count, errors } = await fullBackupCollection(key, docs)
      totalSynced += count
      totalErrors += errors.length
      setProgress((p) => ({ ...p, done: docs.length }))
    }

    setBacking(false)
    setProgress(null)
    toast.success(`Full backup complete — ${totalSynced} records synced${totalErrors ? `, ${totalErrors} errors` : ''}`)
    loadStats()
  }

  const totalFirebase = Object.values(stats).reduce((s, v) => s + (v.firebase || 0), 0)
  const totalSupabase = Object.values(stats).reduce((s, v) => s + (v.supabase || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Backup</h1>
          <p className="text-sm text-gray-500">Supabase mirror — syncs on every write automatically</p>
        </div>
        <Button icon={RefreshCw} variant="outline" onClick={loadStats} disabled={loading}>
          Refresh
        </Button>
      </div>

      {/* Connection status */}
      <div className={clsx(
        'flex items-start gap-3 rounded-xl border px-5 py-4',
        configured
          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
          : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
      )}>
        {configured
          ? <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          : <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        }
        <div>
          <p className={clsx(
            'font-semibold text-sm',
            configured ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
          )}>
            {configured ? 'Supabase connected' : 'Supabase not configured'}
          </p>
          {configured ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              Every create / update / delete is automatically mirrored to Supabase.
            </p>
          ) : (
            <div className="text-xs text-amber-700 dark:text-amber-400 mt-1 space-y-1">
              <p>Add these two variables to your <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">.env</code> file and redeploy:</p>
              <code className="block bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded text-xs font-mono">
                VITE_SUPABASE_URL=https://xxxx.supabase.co<br />
                VITE_SUPABASE_ANON_KEY=eyJhbGci...
              </code>
              <p>See the setup guide below for Supabase project creation steps.</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {configured && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Firebase records" value={totalFirebase} color="orange" loading={loading} />
          <StatCard label="Supabase records" value={totalSupabase} color="green" loading={loading} />
          <StatCard
            label="Sync coverage"
            value={totalFirebase ? `${Math.round((totalSupabase / totalFirebase) * 100)}%` : '—'}
            color={totalFirebase && totalSupabase >= totalFirebase ? 'green' : 'amber'}
            loading={loading}
          />
        </div>
      )}

      {/* Full backup button */}
      {configured && (
        <div className="flex items-center gap-4">
          <Button
            icon={CloudUpload}
            onClick={runFullBackup}
            loading={backing}
            disabled={backing || loading}
          >
            Full Backup Now
          </Button>
          {progress && (
            <span className="text-sm text-gray-500">
              Backing up <strong>{progress.col}</strong>… ({progress.done}/{progress.total})
            </span>
          )}
        </div>
      )}

      {/* Per-collection table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Collections</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500">
            <tr>
              <th className="text-left px-5 py-3">Collection</th>
              <th className="text-center px-4 py-3">Firebase</th>
              {configured && (
                <>
                  <th className="text-center px-4 py-3">Supabase</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Last synced</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {COLLECTIONS.map(({ key, label }) => {
              const s = stats[key] || {}
              const synced = s.firebase != null && s.supabase != null && s.supabase >= s.firebase
              return (
                <tr key={key} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">{label}</td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {loading ? '…' : (s.firebase ?? '—')}
                  </td>
                  {configured && (
                    <>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {loading ? '…' : (s.supabase ?? '—')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {loading ? '…' : (
                          s.supabase == null ? (
                            <span className="text-xs text-gray-400">no data</span>
                          ) : synced ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-amber-500 mx-auto" />
                          )
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {loading ? '…' : (s.lastSync ? formatDate(s.lastSync.split('T')[0]) : '—')}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Setup guide */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-5 py-4 text-left"
          onClick={(e) => e.currentTarget.nextElementSibling.classList.toggle('hidden')}
        >
          <Info className="h-4 w-4 text-primary-500 flex-shrink-0" />
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            Supabase Setup Guide
          </span>
        </button>
        <div className="hidden border-t border-gray-100 dark:border-gray-700 px-5 py-4 space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <ol className="list-decimal list-inside space-y-2 leading-relaxed">
            <li>Go to <strong>supabase.com</strong> → create a free account → New Project.</li>
            <li>
              In the SQL Editor, run this once to create the backup table:
              <pre className="mt-2 rounded-lg bg-gray-100 dark:bg-gray-700/50 px-4 py-3 text-xs overflow-x-auto">{SQL_SETUP}</pre>
            </li>
            <li>
              Go to <strong>Project Settings → API</strong> and copy:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li><strong>Project URL</strong> → <code>VITE_SUPABASE_URL</code></li>
                <li><strong>anon / public key</strong> → <code>VITE_SUPABASE_ANON_KEY</code></li>
              </ul>
            </li>
            <li>
              Add both to your <code>.env</code> file (and in Vercel → Settings → Environment Variables).
            </li>
            <li>Restart the dev server (or redeploy). Come back and click <strong>Full Backup Now</strong> to sync all existing data.</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

// ── Helper components ─────────────────────────────────────────────────────────

function StatCard({ label, value, color, loading }) {
  const colors = {
    green:  'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400',
    orange: 'bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400',
    amber:  'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400',
  }
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={clsx('mt-1 text-3xl font-bold', colors[color] || colors.orange)}>
        {loading ? '…' : value}
      </p>
    </div>
  )
}

// ── SQL setup script ──────────────────────────────────────────────────────────

const SQL_SETUP = `-- Run once in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.backups (
  collection TEXT NOT NULL,
  doc_id     TEXT NOT NULL,
  data       JSONB NOT NULL,
  synced_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collection, doc_id)
);

-- Allow the anon key to read and write
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon full access"
  ON public.backups FOR ALL
  USING (true)
  WITH CHECK (true);`
