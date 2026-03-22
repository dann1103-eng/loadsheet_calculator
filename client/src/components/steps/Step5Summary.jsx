import { useState } from 'react'
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
          status: wb.allOk ? 'APTO' : 'REVISAR',
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
    ['Estado W&B', wb.allOk ? 'APTO ✓' : 'REVISAR ✗'],
  ]

  return (
    <div>
      <StatusStrip
        isApto={wb.allOk ? true : wb.totalW > 0 ? false : null}
        message={wb.allOk ? 'Peso y balance APTO — listo para envio' : wb.totalW > 0 ? 'Peso y balance REQUIERE REVISION' : undefined}
      />

      <h2 className="text-sm font-bold text-[#1a3a5c] uppercase tracking-wider mb-3">Resumen del Load Sheet</h2>

      <table className="w-full mb-6 text-sm border border-gray-300 rounded overflow-hidden">
        <tbody>
          {summaryRows.map(([label, value], i) => (
            <tr key={label} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
              <td className="px-3 py-2 font-semibold text-gray-600 w-40">{label}</td>
              <td className="px-3 py-2">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
            Imprimir
          </button>
        )}

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
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
          <PrintSheet />
        </div>
      )}

      <ActionBar onBack={() => dispatch({ type: 'SET_STEP', payload: 3 })} />
    </div>
  )
}
