const KG_FACTOR = 3.04

export function calcFuel({ flow, trip, taxi, alt1, alt2, tfob }) {
  const f = parseFloat(flow) || 0
  const t = parseFloat(trip) || 0
  const tx = parseFloat(taxi) || 0
  const a1 = parseFloat(alt1) || 0
  const a2 = parseFloat(alt2) || 0
  const tb = parseFloat(tfob) || 0

  const rar = t * 0.05
  const reserve = f > 0 ? f * 0.75 : 0
  const minReq = t + tx + rar + a1 + a2 + reserve
  const extra = tb - minReq

  const galToKg = (g) => g * KG_FACTOR
  const galToTime = (g) => f > 0 ? Math.round((g / f) * 60) : 0
  const fmtTime = (mins) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}:${String(m).padStart(2, '0')}`
  }

  return {
    rar, reserve, minReq, extra, tfob: tb,
    flowKgh: f * KG_FACTOR,
    taxiKg: galToKg(tx), tripKg: galToKg(t), rarKg: galToKg(rar),
    alt1Kg: galToKg(a1), alt2Kg: galToKg(a2), reserveKg: galToKg(reserve),
    minReqKg: galToKg(minReq), tfobKg: galToKg(tb), extraKg: galToKg(extra),
    taxiTime: fmtTime(galToTime(tx)), tripTime: fmtTime(galToTime(t)),
    rarTime: fmtTime(galToTime(rar)), alt1Time: fmtTime(galToTime(a1)),
    alt2Time: fmtTime(galToTime(a2)), reserveTime: fmtTime(galToTime(reserve)),
  }
}
