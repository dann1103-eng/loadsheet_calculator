import { createContext, useContext, useEffect, useReducer } from 'react'
import { AIRCRAFT } from '../data/aircraft'

// ── URL params ────────────────────────────────────────────────────────────────

function parseUrlParams() {
  const params = new URLSearchParams(window.location.search)
  const id_vuelo = params.get('id_vuelo') || null
  const jwtToken = params.get('jwt') ? decodeURIComponent(params.get('jwt')) : null
  const tokenRaw = params.get('token')
  let xUser = null
  if (tokenRaw) {
    try { xUser = JSON.parse(decodeURIComponent(tokenRaw)) } catch (_) {}
  }
  return { id_vuelo, xUser, jwtToken }
}

const { id_vuelo: URL_ID_VUELO, xUser: URL_X_USER, jwtToken: URL_JWT_TOKEN } = parseUrlParams()

// ── plantillaToAC ─────────────────────────────────────────────────────────────

function toSlug(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function plantillaToAC(plantilla, reg, model) {
  const nombrePlantilla = plantilla.nombre || model || reg;
  const fuelLbGal = parseFloat(plantilla.fuel_lb_gal) || 6.0;
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
    nombre:            nombrePlantilla,
    sheet:             nombrePlantilla,
    empty_weight:      parseFloat(plantilla.empty_weight),
    empty_arm:         parseFloat(plantilla.empty_weight_arm),
    empty_moment:      parseFloat(plantilla.empty_weight_moment),
    max_gross:         parseFloat(plantilla.max_takeoff_weight),
    max_landing:       parseFloat(plantilla.max_landing_weight || plantilla.max_takeoff_weight),
    max_useful_load:   parseFloat(plantilla.max_useful_load) || (parseFloat(plantilla.max_takeoff_weight) - parseFloat(plantilla.empty_weight)),
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
  jwtToken:    URL_JWT_TOKEN,
  loading:     !!URL_ID_VUELO,
  loadError:   null,
  aircraftData: null,
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
      const { ac, vueloInfo, savedWB, savedLoadsheet, savedWaypoints, loadsheetEstado } = action.payload

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

      const wbInputs = {}
      if (savedWB?.pesos_ingresados && ac?.stations) {
        for (const station of ac.stations) {
          const savedVal = savedWB.pesos_ingresados[station.nombre]
          if (savedVal != null) {
            wbInputs[station.id] = String(savedVal)
          }
        }
      }

      const ls = savedLoadsheet ?? null
      const fuelDataFromLS = {
        power:      ls?.power_setting || '75',
        flowGal:    ls?.fuel_flow     != null ? String(ls.fuel_flow)      : (burnGalHr != null ? String(burnGalHr) : '10'),
        taxiMin:    ls?.taxi_fuel     != null ? String(ls.taxi_fuel)      : '',
        tripMin:    ls?.trip_fuel     != null ? String(ls.trip_fuel)      : '',
        rarMin:     ls?.reserve_rr    != null ? String(ls.reserve_rr)     : '',
        alt1Min:    ls?.alt1_fuel     != null ? String(ls.alt1_fuel)      : '',
        alt2Min:    ls?.alt2_fuel     != null ? String(ls.alt2_fuel)      : '',
        reserveMin: ls?.final_reserve != null ? String(ls.final_reserve)  : '',
        minReqMin:  ls?.min_req       != null ? String(ls.min_req)        : '',
        tfobGal:    ls?.tfob          != null ? String(ls.tfob)           : '',
      }

      const navRowsFromWP = Array.isArray(savedWaypoints) && savedWaypoints.length > 0
        ? savedWaypoints.map(wp => {
            // Si existe la columna 'data', la usamos como base para recuperar todo exactamente
            if (wp.data && typeof wp.data === 'object') {
              return { ...wp.data }
            }
            // Fallback para datos antiguos o columnas planas
            const row = {}
            if (wp.waypoint     != null) row.waypoint      = wp.waypoint
            if (wp.altitud_fl   != null) row.altfl          = String(wp.altitud_fl)
            if (wp.wind_vel     != null) row.wv             = String(wp.wind_vel)
            if (wp.tc           != null) row.tc             = String(wp.tc)
            if (wp.variacion    != null) row.var            = String(wp.variacion)
            if (wp.mc           != null) row.mc             = String(wp.mc)
            if (wp.wca          != null) row.wca            = String(wp.wca)
            if (wp.mh           != null) row.mh             = String(wp.mh)
            if (wp.desviacion   != null) row.dev            = String(wp.desviacion)
            if (wp.ch           != null) row.ch             = String(wp.ch)
            if (wp.tas          != null) row.tas            = String(wp.tas)
            if (wp.gs           != null) row.gs             = String(wp.gs)
            if (wp.distancia_nm != null) row.nm             = String(wp.distancia_nm)
            if (wp.fuel_req     != null) row['fuel-req']    = String(wp.fuel_req)
            if (wp.fuel_act     != null) row['fuel-act']    = String(wp.fuel_act)
            return row
          })
        : [{}, {}, {}]

      return {
        ...initialState,
        id_vuelo:  state.id_vuelo,
        xUser:     state.xUser,
        jwtToken:  state.jwtToken,
        loading:   false,
        loadError: null,
        aircraftData: ac,
        vueloInfo,
        flightData: {
          date:              fechaVuelo,
          time:              horaInicio,
          student:           alumnoNombre,
          license:           vueloInfo?.licencia_nombre ?? '',
          instructor:        instructorNombre,
          instructorLicense: vueloInfo?.instructor_licencia ?? '',
        },
        identification: {
          ...initialState.identification,
          ...(ls?.identification_data || {}),
          // Forzamos campos de solo lectura si vienen del vuelo
          date:    fechaVuelo,
          reg:     ac?.reg    ?? '',
          type:    ac?.model  ?? '',
          pic:     instructorNombre,
          student: alumnoNombre,
        },
        fuelData: {
          ...initialState.fuelData,
          ...fuelDataFromLS,
          flowKg: fuelDataFromLS.flowGal && ac?.fuel_lb_gal 
                  ? (parseFloat(fuelDataFromLS.flowGal) * ac.fuel_lb_gal * 0.453592).toFixed(1)
                  : burnKgHr,
        },
        timesData: ls ? {
          tod: ls.tod_min || '',
          ld:  ls.ld_min  || '',
          etd: ls.etd     || '',
          atd: ls.atd     || '',
          eta: ls.eta     || '',
          ata: ls.ata     || '',
          eet: (ls.eet && typeof ls.eet === 'object') 
               ? `${String(ls.eet.hours || 0).padStart(2, '0')}:${String(ls.eet.minutes || 0).padStart(2, '0')}`
               : (ls.eet || ''),
          total: '',
        } : initialState.timesData,
        opsData: {
          ...initialState.opsData,
          ...(ls?.ops_data || {})
        },
        depAtis: ls?.dep_atis || '',
        arrAtis: ls?.arr_atis || '',
        notes:   ls?.notas    || '',
        wbInputs,
        navRows: navRowsFromWP,
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

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

// ── Context / Provider ────────────────────────────────────────────────────────

const LoadSheetContext = createContext()

export function LoadSheetProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (!state.id_vuelo) return

    const token = state.jwtToken || localStorage.getItem('token')

    if (!token) {
      dispatch({ type: 'SET_LOAD_ERROR', payload: 'No hay sesión activa. Ingresá desde el sistema.' })
      return
    }

    const baseUrl = import.meta.env.VITE_API_URL ?? ''

    fetch(`${baseUrl}/api/alumno/vuelos/${state.id_vuelo}/weight-balance`, {
      headers: { 'Authorization': `Bearer ${token}` },
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
            vueloInfo:       data.vuelo            ?? null,
            savedWB:         data.wb               ?? null,
            savedLoadsheet:  data.savedLoadsheet  ?? null,
            savedWaypoints:  data.savedWaypoints  ?? [],
            loadsheetEstado: data.loadsheetEstado ?? null,
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