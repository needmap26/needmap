'use client'
import { useState, useEffect } from 'react'

export default function LocationPermissionBanner() {
  const [status, setStatus] = useState<
    'unknown' | 'granted' | 'denied' | 'prompt'
  >('unknown')

  useEffect(() => {
    if (!navigator.permissions) return
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        setStatus(result.state)
        result.onchange = () => setStatus(result.state)
      })
  }, [])

  if (status === 'granted' || status === 'unknown') return null

  if (status === 'denied') {
    return (
      <div style={{
        background: '#FCEBEB',
        border: '1px solid #F09595',
        borderRadius: '8px',
        padding: '12px 16px',
        margin: '0 0 12px',
        fontSize: '14px',
        color: '#791F1F',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>Location access is blocked.</span>
        <strong>
          Click the lock icon in your browser address bar 
          → Site settings → Location → Allow → Refresh page
        </strong>
      </div>
    )
  }

  return (
    <div style={{
      background: '#E1F5EE',
      border: '1px solid #9FE1CB',
      borderRadius: '8px',
      padding: '12px 16px',
      margin: '0 0 12px',
      fontSize: '14px',
      color: '#085041',
    }}>
      Allow location access to see needs near you and 
      get accurate volunteer matching.
    </div>
  )
}
