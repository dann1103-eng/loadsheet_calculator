import { createContext, useContext, useEffect, useReducer } from 'react'
import { AIRCRAFT } from '../data/aircraft'

// ── URL params (id_vuelo only — token comes from localStorage or URL fallback) ─

function parseUrlParams() {
  const params = new URLSearchParams(window.location.search)
  const id_vuelo = params.get('id_vuelo') || null
  // Fallback: accept token from URL for cross-origin dev (different port)
  const tokenRaw = params.get('token')
  let xUser = null
  if (tokenRaw) {
    try { xUser = JSON.parse(decodeURIComponent(tokenRaw)) } catch (_) {}
  }
  return { id_vuelo, xUser }
}

const { id_vuelo: URL_ID_VUELO, xUser: URL_X_USER } = parseUrlParams()

// ── plantillaToAC — same logic as CAA-frontend/src/utils/plantillaToAC.js ────

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function plantillaToAC(plantilla, reg, model) {
  const fuelLbGal = parseFloat(plantilla.fuel_lb_gal) || 6.0
  const allEstaciones = plantilla.estaciones ?? []

  const oilEst = allEstaciones.find(s => s.is_oil === true || s.is_fixed === true)
  const oil = oilEst
    ? {
        label:  oilEst.nombre,
        arm:    parseFloat(oilEst.arm),
        weight: parseFloat(oilEst.fixed_weight ?? oilEst.max_weight ?? 0),
      }
    : null

  const fuelCapGal = parseFloat(plantilla.fuel_capacity_gal) || null
  const fuelUsable = parseFloat(plantilla.fuel_usable_gal) || null

  function fuelLabel(stationNombre) {
    if (fuelCapGal && fuelUsable && fuelCapGal !== fuelUsable)
      return `Fuel (${fuelCapGal} gal cap, ${fuelUsable} usable)`
    if (fuelUsable) return `Fuel (${fuelUsable} gal)`
    return stationNombre
  }

  const stations = allEstaciones
    .filter(s => !s.is_oil && !s.is_fixed)
    .map(s => {
      const id = toSlug(s.nombre)
      const isFuel = s.is_fuel === true
      const maxGal = isFuel
        ? (s.max_gal ?? (s.max_weight ? s.max_weight / fuelLbGal : undefined))
        : undefined
      return {
        id,
        label:   isFuel ? fuelLabel(s.nombre) : s.nombre,
        nombre:  s.nombre,
        arm:     parseFloat(s.arm),
        max:     !isFuel && s.max_weight != null ? parseFloat(s.max_weight) : undefined,
        max_gal: maxGal,
        is_fuel: isFuel,
      }
    })

  return {
    reg,
    model:             model || reg,
    empty_weight:      parseFloat(plantilla.empty_weight),
    empty_arm:         parseFloat(plantilla.empty_weight_arm),
    empty_moment:      parseFloat(plantilla.empty_weight_moment),
    max_gross:         parseFloat(plantilla.max_takeoff_weight),
    max_landing:       parseFloat(plantilla.max_landing_weight ?? plantilla.max_takeoff_weight),
    fuel_lb_gal:       fuelLbGal,
    fuel_capacity_gal: fuelCapGal,
    fuel_usable_gal:   fuelUsable,
    fuel_burn_gal_hr:  parseFloat(plantilla.fuel_burn_gal_hr) || null,
    fuel_burn_note:    plantilla.fuel_burn_note ?? null,
    moment_div1000:    plantilla.moment_div1000 === true,
    oil,
    stations,
    limits_normal:     plantilla.limits_normal ?? [],
    limits_utility:    plantilla.limits_utility ?? null,
  }
}

export { plantillaToAC }

/**
 * Convierte wbInputs { [id]: string } al objeto pesos { [nombre]: number }
 * que espera PUT /api/alumno/vuelos/:id_vuelo/weight-balance.
 */
export function buildPesosPayload(wbInputs, stations) {
  const pesos = {}
  for (const station of stations) {
    const raw = wbInputs[station.id]
    if (raw !== '' && raw != null) {
      const val = parseFloat(raw)
      if (!isNaN(val)) pesos[station.nombre] = val
    }
  }
  return pesos
}

// ── Estado inicial ────────────────────────────────────────────────────────────

