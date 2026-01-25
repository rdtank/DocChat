import { createApp } from './app'
import { env } from './config/env'

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`🚀 DocChat backend running at http://localhost:${env.PORT}`)
  console.log(`   Health:  GET  /health`)
  console.log(`   Auth:    POST /auth/signup, POST /auth/login, GET /auth/me`)
})
