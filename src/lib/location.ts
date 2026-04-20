export type UserLocation = {
  lat: number
  lng: number
  accuracy?: number
}

export const DEFAULT_LOCATION: UserLocation = {
  lat: 20.5937,   // Center of India as fallback
  lng: 78.9629,
}

export const getUserLocation = (): Promise<UserLocation> => {
  return new Promise((resolve, _) => {
    if (!navigator.geolocation) {
      resolve(DEFAULT_LOCATION)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => {
        // Don't crash — fall back to India center
        console.warn('Location permission denied:', error.message)
        resolve(DEFAULT_LOCATION)
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,  // cache for 5 mins
      }
    )
  })
}

export const watchUserLocation = (
  onUpdate: (loc: UserLocation) => void,
  onError?: () => void
): number => {
  return navigator.geolocation.watchPosition(
    (pos) => onUpdate({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    }),
    () => onError?.(),
    { enableHighAccuracy: true }
  )
}

export const stopWatching = (watchId: number) => {
  navigator.geolocation.clearWatch(watchId)
}
