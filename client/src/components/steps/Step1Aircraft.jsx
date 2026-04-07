import { useState } from 'react'
import { toJpeg } from 'html-to-image'
import jsPDF from 'jspdf'
import { useLoadSheet } from '../../context/LoadSheetContext'
import { AIRCRAFT } from '../../data/aircraft'
import ActionBar from '../ActionBar'

export default function Step1Aircraft() {
  const { state, dispatch } = useLoadSheet()

  // Use server-loaded aircraft if available, otherwise fall back to local data
  const ac = state.aircraftData ?? AIRCRAFT[state.currentAC]
  const [pdfLoading, setPdfLoading] = useState(false)

  // Aircraft selector is only shown when running standalone (no id_vuelo in URL)
  const isStandalone = !state.id_vuelo
  const AC_KEYS = isStandalone ? Object.keys(AIRCRAFT).filter(k => !AIRCRAFT[k].disabled) : []

  return (
    <div>
      <h2 className="text-sm font-bold text-[#1a3a5c] uppercase tracking-wider mb-4">Aeronave</h2>

      {/* Standalone mode: show aircraft pill selector */}
      {isStandalone && (
        <div className="flex flex-wrap gap-2 mb-4">
          {AC_KEYS.map(key => (
            <button
              key={key}
              onClick={() => dispatch({ type: 'SET_AIRCRAFT', payload: key })}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all cursor-pointer ${
                state.currentAC === key
                  ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-[#1a3a5c] hover:text-[#1a3a5c]'
              }`}
            >
              {AIRCRAFT[key].reg}
            </button>
          ))}
        </div>
      )}

      {/* Integrated mode: show flight/aircraft badge */}
      {!isStandalone && ac && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#e8f0f8] rounded-full mb-4">
          <span className="text-xs font-bold text-[#1a3a5c]">{ac.reg}</span>
          <span className="text-xs text-gray-500">{ac.model}</span>
        </div>
      )}

      {/* Specs bar */}
      {ac && (
        <div className="bg-[#e8f0f8] rounded-md p-3 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><span className="text-gray-500 block">Modelo</span><span className="font-semibold text-[#1a3a5c]">{ac.model}</span></div>
          <div><span className="text-gray-500 block">Peso Vacio</span><span className="font-semibold text-[#1a3a5c]">{ac.empty_weight?.toLocaleString()} lb</span></div>
          <div><span className="text-gray-500 block">Peso Max</span><span className="font-semibold text-[#1a3a5c]">{ac.max_gross?.toLocaleString()} lb</span></div>
          <div>
            <span className="text-gray-500 block">Combustible</span>
            <span className="font-semibold text-[#1a3a5c]">
              {ac.fuel_usable_gal ?? ac.fuel_cap_gal ?? '?'} gal usable
            </span>
          </div>
        </div>
      )}

      {/* Flight data form */}
      <h2 className="text-sm font-bold text-[#1a3a5c] uppercase tracking-wider mb-4">Datos del Vuelo</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {[
          ['Fecha', 'date', 'date'],
          ['Hora (UTC)', 'time', 'text'],
          ['Nombre del Alumno', 'student', 'text'],
          ['Licencia del Alumno', 'license', 'text'],
          ['Nombre del Instructor', 'instructor', 'text'],
          ['Licencia del Instructor', 'instructorLicense', 'text'],
        ].map(([label, field, type]) => (
          <div key={field}>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
            {isStandalone ? (
              <input
                type={type}
                value={state.flightData[field]}
                onChange={e => dispatch({ type: 'SET_FLIGHT_DATA', field, value: e.target.value })}
                placeholder={type === 'text' && field === 'time' ? 'HH:MM' : undefined}
                pattern={field === 'time' ? '[0-2][0-9]:[0-5][0-9]' : undefined}
                maxLength={field === 'time' ? 5 : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#1a3a5c] focus:ring-1 focus:ring-[#1a3a5c]"
              />
            ) : (
              <input
                value={state.flightData[field]}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-100 text-gray-500"
              />
            )}
          </div>
        ))}
      </div>

      {state.isEnviado ? (
        <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-gray-300 mt-6">
          <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            Loadsheet enviado al instructor
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={async () => {
                setPdfLoading(true)
                try {
                  dispatch({ type: 'SET_STEP', payload: 4 })
                  // Small delay so PrintSheet renders before capture
                  await new Promise(r => setTimeout(r, 300))
                  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 1500))))
                  const el = document.getElementById('print-area')
                  if (!el) { alert('Activa la vista previa en el Resumen primero.'); return }
                  const dataUrl = await toJpeg(el, { quality: 0.93, pixelRatio: 1.5, backgroundColor: '#ffffff' })
                  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
                  const margin = 8; const pageW = 297; const pageH = 210
                  const maxImgW = pageW - margin * 2; const maxImgH = pageH - margin * 2
                  const ratio = el.offsetHeight / el.offsetWidth
                  let imgW = maxImgW; let imgH = imgW * ratio
                  if (imgH > maxImgH) { imgH = maxImgH; imgW = imgH / ratio }
                  pdf.addImage(dataUrl, 'JPEG', margin + (maxImgW - imgW) / 2, margin + (maxImgH - imgH) / 2, imgW, imgH)
                  const student = (state.flightData.student || 'alumno').replace(/\s+/g, '_')
                  pdf.save(`loadsheet-${student}-${ac?.reg}-${state.flightData.date}.pdf`)
                } catch (err) {
                  alert('Error PDF: ' + (err?.message || String(err)))
                } finally {
                  setPdfLoading(false)
                }
              }}
              disabled={pdfLoading}
              className="px-4 py-2 rounded-md text-sm font-semibold bg-[#1a3a5c] text-white hover:bg-[#122b46] disabled:opacity-50 cursor-pointer"
            >
              {pdfLoading ? 'Generando...' : 'Descargar Loadsheet'}
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_STEP', payload: 4 })}
              className="px-4 py-2 rounded-md text-sm font-semibold bg-white border border-[#1a3a5c] text-[#1a3a5c] hover:bg-[#e8f0f8] cursor-pointer"
            >
              Ver Resumen
            </button>
          </div>
        </div>
      ) : (
        <ActionBar onNext={() => dispatch({ type: 'SET_STEP', payload: 1 })} />
      )}
    </div>
  )
}
