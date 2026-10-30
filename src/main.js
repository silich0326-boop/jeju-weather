import { createWeatherScene } from './scene.js'
import { fetchNowcast, sampleData, PTY_LABEL } from './kma.js'
import { saveObservation, loadRecent, supabase } from './db.js'

const $ = (id) => document.getElementById(id)
const world = createWeatherScene($('view'))
let current = null

const say = (text) => ($('msg').textContent = text)
const fmt = (v, unit = '') => (v == null ? '-' : `${v}${unit}`)

function show(d) {
  current = d
  world.update(d)
  $('when').textContent =
    `${d.base_date.slice(0, 4)}-${d.base_date.slice(4, 6)}-${d.base_date.slice(6)} ${d.base_time.slice(0, 2)}:00 기준 · 격자 (${d.nx}, ${d.ny})`
  const rows = [
    ['기온', fmt(d.t1h, '℃')], ['습도', fmt(d.reh, '%')], ['1시간 강수량', fmt(d.rn1, 'mm')],
    ['강수형태', PTY_LABEL[d.pty] ?? d.pty], ['풍속', fmt(d.wsd, 'm/s')], ['풍향', fmt(d.vec, '°')],
  ]
  $('values').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')
  $('save').disabled = false
}

const grid = () => [Number($('nx').value), Number($('ny').value)]

async function refresh() {
  const [nx, ny] = grid()
  say('불러오는 중…')
  try {
    show(await fetchNowcast(nx, ny))
    say('')
  } catch (e) {
    say(e.message)
  }
}

async function save() {
  if (!current) return
  say('저장 중…')
  try {
    await saveObservation(current)
    say('저장했어요! (같은 시각 자료는 한 번만 저장돼요)')
    await renderRecent()
  } catch (e) {
    say(e.message)
  }
}

async function renderRecent() {
  if (!supabase) {
    $('recent').innerHTML = '<li>Supabase 설정(.env.local)이 없어요.</li>'
    return
  }
  try {
    const rows = await loadRecent()
    $('recent').innerHTML = rows.length
      ? rows
          .map((r) => {
            const t = new Date(r.observed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })
            return `<li>${t} · (${r.nx},${r.ny}) · ${r.t1h ?? '-'}℃ · ${r.reh ?? '-'}% · ${r.wsd ?? '-'}m/s</li>`
          })
          .join('')
      : '<li>아직 저장된 기록이 없어요.</li>'
  } catch (e) {
    $('recent').innerHTML = `<li>${e.message}</li>`
  }
}

$('refresh').onclick = refresh
$('sample').onclick = () => {
  const [nx, ny] = grid()
  show(sampleData(nx, ny))
  say('샘플 데이터예요. 저장하면 샘플 값이 DB에 들어가니 주의하세요.')
}
$('save').onclick = save

refresh()
renderRecent()
