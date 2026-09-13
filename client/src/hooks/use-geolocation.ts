import { useState, useEffect } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: "الموقع غير متاح في هذا المتصفح", loading: false }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        let errorMessage = "حدث خطأ في الحصول على الموقع";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "يرجى السماح بالوصول إلى الموقع";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "انتهت مهلة الحصول على الموقع";
        }
        setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return state;
}
