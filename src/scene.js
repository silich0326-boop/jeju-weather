import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// 기온(-10~40℃) → 기둥 높이(0.5~6), 색은 파랑→빨강
const tempToHeight = (t) => 0.5 + (Math.min(40, Math.max(-10, t)) + 10) / 50 * 5.5
const tempToColor = (t) => {
  const k = (Math.min(40, Math.max(-10, t)) + 10) / 50
  return new THREE.Color().setHSL((1 - k) * 0.66, 0.85, 0.5)
}

function labelSprite(text) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 96
  const g = c.getContext('2d')
  g.fillStyle = 'rgba(0,0,0,0.55)'
  g.roundRect(4, 4, 248, 88, 18)
  g.fill()
  g.fillStyle = '#fff'
  g.font = 'bold 44px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, 128, 50)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }),
  )
  sprite.scale.set(2.6, 0.98, 1)
  return sprite
}

export function createWeatherScene(container) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0e2233)
  scene.fog = new THREE.Fog(0x0e2233, 22, 48)

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(13, 10, 18)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 4, 0)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI * 0.49

  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const sun = new THREE.DirectionalLight(0xffffff, 1.4)
  sun.position.set(6, 12, 8)
  scene.add(sun)

  // 바닥(바다)과 격자, 방위 표시
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({ color: 0x1d5b82, roughness: 0.9 }),
  )
  sea.rotation.x = -Math.PI / 2
  scene.add(sea)
  const grid = new THREE.GridHelper(28, 28, 0x4fa3d1, 0x2a6f99)
  grid.position.y = 0.01
  scene.add(grid)
  const north = labelSprite('N')
  north.position.set(0, 0.8, -13)
  scene.add(north)

  // 날씨에 따라 바뀌는 부분은 한 그룹에 모아서 갱신할 때마다 새로 만들어요.
  let dynamic = new THREE.Group()
  scene.add(dynamic)
  let windVec = new THREE.Vector3(1, 0, 0)
  let windSpeed = 0
  let precip = null // { points, speed, snow }
  let streaks = null

  function clearDynamic() {
    dynamic.traverse((o) => {
      o.geometry?.dispose()
      if (o.material) {
        o.material.map?.dispose()
        o.material.dispose()
      }
    })
    scene.remove(dynamic)
    dynamic = new THREE.Group()
    scene.add(dynamic)
    precip = null
    streaks = null
  }

  function update(d) {
    clearDynamic()
    const t = d.t1h ?? 15

    // 기온 기둥
    const h = tempToHeight(t)
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, h, 40),
      new THREE.MeshStandardMaterial({ color: tempToColor(t), roughness: 0.4 }),
    )
    column.position.y = h / 2
    dynamic.add(column)
    const tl = labelSprite(`${t.toFixed(1)}℃`)
    tl.position.set(0, h + 0.9, 0)
    dynamic.add(tl)

    // 습도: 기둥 위 반투명 구름(클수록·진할수록 습함)
    const reh = (d.reh ?? 50) / 100
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(0.8 + reh * 1.8, 32, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 + reh * 0.5 }),
    )
    cloud.position.set(0, h + 3.4, 0)
    dynamic.add(cloud)
    const hl = labelSprite(`습도 ${Math.round(reh * 100)}%`)
    hl.position.set(0, h + 3.4 + 1.8 + reh * 1.8, 0)
    dynamic.add(hl)

    // 바람: 풍향(VEC)은 "바람이 불어오는 방향" → 불어가는 방향은 +180°
    // three.js: 북쪽 = -z, 동쪽 = +x
    const rad = (((d.vec ?? 0) + 180) * Math.PI) / 180
    windVec = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize()
    windSpeed = d.wsd ?? 0
    const arrow = new THREE.ArrowHelper(
      windVec, new THREE.Vector3(-windVec.x * 4, 0.6, -windVec.z * 4),
      3 + windSpeed * 0.5, 0xffd54f, 0.9, 0.6,
    )
    dynamic.add(arrow)
    const wl = labelSprite(`풍속 ${windSpeed.toFixed(1)}m/s`)
    wl.position.set(windVec.x * 5.5, 2, windVec.z * 5.5)
    dynamic.add(wl)

    // 바람 흐름선(풍속이 셀수록 빨리 흘러요)
    const n = 120
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 24
      pos[i * 3 + 1] = 0.3 + Math.random() * 7
      pos[i * 3 + 2] = (Math.random() - 0.5) * 24
    }
    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    streaks = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfe9ff, size: 0.12 }))
    dynamic.add(streaks)

    // 강수: 눈(3,7)은 느리고 하얗게, 비는 빠르고 파랗게. 양(RN1)이 많을수록 입자가 많아요.
    const snow = d.pty === 3 || d.pty === 7
    const raining = d.pty > 0 || (d.rn1 ?? 0) > 0
    if (raining) {
      const count = Math.min(900, 150 + Math.round((d.rn1 ?? 0) * 60))
      const p = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        p[i * 3] = (Math.random() - 0.5) * 22
        p[i * 3 + 1] = Math.random() * 12
        p[i * 3 + 2] = (Math.random() - 0.5) * 22
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(p, 3))
      const points = new THREE.Points(
        g, new THREE.PointsMaterial({ color: snow ? 0xffffff : 0x7ec8ff, size: snow ? 0.18 : 0.1 }),
      )
      dynamic.add(points)
      precip = { points, speed: snow ? 0.02 : 0.2 }
    }
  }

  function resize() {
    const w = container.clientWidth
    const h = container.clientHeight
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(container)
  resize()

  renderer.setAnimationLoop(() => {
    if (streaks) {
      const a = streaks.geometry.attributes.position
      const step = 0.01 + windSpeed * 0.02
      for (let i = 0; i < a.count; i++) {
        let x = a.getX(i) + windVec.x * step
        let z = a.getZ(i) + windVec.z * step
        if (x > 12 || x < -12) x = -Math.sign(x) * 12
        if (z > 12 || z < -12) z = -Math.sign(z) * 12
        a.setX(i, x)
        a.setZ(i, z)
      }
      a.needsUpdate = true
    }
    if (precip) {
      const a = precip.points.geometry.attributes.position
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) - precip.speed
        if (y < 0) y = 12
        a.setY(i, y)
      }
      a.needsUpdate = true
    }
    controls.update()
    renderer.render(scene, camera)
  })

  return { update }
}
