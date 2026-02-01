import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

// Fix Leaflet's default icon issue
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Provider {
    id: number;
    latitude?: number | null;
    longitude?: number | null;
    bio?: string | null;
    user: {
        fullName: string;
        username: string;
    };
}

interface MapSearchProps {
    providers: Provider[];
}

// Component to adjust map bounds based on markers
function MapBounds({ providers }: { providers: Provider[] }) {
    const map = useMap();

    useEffect(() => {
        if (providers.length > 0) {
            const markers = providers
                .filter(p => p.latitude && p.longitude)
                .map(p => [p.latitude!, p.longitude!] as [number, number]);

            if (markers.length > 0) {
                const bounds = L.latLngBounds(markers);
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [providers, map]);

    return null;
}

export function MapSearch({ providers }: MapSearchProps) {
    // Default center: Morocco
    const defaultCenter: [number, number] = [31.7917, -7.0926];

    const validProviders = providers.filter(p => p.latitude && p.longitude);

    return (
        <div className="h-[calc(100vh-200px)] w-full rounded-xl overflow-hidden border shadow-sm z-0 relative">
            <MapContainer
                center={defaultCenter}
                zoom={6}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {validProviders.map((provider) => (
                    <Marker
                        key={provider.id}
                        position={[provider.latitude!, provider.longitude!]}
                    >
                        <Popup>
                            <div className="min-w-[200px]">
                                <h3 className="font-bold text-lg">{provider.user.fullName}</h3>
                                <p className="text-sm text-gray-500 mb-2">@{provider.user.username}</p>
                                <p className="text-sm line-clamp-2 mb-3">{provider.bio || "No bio available."}</p>
                                <Link href={`/providers/${provider.id}`}>
                                    <Button size="sm" className="w-full">View Profile</Button>
                                </Link>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                <MapBounds providers={validProviders} />
            </MapContainer>
        </div>
    );
}
