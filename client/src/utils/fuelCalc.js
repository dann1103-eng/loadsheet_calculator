/**
 * calcFuel — Calcula combustible a partir de tiempos ingresados (minutos)
 * y los flujos de combustible (gal/h y KG/h).
 *
 * @param {object} params
 * @param {number} params.flowGal  - Fuel flow en US gal/h (input del usuario)
 * @param {number} params.flowKg   - Fuel flow en KG/h (input del usuario)
 * @param {number} params.taxiMin  - Tiempo de TAXI en minutos
 * @param {number} params.tripMin  - Tiempo de TRIP en minutos
 * @param {number} params.alt1Min  - Tiempo de ALT 1 en minutos
 * @param {number} params.alt2Min  - Tiempo de ALT 2 en minutos
 * @param {number} params.tfob    - Total Fuel On Board en US gal (desde W&B)
 */
export function calcFuel({ flowGal, flowKg, taxiMin, tripMin, alt1Min, alt2Min, tfob }) {
  const fG = parseFloat(flowGal) || 0
  const fK = parseFloat(flowKg) || 0
  const txMin = parseFloat(taxiMin) || 0
  const trMin = parseFloat(tripMin) || 0
  const a1Min = parseFloat(alt1Min) || 0
  const a2Min = parseFloat(alt2Min) || 0
  const tb = parseFloat(tfob) || 0

  // Convierte minutos a galones y KG usando los flujos ingresados
  const minToGal = (min) => fG > 0 ? (min / 60) * fG : 0
  const minToKg  = (min) => fK > 0 ? (min / 60) * fK : 0

  const taxiGal    = minToGal(txMin)
  const taxiKg     = minToKg(txMin)
  const tripGal    = minToGal(trMin)
  const tripKg     = minToKg(trMin)
  const alt1Gal    = minToGal(a1Min)
  const alt1Kg     = minToKg(a1Min)
  const alt2Gal    = minToGal(a2Min)
  const alt2Kg     = minToKg(a2Min)

  // R/R 5% — auto desde TRIP
  const rarGal     = tripGal * 0.05
  const rarKg      = tripKg  * 0.05
  const rarMin     = Math.round(trMin * 0.05)

  // FINAL RESERVE — 45 min fijo (0.75h)
  const reserveGal = fG * 0.75
  const reserveKg  = fK * 0.75
  const reserveMin = 45

  // MIN REQUIRED
  const minReqGal  = taxiGal + tripGal + rarGal + alt1Gal + alt2Gal + reserveGal
  const minReqKg   = taxiKg  + tripKg  + rarKg  + alt1Kg  + alt2Kg  + reserveKg

  // Densidad derivada de los flujos ingresados (KG/gal); fallback a 3.04
  const density    = fG > 0 && fK > 0 ? fK / fG : 3.04
  const tfobKg     = tb * density

  const extraGal   = tb - minReqGal
  const extraKg    = extraGal * density

  return {
    taxiGal, taxiKg,
    tripGal, tripKg,
    alt1Gal, alt1Kg,
    alt2Gal, alt2Kg,
    rarGal, rarKg, rarMin,
    reserveGal, reserveKg, reserveMin,
    minReqGal, minReqKg,
    extraGal, extraKg,
    tfobKg,
    // Aliases para compatibilidad con PrintSheet y resúmenes existentes
    rar: rarGal, reserve: reserveGal, minReq: minReqGal, extra: extraGal,
  }
}
