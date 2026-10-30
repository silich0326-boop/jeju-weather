// 기상청 초단기실황조회(getUltraSrtNcst) 호출 + 파싱
// 인증키는 서버(프록시)가 붙이므로 여기에는 없어요.

const pad = (n) => String(n).padStart(2, '0')

// 초단기실황은 매시 정각 자료가 약 40분 뒤에 올라와요 → 40분 전 시각의 정시를 기준으로 삼아요.
export function latestBase(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600e3 - 40 * 60e3)
  return {
    base_date: `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}`,
    base_time: `${pad(kst.getUTCHours())}00`,
  }
}

export const PTY_LABEL = {
  0: '없음', 1: '비', 2: '비/눈', 3: '눈', 5: '빗방울', 6: '빗방울·눈날림', 7: '눈날림',
}

export async function fetchNowcast(nx, ny) {
  const { base_date, base_time } = latestBase()
  const qs = new URLSearchParams({
    numOfRows: '20', pageNo: '1', dataType: 'JSON', base_date, base_time,
    nx: String(nx), ny: String(ny),
  })
  const res = await fetch(`/api/weather?${qs}`)
  const text = await res.text()

  let json
  try {
    json = JSON.parse(text)
  } catch {
    // 인증키 오류 등은 JSON이 아니라 XML/문자열로 올 때가 있어요.
    throw new Error(`기상청 응답을 읽지 못했어요: ${text.slice(0, 120)}`)
  }
  if (json.error) throw new Error(json.error)

  const header = json.response?.header
  if (!header || header.resultCode !== '00') {
    throw new Error(`기상청 오류 ${header?.resultCode ?? ''}: ${header?.resultMsg ?? '알 수 없음'}`)
  }

  const items = json.response.body?.items?.item ?? []
  const v = {}
  for (const it of items) v[it.category] = parseFloat(it.obsrValue)
  return normalize({ nx, ny, base_date, base_time, values: v })
}

export function normalize({ nx, ny, base_date, base_time, values: v }) {
  const num = (x) => (Number.isFinite(x) ? x : null)
  return {
    nx, ny, base_date, base_time,
    t1h: num(v.T1H), reh: num(v.REH), rn1: num(v.RN1) ?? 0, wsd: num(v.WSD),
    vec: num(v.VEC), pty: num(v.PTY) ?? 0, uuu: num(v.UUU), vvv: num(v.VVV),
  }
}

// 키 없이 화면을 확인해 볼 수 있는 샘플
export function sampleData(nx, ny) {
  const { base_date, base_time } = latestBase()
  return normalize({
    nx, ny, base_date, base_time,
    values: { T1H: 18.4, REH: 72, RN1: 3.5, WSD: 6.2, VEC: 315, PTY: 1, UUU: 4.4, VVV: -4.4 },
  })
}
