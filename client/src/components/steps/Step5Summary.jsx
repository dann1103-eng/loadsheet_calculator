import { useState } from 'react'
import { toJpeg } from 'html-to-image'
import jsPDF from 'jspdf'
import { useLoadSheet } from '../../context/LoadSheetContext'
import { AIRCRAFT } from '../../data/aircraft'
import StatusStrip from '../StatusStrip'
import ActionBar from '../ActionBar'
import PrintSheet from '../print/PrintSheet'

export default function Step5Summary() {
  const { state, dispatch } = useLoadSheet()
  const ac = AIRCRAFT[state.currentAC]
  const wb = state.wbResults
  const [showPrint, setShowPrint] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  const student = (state.identification.student || state.flightData.student || 'alumno').replace(/\s+/g, '_')
  const date = state.flightData.date || 'fecha'
  const filename = `loadsheet-${student}-${ac?.reg}-${date}.pdf`

  const buildPdf = async () => {
    if (!showPrint) setShowPrint(true)
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 800))))
    const el = document.getElementById('print-area')
    if (!el) throw new Error('Activa la vista previa primero.')
    const dataUrl = await toJpeg(el, { quality: 0.93, pixelRatio: 1.5, backgroundColor: '#ffffff' })
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
    const margin = 8
    const pageW = 297; const pageH = 210
    const maxImgW = pageW - margin * 2; const maxImgH = pageH - margin * 2
    const ratio = el.offsetHeight / el.offsetWidth
    let imgW = maxImgW; let imgH = imgW * ratio
    if (imgH > maxImgH) { imgH = maxImgH; imgW = imgH / ratio }
    pdf.addImage(dataUrl, 'JPEG', margin + (maxImgW - imgW) / 2, margin + (maxImgH - imgH) / 2, imgW, imgH)
    return pdf
  }

  const handleDownloadPDF = async () => {
    setPdfLoading(true)
    try {
      const pdf = await buildPdf()
      pdf.save(filename)
    } catch (err) {
      alert('Error PDF: ' + (err?.message || String(err)))
    }
    setPdfLoading(false)
  }

  const handleSendEmail = async () => {
    setEmailLoading(true)
    try {
      const pdf = await buildPdf()
      const base64 = pdf.output('datauristring').split(',')[1]
      const res = await fetch('/api/send-loadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: base64,
          filename,
          student: state.flightData.student,
          date: state.flightData.date,
          aircraft: ac?.reg,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar')
      alert('Load sheet enviado al instructor correctamente.')
    } catch (err) {
      alert('Error al enviar: ' + (err?.message || String(err)))
    }
    setEmailLoading(false)
  }

  const handleSubmit = async () => {
    dispatch({ type: 'SET_SUBMIT_STATUS', payload: 'submitting' })
    try {
      const payload = {
        aircraftReg: ac?.reg,
        aircraftKey: state.currentAC,
        date: state.flightData.date,
        studentId: state.flightData.student,
        flightData: state.flightData,
        wbInputs: state.wbInputs,
        calcResults: {
          grossWeight: wb.totalW,
          cg: wb.cg,
          status: wb.allOk ? 'LISTO' : 'REVISAR',
        },
        navRows: state.navRows,
        fuelData: state.fuelData,
        timesData: state.timesData,
        identification: state.identification,
        opsData: state.opsData,
        status: 'pending',
      }
      const res = await fetch('/api/loadsheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      dispatch({ type: 'SET_SUBMIT_STATUS', payload: 'submitted' })
      alert(`Load sheet enviado al instructor.\nID: ${data.id}\nEstado: ${data.status}`)
    } catch (err) {
      dispatch({ type: 'SET_SUBMIT_STATUS', payload: 'error' })
      alert('Error al enviar el load sheet. Intenta de nuevo.')
    }
  }

  const summaryRows = [
    ['Aeronave', `${ac?.reg} — ${ac?.model}`],
    ['Alumno', state.flightData.student],
    ['Licencia del Alumno', state.flightData.license],
    ['Instructor', state.flightData.instructor],
    ['Licencia del Instructor', state.flightData.instructorLicense],
    ['Fecha', state.flightData.date],
    ['Peso Bruto', wb.totalW ? `${wb.totalW.toLocaleString()} lb` : '—'],
    ['CG', wb.cg ? `${wb.cg.toFixed(2)} in` : '—'],
    ['Salida', state.opsData.dep.ap || state.identification.dep || '—'],
    ['Destino', state.opsData.dest.ap || state.identification.dest || '—'],
    ['Estado W&B', wb.allOk ? 'LISTO ✓' : 'REVISAR ✗'],
  ]

  return (
    <div>
      <StatusStrip
        isApto={wb.allOk ? true : wb.totalW > 0 ? false : null}
        message={wb.allOk ? 'Peso y balance LISTO — listo para envio' : wb.totalW > 0 ? 'Peso y balance REQUIERE REVISION' : undefined}
      />

      <h2 className="text-sm font-bold text-[#1a3a5c] uppercase tracking-wider mb-3">Resumen del Load Sheet</h2>

      <div className="overflow-x-auto mb-6">
      <table className="w-full text-sm border border-gray-300 rounded overflow-hidden">
        <tbody>
          {summaryRows.map(([label, value], i) => (
            <tr key={label} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
              <td className="px-3 py-2 font-semibold text-gray-600 w-40">{label}</td>
              <td className="px-3 py-2">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowPrint(!showPrint)}
          className="px-4 py-2 rounded-md text-sm font-semibold border border-[#1a3a5c] text-[#1a3a5c] hover:bg-[#e8f0f8] cursor-pointer"
        >
          {showPrint ? 'Ocultar vista previa' : 'Vista previa e impresion'}
        </button>

        {showPrint && (
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-gray-600 text-white hover:bg-gray-700 cursor-pointer"
          >
            🖨 Imprimir
          </button>
        )}

        <button
          onClick={handleDownloadPDF}
          disabled={pdfLoading}
          className="px-4 py-2 rounded-md text-sm font-semibold bg-[#1a3a5c] text-white hover:bg-[#122b46] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {pdfLoading ? 'Generando PDF...' : '⬇ Descargar PDF'}
        </button>

        <button
          onClick={handleSendEmail}
          disabled={emailLoading}
          className="px-6 py-2 rounded-md text-sm font-semibold bg-[#15803d] text-white hover:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {emailLoading ? 'Enviando...' : '✉ Enviar Loadsheet'}
        </button>
      </div>

      {/* Inline print preview */}
      {showPrint && (
        <div className="overflow-x-auto bg-gray-200 rounded-lg p-4">
          <div className="min-w-[960px] bg-white shadow-md mx-auto">
            <PrintSheet />
          </div>
        </div>
      )}

      <ActionBar onBack={() => dispatch({ type: 'SET_STEP', payload: 3 })} />
    </div>
  )
}
