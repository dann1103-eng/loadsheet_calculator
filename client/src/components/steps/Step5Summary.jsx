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

  const handleDownloadPDF = async () => {
    if (!showPrint) setShowPrint(true)
    setPdfLoading(true)
    // Esperar 2 frames + 800ms para que canvases terminen de dibujar
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 800))))
    try {
      const el = document.getElementById('print-area')
      if (!el) { setPdfLoading(false); alert('Activa la vista previa primero.'); return }

      const dataUrl = await toJpeg(el, {
        quality: 0.93,
        pixelRatio: 1.5,
        backgroundColor: '#ffffff',
      })

      // A4 landscape: 297 × 210 mm
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
      const margin = 8
      const pageW = 297
      const pageH = 210
      const maxImgW = pageW - margin * 2
      const maxImgH = pageH - margin * 2

      const ratio = el.offsetHeight / el.offsetWidth
      let imgW = maxImgW
      let imgH = imgW * ratio
      if (imgH > maxImgH) {
        imgH = maxImgH
        imgW = imgH / ratio
      }
      const xOffset = margin + (maxImgW - imgW) / 2
      const yOffset = margin + (maxImgH - imgH) / 2

      pdf.addImage(dataUrl, 'JPEG', xOffset, yOffset, imgW, imgH)
      const student = (state.identification.student || state.flightData.student || 'alumno').replace(/\s+/g, '_')
      const date = state.flightData.date || 'fecha'
      pdf.save(`loadsheet-${student}-${ac.reg}-${date}.pdf`)
    } catch (err) {
      alert('Error PDF: ' + (err?.message || String(err)))
    }
    setPdfLoading(false)
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
    ['Instructor', state.flightData.instructor],
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
          onClick={handleSubmit}
          disabled={!wb.allOk || state.submitStatus === 'submitting'}
          className="px-6 py-2 rounded-md text-sm font-semibold bg-[#15803d] text-white hover:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {state.submitStatus === 'submitting' ? 'Enviando...' : state.submitStatus === 'submitted' ? 'Enviado ✓' : 'Enviar al Instructor'}
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
