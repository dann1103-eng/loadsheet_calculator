import { useState } from 'react'
import { toJpeg } from 'html-to-image'
import jsPDF from 'jspdf'
import { useLoadSheet, buildPesosPayload } from '../../context/LoadSheetContext'
import { AIRCRAFT } from '../../data/aircraft'
import StatusStrip from '../StatusStrip'
import ActionBar from '../ActionBar'
import PrintSheet from '../print/PrintSheet'

export default function Step5Summary() {
  const { state, dispatch } = useLoadSheet()
  const ac = state.aircraftData ?? AIRCRAFT[state.currentAC]
  const wb = state.wbResults
  const [showPrint, setShowPrint] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  const student = (state.identification.student || state.flightData.student || 'alumno').replace(/\s+/g, '_')
  const date = state.flightData.date || 'fecha'
  const filename = `loadsheet-${student}-${ac?.reg}-${date}.pdf`

  // Build x-user header — same logic as LoadSheetContext fetch
  function getXUserHeader() {
    try {
      const lsUser = localStorage.getItem('user')
      if (lsUser) return { 'x-user': lsUser }
    } catch (_) {}
    if (state.xUser) return { 'x-user': JSON.stringify(state.xUser) }
    return {}
  }

  const buildPdf = async () => {
    if (!showPrint) setShowPrint(true)
    await new Promise(resolve => setTimeout(resolve, 200))
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 1500))))
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
    const id_vuelo = state.id_vuelo
    if (!id_vuelo) {
      alert('No hay un vuelo asociado. Abrí esta app desde el sistema CAAA.')
      return
    }
    setEmailLoading(true)
    try {
      const pdf = await buildPdf()
      const base64 = pdf.output('datauristring').split(',')[1]

      // Build waypoints payload (same mapping as handleSubmit)
      const waypoints = state.navRows.map(row => ({
        waypoint: row.waypoint    || null,
        alt_fl:   row.altfl       || null,
        wv:       row.wv          || null,
        tc:       row.tc          || null,
        var:      row.var         || null,
        mc:       row.mc          || null,
        wca:      row.wca         || null,
        mh:       row.mh          || null,
        dev:      row.dev         || null,
        ch:       row.ch          || null,
        tas:      row.tas         || null,
        gs:       row.gs          || null,
        nm:       row.nm          || null,
        eta:      row['eta-h'] && row['eta-m'] ? `${row['eta-h']}:${row['eta-m']}` : null,
        ata:      row['ata-h'] && row['ata-m'] ? `${row['ata-h']}:${row['ata-m']}` : null,
        fuel_req: row['fuel-req'] || null,
        fuel_act: row['fuel-act'] || null,
      }))

      const fuelStation = ac?.stations?.find(s => s.is_fuel)
      const fuelGal = parseFloat(state.wbInputs[fuelStation?.id]) || 0
      const tfob = fuelGal * (ac?.fuel_lb_gal || 6.0)

      const res = await fetch(`/api/alumno/vuelos/${id_vuelo}/send-loadsheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getXUserHeader() },
        body: JSON.stringify({
          pdfBase64: base64,
          filename,
          student: state.flightData.student,
          date: state.flightData.date,
          aircraft: ac?.reg,
          loadsheet: {
            taxi:          state.fuelData.taxiMin    || null,
            trip:          state.fuelData.tripMin    || null,
            rr_5:          state.fuelData.rarMin     || null,
            alt1_ifr:      state.fuelData.alt1Min    || null,
            alt2_ifr:      state.fuelData.alt2Min    || null,
            final_reserve: state.fuelData.reserveMin || null,
            min_req:       state.fuelData.minReqMin  || null,
            extra:         null,
            tfob:          tfob || null,
            waypoints,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Error al enviar')
      if (data.estado === 'ENVIADO') {
        dispatch({ type: 'SET_ENVIADO' })
      }
      alert('Load sheet enviado al instructor correctamente.')
    } catch (err) {
      alert('Error al enviar: ' + (err?.message || String(err)))
    }
    setEmailLoading(false)
  }

  const handleSubmit = async () => {
    const id_vuelo = state.id_vuelo
    if (!id_vuelo) {
      alert('No hay un vuelo asociado. Abrí esta app desde el sistema CAAA.')
      return
    }

    dispatch({ type: 'SET_SUBMIT_STATUS', payload: 'submitting' })
    try {
      // 1. Guardar Weight & Balance
      const pesos = buildPesosPayload(state.wbInputs, ac.stations)
      const wbRes = await fetch(`/api/alumno/vuelos/${id_vuelo}/weight-balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getXUserHeader() },
        body: JSON.stringify({
          pesos,
          tow:           wb.totalW,
          cg:            wb.cg,
          dentro_limite: wb.allOk ?? false,
        }),
      })
      if (!wbRes.ok) {
        const d = await wbRes.json()
        throw new Error(d.message || 'Error al guardar W&B')
      }

      // 2. Guardar Loadsheet (nav + fuel)
      const fuelStation = ac.stations.find(s => s.is_fuel)
      const fuelGal = parseFloat(state.wbInputs[fuelStation?.id]) || 0
      const tfob = fuelGal * (ac.fuel_lb_gal || 6.0)

      const waypoints = state.navRows.map(row => ({
        waypoint: row.waypoint      || null,
        alt_fl:   row.altfl         || null,
        wv:       row.wv            || null,
        tc:       row.tc            || null,
        var:      row.var           || null,
        mc:       row.mc            || null,
        wca:      row.wca           || null,
        mh:       row.mh            || null,
        dev:      row.dev           || null,
        ch:       row.ch            || null,
        tas:      row.tas           || null,
        gs:       row.gs            || null,
        nm:       row.nm            || null,
        eta:      row['eta-h'] && row['eta-m'] ? `${row['eta-h']}:${row['eta-m']}` : null,
        ata:      row['ata-h'] && row['ata-m'] ? `${row['ata-h']}:${row['ata-m']}` : null,
        fuel_req: row['fuel-req']   || null,
        fuel_act: row['fuel-act']   || null,
      }))

      const lsRes = await fetch(`/api/alumno/vuelos/${id_vuelo}/loadsheet`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getXUserHeader() },
        body: JSON.stringify({
          taxi:          state.fuelData.taxiMin    || null,
          trip:          state.fuelData.tripMin    || null,
          rr_5:          state.fuelData.rarMin     || null,
          alt1_ifr:      state.fuelData.alt1Min    || null,
          alt2_ifr:      state.fuelData.alt2Min    || null,
          final_reserve: state.fuelData.reserveMin || null,
          min_req:       state.fuelData.minReqMin  || null,
          extra:         null,
          tfob:          tfob || null,
          waypoints,
        }),
      })
      if (!lsRes.ok) {
        const d = await lsRes.json()
        throw new Error(d.message || 'Error al guardar loadsheet')
      }

      dispatch({ type: 'SET_SUBMIT_STATUS', payload: 'submitted' })
      alert('Load sheet guardado exitosamente.')
    } catch (err) {
      dispatch({ type: 'SET_SUBMIT_STATUS', payload: 'error' })
      alert('Error al guardar: ' + (err?.message || String(err)))
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
      {/* Banner ENVIADO */}
      {state.isEnviado && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-300 rounded-lg">
          <span className="text-green-600 text-base font-bold">✓</span>
          <span className="text-green-800 text-sm font-semibold">Loadsheet enviado al instructor</span>
        </div>
      )}

      {!state.isEnviado && (
        <StatusStrip
          isApto={wb.allOk ? true : wb.totalW > 0 ? false : null}
          message={wb.allOk ? 'Peso y balance LISTO — listo para envio' : wb.totalW > 0 ? 'Peso y balance REQUIERE REVISION' : undefined}
        />
      )}

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
            Imprimir
          </button>
        )}

        <button
          onClick={handleDownloadPDF}
          disabled={pdfLoading}
          className="px-4 py-2 rounded-md text-sm font-semibold bg-[#1a3a5c] text-white hover:bg-[#122b46] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {pdfLoading ? 'Generando PDF...' : 'Descargar PDF'}
        </button>

        {/* Only show send + save when not yet sent */}
        {!state.isEnviado && (
          <>
            <button
              onClick={handleSendEmail}
              disabled={emailLoading}
              className="px-6 py-2 rounded-md text-sm font-semibold bg-[#15803d] text-white hover:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {emailLoading ? 'Enviando...' : 'Enviar Loadsheet'}
            </button>

            <button
              onClick={handleSubmit}
              disabled={state.submitStatus === 'submitting'}
              className="px-6 py-2 rounded-md text-sm font-semibold bg-[#1a3a5c] text-white hover:bg-[#122b46] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {state.submitStatus === 'submitting' ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        )}
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
