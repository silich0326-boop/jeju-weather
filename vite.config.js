import { defineConfig, loadEnv } from 'vite'

const KMA_PATH = '/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst'

// 개발 중에는 /api/weather 요청을 기상청 서버로 대신 보내 주고,
// 인증키(KMA_SERVICE_KEY)는 여기서만 붙여요. 브라우저로는 키가 나가지 않아요.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const raw = (env.KMA_SERVICE_KEY || '').trim()
  // Encoding 키든 Decoding 키든 같은 형태로 맞춰요.
  const key = raw ? encodeURIComponent(decodeURIComponent(raw)) : ''

  return {
    server: {
      proxy: {
        '/api/weather': {
          target: 'https://apis.data.go.kr',
          changeOrigin: true,
          rewrite: (path) => {
            const query = path.split('?')[1] || ''
            return `${KMA_PATH}?${query}&serviceKey=${key}`
          },
        },
      },
    },
  }
})
