import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

export function exportToCSV(data, filename = 'export') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`, { bookType: 'csv' })
}

export function exportToExcel(data, filename = 'export', sheetName = 'Data') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}

export function exportToPDF(title, columns, rows, filename = 'report') {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(title, 14, 16)
  doc.setFontSize(10)
  doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 24)
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  })
  doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}
