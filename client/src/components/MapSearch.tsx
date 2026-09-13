import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Link } from "wouter";
import { Button } from "@heroui/react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";

// Fix Leaflet's default icon issue
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom pulsing cyan dot icon for the user's current location
const userLocationIcon = L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
        <div style="position: absolute; width: 24px; height: 24px; background-color: #00bcd4; border-radius: 50%; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 14px; height: 14px; background-color: #0097a7; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
      </div>
      <style>
        @keyframes ping {
          75%, 100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      </style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

interface Provider {
    id: number;
    latitude?: number | null;
    longitude?: number | null;
    bio?: string | null;
    fullName?: string | null;
    username?: string | null;
    profile?: {
        latitude?: number | null;
        longitude?: number | null;
        bio?: string | null;
    } | null;
    user?: {
        fullName: string;
        username: string;
    };
}

interface MapSearchProps {
    providers: Provider[];
}

// Component to adjust map bounds based on markers
function MapBounds({ providers, userLocation }: { providers: Provider[]; userLocation: [number, number] | null }) {
    const map = useMap();

    useEffect(() => {
        const markers: [number, number][] = [];
        
        // Add provider markers
        providers.forEach(p => {
            const lat = p.profile?.latitude ?? p.latitude;
            const lng = p.profile?.longitude ?? p.longitude;
            if (lat && lng) {
                markers.push([lat, lng]);
            }
        });
            
        // Add user marker
        if (userLocation) {
            markers.push(userLocation);
        }

        if (markers.length > 0) {
            const bounds = L.latLngBounds(markers);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [providers, userLocation, map]);

    return null;
}

// Button to center on user's location
function MyLocationControl({ userLocation }: { userLocation: [number, number] | null }) {
    const map = useMap();
    const { language } = useLanguage();
    
    if (!userLocation) return null;

    return (
        <div className="absolute bottom-5 right-5 z-[1000]">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    map.setView(userLocation, 14, { animate: true });
                }}
                className="w-10 h-10 bg-white hover:bg-gray-100 flex items-center justify-center rounded-xl shadow-lg border border-gray-200 transition-all pointer-events-auto"
                title={language === "ar" ? "موقعي الحالي" : language === "fr" ? "Ma position actuelle" : "My current location"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="3"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                </svg>
            </button>
        </div>
    );
}

export function MapSearch({ providers }: MapSearchProps) {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    // Default center: Morocco
    const defaultCenter: [number, number] = [31.7917, -7.0926];

    const validProviders = providers.filter(p => {
        const lat = p.profile?.latitude ?? p.latitude;
        const lng = p.profile?.longitude ?? p.longitude;
        return lat && lng;
    });

    useEffect(() => {
        // 1. Try to get live geolocation from browser
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                },
                (error) => {
                    console.log("Error getting live location:", error);
                    // 2. Fallback: Check if logged-in user has saved coordinates
                    if (user?.latitude && user?.longitude) {
                        setUserLocation([user.latitude, user.longitude]);
                    }
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else if (user?.latitude && user?.longitude) {
            setUserLocation([user.latitude, user.longitude]);
        }
    }, [user]);

    return (
        <div className="h-full w-full rounded-xl overflow-hidden border shadow-sm z-0 relative">
            <MapContainer
                center={defaultCenter}
                zoom={6}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Render Providers markers */}
                {validProviders.map((provider) => {
                    const lat = provider.profile?.latitude ?? provider.latitude;
                    const lng = provider.profile?.longitude ?? provider.longitude;
                    const fullName = provider.fullName ?? provider.user?.fullName ?? "";
                    const username = provider.username ?? provider.user?.username ?? "";
                    const bio = provider.profile?.bio ?? provider.bio ?? "";

                    return (
                        <Marker
                            key={provider.id}
                            position={[lat!, lng!]}
                        >
                            <Popup>
                                <div className="min-w-[200px] font-sans">
                                    <h3 className="font-bold text-lg">{fullName}</h3>
                                    <p className="text-sm text-gray-500 mb-2">@{username}</p>
                                    <p className="text-sm line-clamp-2 mb-3">{bio || "No bio available."}</p>
                                    <Link href={`/providers/${provider.id}`}>
                                        <Button size="sm" className="w-full">
                                            {language === "ar" ? "عرض الملف الشخصي" : language === "fr" ? "Voir le profil" : "View Profile"}
                                        </Button>
                                    </Link>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Render current user's marker */}
                {userLocation && (
                    <Marker position={userLocation} icon={userLocationIcon}>
                        <Popup>
                            <div className="text-center p-1 font-sans">
                                <p className="font-bold text-cyan-600">
                                    {language === "ar" ? "موقعك الحالي" : language === "fr" ? "Votre position" : "Your Location"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {language === "ar" 
                                        ? "يتم البحث عن الخدمات القريبة منك" 
                                        : language === "fr" 
                                        ? "Recherche de services à proximité" 
                                        : "Searching for services near you"}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                <MapBounds providers={validProviders} userLocation={userLocation} />
                <MyLocationControl userLocation={userLocation} />
            </MapContainer>
        </div>
    );
}
