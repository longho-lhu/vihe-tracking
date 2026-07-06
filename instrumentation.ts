import { mqttWorker } from './src/lib/mqtt-worker'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Starting MQTT worker...')
    await mqttWorker.initialize()
  }
}
