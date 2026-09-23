import axios from 'axios'

// Determines the baseURL depending on where the code runs: server-side calls hit the
// app's own API routes directly (no browser same-origin constraint to work around),
// browser-side calls go through the relative /api path.
const getBaseURL = (): string => {
  if (typeof window === 'undefined') {
    // Running on the server (Node.js)
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api`
    return process.env.APP_API || 'http://localhost:4502/api'
  }
  // Running in the browser
  return '/api'
}

export const AxiosAPI = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
})