const initialState = {
  id_vuelo:    URL_ID_VUELO,
  xUser:       URL_X_USER,

  // true while fetching from backend (only in integrated mode)
  loading:     !!URL_ID_VUELO,
  loadError:   null,

  aircraftData: null,   // set by INIT_FROM_API
  vueloInfo:    null,

  currentAC: 'pa28r180',
  step: 0,

  flightData: {
    date: new Date().toISOString().split('T')[0],
    time: '',
    student: '',
    license: '',
    instructor: '',
    instructorLicense: '',
  },

  wbInputs: {},
  wbResults: { totalW: 0, totalM: 0, cg: 0, cgOk: false, overweight: false, allOk: false },
  fuelBurn: '',

  navRows: [{}, {}, {}],
  fuelData: {
    power: '75', flowGal: '10', flowKg: '27.2',
    taxiMin: '', tripMin: '', rarMin: '', alt1Min: '', alt2Min: '', reserveMin: '', minReqMin: '',
  },
  timesData: { tod: '', ld: '', etd: '', atd: '', eta: '', ata: '', eet: '', total: '' },
  depAtis: '',
  arrAtis: '',
  notes: '',

  identification: {
    dep: '', dest: '', date: '', reg: '', type: '',
    pic: '', student: '', sign: '', tom: '', lm: '', tog: '', lcg: '',
  },

  opsData: {
    dep:  { ap: '', rwy: '', appr: '', vis: '', ceil: '' },
    dest: { ap: '', rwy: '', appr: '', vis: '', ceil: '' },
    alt:  { ap: '', rwy: '', appr: '', vis: '', ceil: '' },
    remarks: '',
  },

  submitStatus: 'idle',

  // true when the loadsheet has been sent to the instructor (estado === 'ENVIADO')
  isEnviado: false,
}

function getDefaultFuelData(acKey) {
  const ac = AIRCRAFT[acKey]
  if (!ac) return {}
  const flowGal = ac.default_flow_gal || ''
  const flowKg = flowGal ? parseFloat((flowGal * ac.fuel_lb_gal * 0.453592).toFixed(1)) : ''
  return {
    power: String(ac.default_power || ''),
    flowGal: String(flowGal),
    flowKg: String(flowKg),
    taxiMin: '', tripMin: '', rarMin: '', alt1Min: '', alt2Min: '', reserveMin: '', minReqMin: '',
  }
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {

    case 'SET_ENVIADO':
      return { ...state, isEnviado: true }

    case 'INIT_FROM_API': {
      const { ac, vueloInfo, savedWB, loadsheetEstado } = action.payload

      const alumnoNombre = vueloInfo
        ? `${vueloInfo.alumno_nombre ?? ''} ${vueloInfo.alumno_apellido ?? ''}`.trim()
        : ''
      const instructorNombre = vueloInfo
        ? `${vueloInfo.instructor_nombre ?? ''} ${vueloInfo.instructor_apellido ?? ''}`.trim()
        : ''
      const fechaVuelo = vueloInfo?.fecha_vuelo
        ? String(vueloInfo.fecha_vuelo).slice(0, 10)
        : new Date().toISOString().split('T')[0]
      const horaInicio = vueloInfo?.hora_inicio
        ? String(vueloInfo.hora_inicio).slice(0, 5)
        : ''

      const burnGalHr = ac?.fuel_burn_gal_hr ?? null
      const burnKgHr = burnGalHr && ac?.fuel_lb_gal
        ? ((burnGalHr * ac.fuel_lb_gal) / 2.205).toFixed(1)
        : ''

      // Hydrate wbInputs from savedWB.pesos_ingresados
      const wbInputs = {}
      if (savedWB?.pesos_ingresados && ac?.stations) {
        for (const station of ac.stations) {
          const savedVal = savedWB.pesos_ingresados[station.nombre]
          if (savedVal != null) {
            wbInputs[station.id] = String(savedVal)
          }
        }
      }

      return {
        ...initialState,
        id_vuelo:  state.id_vuelo,
        xUser:     state.xUser,
        loading:   false,
        loadError: null,
        aircraftData: ac,
        vueloInfo,
        flightData: {
          date:              fechaVuelo,
          time:              horaInicio,
          student:           alumnoNombre,
          license:           '',
          instructor:        instructorNombre,
          instructorLicense: '',
        },
        identification: {
          ...initialState.identification,
          date:    fechaVuelo,
          reg:     ac?.reg    ?? '',
          type:    ac?.model  ?? '',
          pic:     instructorNombre,
          student: alumnoNombre,
        },
        fuelData: {
          ...initialState.fuelData,
          flowGal: burnGalHr != null ? String(burnGalHr) : '',
          flowKg:  burnKgHr,
        },
        wbInputs,
        fuelBurn: savedWB?.fuel_burn != null ? String(savedWB.fuel_burn) : '',
        isEnviado: loadsheetEstado === 'ENVIADO',
      }
    }

    case 'SET_LOAD_ERROR':
      return { ...state, loading: false, loadError: action.payload }

    case 'SET_STEP':
      return { ...state, step: action.payload }

    case 'SET_AIRCRAFT':
      return {
        ...state,
        currentAC: action.payload,
        wbInputs: {},
        fuelData: { ...state.fuelData, ...getDefaultFuelData(action.payload) },
      }

    case 'SET_FLIGHT_DATA':
      return { ...state, flightData: { ...state.flightData, [action.field]: action.value } }

    case 'SET_WB_INPUT':
      return { ...state, wbInputs: { ...state.wbInputs, [action.id]: action.value } }

    case 'SET_WB_RESULTS':
      return { ...state, wbResults: action.payload }

    case 'SET_FUEL_BURN':
      return { ...state, fuelBurn: action.payload }

    case 'SET_NAV_ROW': {
      const rows = [...state.navRows]
      rows[action.index] = { ...rows[action.index], [action.col]: action.value }
      return { ...state, navRows: rows }
    }

    case 'ADD_NAV_ROW':
      return { ...state, navRows: [...state.navRows, {}] }

    case 'SET_FUEL_DATA':
      return { ...state, fuelData: { ...state.fuelData, [action.field]: action.value } }

    case 'SET_TIMES':
      return { ...state, timesData: { ...state.timesData, [action.field]: action.value } }

    case 'SET_ATIS':
      return { ...state, [action.field]: action.value }

    case 'SET_NOTES':
      return { ...state, notes: action.payload }

    case 'SET_IDENTIFICATION':
      return { ...state, identification: { ...state.identification, [action.field]: action.value } }

    case 'SET_OPS':
      return {
        ...state,
        opsData: {
          ...state.opsData,
          [action.section]: { ...state.opsData[action.section], [action.field]: action.value },
        },
      }

    case 'SET_OPS_REMARKS':
      return { ...state, opsData: { ...state.opsData, remarks: action.payload } }

    case 'SET_SUBMIT_STATUS':
      return { ...state, submitStatus: action.payload }

    default:
      return state
  }
}

