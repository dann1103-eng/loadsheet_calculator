import { useLoadSheet } from '../../context/LoadSheetContext'
import { AIRCRAFT } from '../../data/aircraft'
import WBTable from '../wb/WBTable'
import ResultCards from '../wb/ResultCards'
import EnvelopeCanvas from '../wb/EnvelopeCanvas'
import StatusStrip from '../StatusStrip'
import ActionBar from '../ActionBar'

export default function Step2WB() {
  const { state, dispatch } = useLoadSheet()
  const ac = AIRCRAFT[state.currentAC]
  const wb = state.wbResults

  const hasData = wb.totalW > (ac?.empty_weight || 0)

  return (
    <div>
      <StatusStrip
        isApto={hasData ? wb.allOk : null}
        message={hasData
          ? (wb.allOk ? 'Peso y balance dentro de limites — APTO' : 'Peso y balance fuera de limites — REQUIERE REVISION')
          : undefined}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left: Table + Results */}
        <div>
          <div className="overflow-x-auto">
            <WBTable />
          </div>
          <ResultCards />
        </div>

        {/* Right: Charts + Fuel burn */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <EnvelopeCanvas
              gw={wb.totalW}
              cg={wb.cg}
              limitsNormal={ac?.limits_normal}
              limitsUtility={ac?.limits_utility}
              title="Envolvente — Despegue"
              showPoint={hasData}
            />
            <EnvelopeCanvas
              gw={wb.ldgW || 0}
              cg={wb.ldgCG || 0}
              limitsNormal={ac?.limits_normal}
              limitsUtility={ac?.limits_utility}
              title="Envolvente — Aterrizaje"
              showPoint={wb.ldgW > 0}
            />
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Combustible de quema estimado (gal)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={state.fuelBurn}
              onChange={e => dispatch({ type: 'SET_FUEL_BURN', payload: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#1a3a5c] focus:ring-1 focus:ring-[#1a3a5c]"
              placeholder="Ej: 8"
            />
            <p className="text-[10px] text-gray-400 mt-1">Se resta del combustible cargado para calcular CG al aterrizaje</p>
          </div>
        </div>
      </div>

      <ActionBar
        onBack={() => dispatch({ type: 'SET_STEP', payload: 0 })}
        onNext={() => dispatch({ type: 'SET_STEP', payload: 2 })}
      />
    </div>
  )
}
