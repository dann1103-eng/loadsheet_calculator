import { useMemo } from 'react'
import { useLoadSheet } from '../../context/LoadSheetContext'
import { calcFuel } from '../../utils/fuelCalc'

export default function FuelPlanner() {
  const { state, dispatch } = useLoadSheet()
  const fd = state.fuelData
  const tfob = parseFloat(state.wbInputs.fuel) || 0

  const fuel = useMemo(() => calcFuel({
    flow: fd.flow, trip: fd.trip, taxi: fd.taxi,
    alt1: fd.alt1, alt2: fd.alt2, tfob,
  }), [fd, tfob])

  const setField = (field, value) => dispatch({ type: 'SET_FUEL_DATA', field, value })

  const inputClass = 'w-full px-1.5 py-1 border-0 bg-transparent text-xs text-right font-mono focus:outline-none focus:bg-blue-50'
  const labelClass = 'px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-50'
  const valClass = 'px-2 py-1.5 text-xs text-right font-mono text-gray-700'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse border border-gray-300">
        <thead>
          <tr className="bg-[#1a3a5c] text-white text-[10px]">
            <th className="text-left px-2 py-1.5 font-semibold">COMBUSTIBLE</th>
            <th className="text-right px-2 py-1.5 font-semibold w-20">US gal</th>
            <th className="text-right px-2 py-1.5 font-semibold w-16">KG</th>
            <th className="text-right px-2 py-1.5 font-semibold w-16">TIME</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td className={labelClass}>POWER SETTING (%)</td>
            <td className="p-0"><input className={inputClass} value={fd.power} onChange={e => setField('power', e.target.value)} /></td>
            <td></td><td></td>
          </tr>
          <tr className="border-b border-gray-200">
            <td className={labelClass}>FUEL FLOW (US gal/h)</td>
            <td className="p-0"><input className={inputClass} value={fd.flow} onChange={e => setField('flow', e.target.value)} /></td>
            <td></td><td></td>
          </tr>
          <tr className="border-b border-gray-200 bg-gray-50">
            <td className={labelClass}>FUEL FLOW (KG/h)</td>
            <td className={valClass}>{fuel.flowKgh ? fuel.flowKgh.toFixed(1) : ''}</td>
            <td></td><td></td>
          </tr>
          {/* Editable fuel rows */}
          {[
            { id: 'taxi', label: 'TAXI', kg: fuel.taxiKg, time: fuel.taxiTime },
            { id: 'trip', label: 'TRIP', kg: fuel.tripKg, time: fuel.tripTime },
          ].map(r => (
            <tr key={r.id} className="border-b border-gray-200">
              <td className={labelClass}>{r.label}</td>
              <td className="p-0"><input className={inputClass} value={fd[r.id]} onChange={e => setField(r.id, e.target.value)} /></td>
              <td className={valClass}>{r.kg ? r.kg.toFixed(1) : ''}</td>
              <td className={valClass}>{r.time || ''}</td>
            </tr>
          ))}
          {/* Auto R/R 5% */}
          <tr className="border-b border-gray-200 bg-gray-50">
            <td className={labelClass}>R/R 5% (IFR)</td>
            <td className={valClass}>{fuel.rar ? fuel.rar.toFixed(2) : ''}</td>
            <td className={valClass}>{fuel.rarKg ? fuel.rarKg.toFixed(1) : ''}</td>
            <td className={valClass}>{fuel.rarTime || ''}</td>
          </tr>
          {/* ALT 1 and ALT 2 */}
          {[
            { id: 'alt1', label: 'ALT 1 (IFR)', kg: fuel.alt1Kg, time: fuel.alt1Time },
            { id: 'alt2', label: 'ALT 2 (IFR si req)', kg: fuel.alt2Kg, time: fuel.alt2Time },
          ].map(r => (
            <tr key={r.id} className="border-b border-gray-200">
              <td className={labelClass}>{r.label}</td>
              <td className="p-0"><input className={inputClass} value={fd[r.id]} onChange={e => setField(r.id, e.target.value)} /></td>
              <td className={valClass}>{r.kg ? r.kg.toFixed(1) : ''}</td>
              <td className={valClass}>{r.time || ''}</td>
            </tr>
          ))}
          {/* Auto reserve */}
          <tr className="border-b border-gray-200 bg-gray-50">
            <td className={labelClass}>FINAL RESERVE</td>
            <td className={valClass}>{fuel.reserve ? fuel.reserve.toFixed(2) : ''}</td>
            <td className={valClass}>{fuel.reserveKg ? fuel.reserveKg.toFixed(1) : ''}</td>
            <td className={valClass}>{fuel.reserveTime || ''}</td>
          </tr>
          {/* MIN REQ */}
          <tr className="border-b border-gray-200 bg-[#e8f0f8] font-bold">
            <td className="px-2 py-1.5 text-xs font-bold text-[#1a3a5c]">MIN REQUIRED</td>
            <td className="px-2 py-1.5 text-xs text-right font-mono font-bold text-[#1a3a5c]">{fuel.minReq ? fuel.minReq.toFixed(2) : ''}</td>
            <td className="px-2 py-1.5 text-xs text-right font-mono text-[#1a3a5c]">{fuel.minReqKg ? fuel.minReqKg.toFixed(1) : ''}</td>
            <td></td>
          </tr>
          {/* EXTRA */}
          <tr className="border-b border-gray-200">
            <td className={labelClass}>EXTRA</td>
            <td className={`px-2 py-1.5 text-xs text-right font-mono font-bold ${fuel.extra >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {tfob > 0 ? (fuel.extra >= 0 ? '+' : '') + fuel.extra.toFixed(2) : ''}
            </td>
            <td className={`px-2 py-1.5 text-xs text-right font-mono ${fuel.extra >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {tfob > 0 ? fuel.extraKg.toFixed(1) : ''}
            </td>
            <td></td>
          </tr>
          {/* TFOB */}
          <tr className="bg-[#e8f0f8] font-bold">
            <td className="px-2 py-2 text-xs font-bold text-[#1a3a5c]">TFOB</td>
            <td className="px-2 py-2 text-xs text-right font-mono font-bold text-[#1a3a5c]">{tfob || ''}</td>
            <td className="px-2 py-2 text-xs text-right font-mono text-[#1a3a5c]">{fuel.tfobKg ? fuel.tfobKg.toFixed(1) : ''}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
