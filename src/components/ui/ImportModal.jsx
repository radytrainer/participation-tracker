import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

export default function ImportModal({
  open,
  onClose,        // onClose(didImport: boolean)
  title,
  templateFilename,
  templateSample, // array of sample row objects — defines columns & order
  onImport,       // async (row) => void — called once per row
}) {
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('idle') // idle | importing | done
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState({ success: 0, errors: [] })
  const fileRef = useRef(null)

  const templateColumns = templateSample.length ? Object.keys(templateSample[0]) : []
  const previewCols = templateColumns.slice(0, 5)

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet(templateSample)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, `${templateFilename}_template.xlsx`)
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setStatus('idle')
    setResults({ success: 0, errors: [] })
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
      setRows(data)
    }
    reader.readAsArrayBuffer(file)
  }

  async function runImport() {
    setStatus('importing')
    setProgress({ current: 0, total: rows.length })
    let success = 0
    const errors = []
    for (let i = 0; i < rows.length; i++) {
      setProgress({ current: i + 1, total: rows.length })
      try {
        await onImport(rows[i])
        success++
      } catch (e) {
        errors.push(`Row ${i + 2}: ${e.message}`)
      }
    }
    setResults({ success, errors })
    setStatus('done')
  }

  function handleClose() {
    const imported = status === 'done' && results.success > 0
    setRows([])
    setFileName('')
    setStatus('idle')
    setResults({ success: 0, errors: [] })
    if (fileRef.current) fileRef.current.value = ''
    onClose(imported)
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} size="lg">
      <div className="space-y-5">

        {/* Template download */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Step 1 — Download the template</p>
            <p className="text-xs text-gray-500 mt-0.5">Fill it in, then upload below. Do not rename or remove columns.</p>
          </div>
          <Button variant="outline" size="sm" icon={Download} onClick={downloadTemplate}>
            Template (.xlsx)
          </Button>
        </div>

        {/* File picker */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Step 2 — Upload your file <span className="text-gray-400 font-normal">.csv or .xlsx</span>
          </p>
          <div
            className="flex items-center gap-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 cursor-pointer hover:border-primary-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className={`text-sm flex-1 ${fileName ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
              {fileName || 'Choose a file…'}
            </span>
            <span className="text-xs text-primary-600 font-medium flex-shrink-0">Browse</span>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
        </div>

        {/* Preview */}
        {rows.length > 0 && status !== 'done' && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview — <span className="text-primary-600">{rows.length} row{rows.length !== 1 ? 's' : ''}</span> ready to import
            </p>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400">
                    <tr>
                      {previewCols.map((col) => (
                        <th key={col} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{col}</th>
                      ))}
                      {templateColumns.length > 5 && <th className="px-3 py-2 text-gray-300">…</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="bg-white dark:bg-gray-800">
                        {previewCols.map((col) => (
                          <td key={col} className="px-3 py-2 text-gray-700 dark:text-gray-300 truncate max-w-[8rem]">
                            {row[col] !== '' ? String(row[col]) : <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                        {templateColumns.length > 5 && <td className="px-3 py-2 text-gray-300">…</td>}
                      </tr>
                    ))}
                    {rows.length > 5 && (
                      <tr>
                        <td
                          colSpan={previewCols.length + (templateColumns.length > 5 ? 1 : 0)}
                          className="px-3 py-2 text-center text-gray-400 italic"
                        >
                          + {rows.length - 5} more rows not shown
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {status === 'importing' && (
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Importing {progress.current} of {progress.total}…
              </p>
              <div className="mt-1.5 h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {status === 'done' && (
          <div className="space-y-3">
            <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
              results.errors.length === 0
                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                : 'bg-amber-50 dark:bg-amber-900/20'
            }`}>
              <CheckCircle className={`h-5 w-5 flex-shrink-0 ${
                results.errors.length === 0 ? 'text-emerald-600' : 'text-amber-500'
              }`} />
              <p className={`text-sm font-medium ${
                results.errors.length === 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-amber-700 dark:text-amber-300'
              }`}>
                {results.success} imported successfully
                {results.errors.length > 0 && `, ${results.errors.length} failed`}
              </p>
            </div>
            {results.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-3 space-y-1.5 max-h-36 overflow-y-auto">
                {results.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-1 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {status === 'done' ? 'Close' : 'Cancel'}
          </Button>
          {status !== 'done' && (
            <Button
              onClick={runImport}
              disabled={rows.length === 0 || status === 'importing'}
              loading={status === 'importing'}
              icon={Upload}
            >
              {rows.length > 0 ? `Import ${rows.length} record${rows.length !== 1 ? 's' : ''}` : 'Import'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
