// Vercel 서버 함수: 배포 후에도 인증키를 서버(환경변수 KMA_SERVICE_KEY)에만 둬요.
const KMA_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst'
const ALLOWED = ['numOfRows', 'pageNo', 'dataType', 'base_date', 'base_time', 'nx', 'ny']

export default async function handler(req, res) {
  const raw = (process.env.KMA_SERVICE_KEY || '').trim()
  if (!raw) {
    res.status(500).json({ error: 'KMA_SERVICE_KEY 환경변수가 없어요.' })
    return
  }

  const params = new URLSearchParams()
  for (const name of ALLOWED) {
    if (req.query[name] !== undefined) params.set(name, String(req.query[name]))
  }
  const key = encodeURIComponent(decodeURIComponent(raw))

  const upstream = await fetch(`${KMA_URL}?${params}&serviceKey=${key}`)
  const text = await upstream.text()
  res.status(upstream.status)
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
  res.send(text)
}
