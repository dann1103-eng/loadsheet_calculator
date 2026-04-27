
export function calcFuel({ flowGal, flowKg, taxiMin, tripMin, rarMin, alt1Min, alt2Min, reserveMin, minReqMin: manualMinReqMin, tfobGal }) {
  const fG = parseFloat(flowGal) || 0
  const fK = parseFloat(flowKg) || 0
  const txMin = parseFloat(taxiMin) || 0
  const trMin = parseFloat(tripMin) || 0
  const rrMin = parseFloat(rarMin) || 0
  const a1Min = parseFloat(alt1Min) || 0
  const a2Min = parseFloat(alt2Min) || 0
  const rsMin = parseFloat(reserveMin) || 0
  const mrMin = parseFloat(manualMinReqMin) || 0
  const tfobG = parseFloat(tfobGal) || 0

  const minToGal = (min) => fG > 0 ? (min / 60) * fG : 0
  const minToKg  = (min) => fK > 0 ? (min / 60) * fK : 0

  const taxiGal    = minToGal(txMin)
  const taxiKg     = minToKg(txMin)
  const tripGal    = minToGal(trMin)
  const tripKg     = minToKg(trMin)
  const rarGal     = minToGal(rrMin)
  const rarKg      = minToKg(rrMin)
  const alt1Gal    = minToGal(a1Min)
  const alt1Kg     = minToKg(a1Min)
  const alt2Gal    = minToGal(a2Min)
  const alt2Kg     = minToKg(a2Min)
  const reserveGal = minToGal(rsMin)
  const reserveKg  = minToKg(rsMin)

  const minReqGal = minToGal(mrMin)
  const minReqKg  = minToKg(mrMin)
  const minReqMin = mrMin

  const tfobGal_out = tfobG
  const tfobKg      = fG > 0 ? tfobG * (fK / fG) : tfobG * (fK || 0)
  const tfobMin     = fG > 0 ? (tfobG / fG) * 60 : 0

  const extraGal = tfobG - minReqGal
  const extraKg  = fG > 0 ? (extraGal / fG) * fK : 0
  const extraMin = fG > 0 ? (extraGal / fG) * 60 : 0

  return {
    taxiGal, taxiKg,
    tripGal, tripKg,
    rarGal, rarKg, rarMin: rrMin,
    alt1Gal, alt1Kg,
    alt2Gal, alt2Kg,
    reserveGal, reserveKg, reserveMin: rsMin,
    minReqGal, minReqKg, minReqMin,
    extraGal, extraKg, extraMin,
    tfobGal: tfobGal_out, tfobKg, tfobMin,
    rar: rarGal, reserve: reserveGal, minReq: minReqGal, extra: extraGal,
  }
}
