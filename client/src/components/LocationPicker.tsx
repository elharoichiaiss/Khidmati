import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet's default icon issue in React
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
    initialLat?: number;
    initialLng?: number;
    onLocationSelect: (lat: number, lng: number) => void;
}

function LocationMarker({ onSelect, initialPos }: { onSelect: (lat: number, lng: number) => void, initialPos: L.LatLng | null }) {
    const [position, setPosition] = useState<L.LatLng | null>(initialPos);

    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onSelect(e.latlng.lat, e.latlng.lng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    useEffect(() => {
        if (initialPos) {
            setPosition(initialPos);
            map.flyTo(initialPos, 13);
        }
    }, [initialPos, map]);

    return position === null ? null : (
        <Marker position={position} />
    );
}

export function LocationPicker({ initialLat, initialLng, onLocationSelect }: LocationPickerProps) {
    // Default center: Morocco (approx) or initial
    const center = initialLat && initialLng ? [initialLat, initialLng] : [31.7917, -7.0926];
    const initialPos = initialLat && initialLng ? new L.LatLng(initialLat, initialLng) : null;

    return (
        <div className="h-[300px] w-full rounded-md overflow-hidden border z-0 relative">
            <MapContainer
                center={center as L.LatLngExpression}
                zoom={6}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker onSelect={onLocationSelect} initialPos={initialPos} />
            </MapContainer>
        </div>
    );
}
