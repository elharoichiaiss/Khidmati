export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export const MOROCCAN_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Casablanca": { lat: 33.5731, lng: -7.5898 },
  "Rabat": { lat: 34.0209, lng: -6.8416 },
  "Marrakech": { lat: 31.6295, lng: -7.9811 },
  "Fes": { lat: 34.0181, lng: -5.0198 },
  "Tangier": { lat: 35.7673, lng: -5.7998 },
  "Agadir": { lat: 30.4278, lng: -9.5981 },
  "Meknes": { lat: 33.8935, lng: -5.5473 },
  "Oujda": { lat: 34.6814, lng: -1.9086 },
  "Kenitra": { lat: 34.2610, lng: -6.5802 },
  "Tetouan": { lat: 35.5785, lng: -5.3688 },
  "Sale": { lat: 34.0372, lng: -6.8220 },
  "El Jadida": { lat: 33.2316, lng: -8.5008 },
  "Laayoune": { lat: 27.1536, lng: -13.2033 },
  "Safi": { lat: 32.2994, lng: -9.2372 },
  "Nador": { lat: 35.1688, lng: -2.9335 },
  "Beni Mellal": { lat: 32.3387, lng: -6.3525 },
  "Essaouira": { lat: 31.5085, lng: -9.7595 },
  "Dakhla": { lat: 23.7136, lng: -15.9355 },
  "Taza": { lat: 34.2117, lng: -4.0111 },
  "Mohammedia": { lat: 33.6860, lng: -7.3829 },
  "Khouribga": { lat: 32.8860, lng: -6.9060 },
  "Settat": { lat: 33.0010, lng: -7.6200 },
  "Temara": { lat: 33.9242, lng: -6.9095 },
  "Al Hoceima": { lat: 35.2497, lng: -3.9372 },
  "Chefchaouen": { lat: 35.1688, lng: -5.2636 },
  "Guelmim": { lat: 28.9884, lng: -10.0574 },
  "Larache": { lat: 35.1937, lng: -6.1569 },
  "Ouarzazate": { lat: 30.9189, lng: -6.8934 },
  "Tiznit": { lat: 29.5833, lng: -9.5000 },
  "Errachidia": { lat: 31.9316, lng: -4.4248 },
  "Berkane": { lat: 34.9167, lng: -2.3167 },
  "Taroudant": { lat: 30.4703, lng: -8.8767 },
  "Sidi Kacem": { lat: 34.2167, lng: -5.7000 },
  "Sidi Slimane": { lat: 34.2667, lng: -5.9333 },
  "Ifrane": { lat: 33.5228, lng: -5.1108 },
  "Berrechid": { lat: 33.2667, lng: -7.5833 },
  "Azrou": { lat: 33.4333, lng: -5.2167 },
  "Khemisset": { lat: 33.8167, lng: -6.0667 },
  "Khenifra": { lat: 32.9333, lng: -5.6667 },
};
