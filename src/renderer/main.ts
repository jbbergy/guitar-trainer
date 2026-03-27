import { createApp } from 'vue'
import App from './App.vue'
import './styles/theme.css'
import './styles/chord-diagram.css'

const app = createApp(App)

// Global error handler for graceful error handling
app.config.errorHandler = (err, _instance, info) => {
  console.error('Application Error:', err)
  console.error('Error Info:', info)
  // In production, you might want to send this to an error tracking service
}

app.mount('#app')