// ── Context / Provider ────────────────────────────────────────────────────────

const LoadSheetContext = createContext()

export function LoadSheetProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (!state.id_vuelo) return  // standalone mode — no fetch needed

    // Auth: build x-user header (same format as CAA-frontend)
    // Prefer localStorage (same-origin production), fall back to URL token param
    let xUserJson = null
    try {
      const lsUser = localStorage.getItem('user')
      if (lsUser) xUserJson = lsUser          // already a JSON string
    } catch (_) {}

    if (!xUserJson && state.xUser) {
      xUserJson = JSON.stringify(state.xUser)  // from URL ?token= param
    }

    if (!xUserJson) {
      dispatch({ type: 'SET_LOAD_ERROR', payload: 'No hay sesión activa. Ingresá desde el sistema.' })
      return
    }

    const baseUrl = import.meta.env.VITE_API_URL ?? ''

    fetch(`${baseUrl}/api/alumno/vuelos/${state.id_vuelo}/weight-balance`, {
      headers: { 'x-user': xUserJson },
    })
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.message || 'Error al cargar datos')))
      .then(data => {
        const ac = plantillaToAC(
          data.plantilla,
          data.aeronave_codigo,
          data.vuelo?.aeronave_modelo,
        )
        dispatch({
          type: 'INIT_FROM_API',
          payload: {
            ac,
            vueloInfo:       data.vuelo             ?? null,
            savedWB:         data.wb                ?? null,
            loadsheetEstado: data.loadsheet_estado  ?? null,
          },
        })
      })
      .catch(err => {
        dispatch({ type: 'SET_LOAD_ERROR', payload: String(err) })
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LoadSheetContext.Provider value={{ state, dispatch }}>
      {children}
    </LoadSheetContext.Provider>
  )
}

export function useLoadSheet() {
  const ctx = useContext(LoadSheetContext)
  if (!ctx) throw new Error('useLoadSheet must be used within LoadSheetProvider')
  return ctx
}
