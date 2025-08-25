import { createApp } from './app.js'

const PORT = process.env.PORT || 8080
const app = createApp()

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`cartracker api on ${PORT}`)
})

function shutdown () {
  console.log('Shutting down gracefully...')
  try { app.helpers.db.close() } catch (e) { console.error('DB close error', e) }
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  // shutdown();
})
