import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Loader2, MapPin, Navigation } from "lucide-react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectLocation: (location: { lat: number; lng: number }) => void;
}

// Component to track map movement and update parent state
function MapController({
    onMove,
    initialCenter
}: {
    onMove: (center: L.LatLng) => void,
    initialCenter: L.LatLng
}) {
    const map = useMap();
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            map.setView(initialCenter, 15);
            isFirstRun.current = false;
        }
    }, [initialCenter, map]);

    useMapEvents({
        moveend: () => {
            onMove(map.getCenter());
        },
        dragend: () => {
            onMove(map.getCenter());
        },
        zoomend: () => {
            onMove(map.getCenter());
        }
    });

    return null;
}

export function LocationPickerDialog({ open, onOpenChange, onSelectLocation }: LocationPickerDialogProps) {
    const { t } = useLanguage();
    const [center, setCenter] = useState<L.LatLng | null>(null);
    const [address, setAddress] = useState<string>("");
    const [isGettingLocation, setIsGettingLocation] = useState(true);
    const [loadingAddress, setLoadingAddress] = useState(false);

    // Initialize with a default, but try to fetch real location
    useEffect(() => {
        if (open) {
            setIsGettingLocation(true);
            setCenter(null); // Reset
            setAddress("");

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const newCenter = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
                        setCenter(newCenter);
                        setIsGettingLocation(false);
                        fetchAddress(newCenter);
                    },
                    (err) => {
                        console.error("GPS Error", err);
                        const defaultCenter = new L.LatLng(34.020882, -6.841650);
                        setCenter(defaultCenter);
                        setIsGettingLocation(false);
                        fetchAddress(defaultCenter);
                        toast({ title: t("couldNotAutoLocate"), description: t("pinManually") });
                    },
                    { enableHighAccuracy: true, timeout: 5000 }
                );
            } else {
                const defaultCenter = new L.LatLng(34.020882, -6.841650);
                setCenter(defaultCenter);
                setIsGettingLocation(false);
                fetchAddress(defaultCenter);
            }
        }
    }, [open]);

    // Reverse Geocoding
    const fetchAddress = useCallback(async (latlng: L.LatLng) => {
        setLoadingAddress(true);
        try {
            // Using OpenStreetMap Nominatim API (Free, handle with care)
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`, {
                headers: {
                    'User-Agent': 'Khidmati-App/1.0'
                }
            });
            const data = await response.json();
            if (data && data.display_name) {
                // Shorten the address for display
                const parts = data.display_name.split(',').slice(0, 3).join(',');
                setAddress(parts);
            } else {
                setAddress("Unknown Location");
            }
        } catch (error) {
            setAddress(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
        } finally {
            setLoadingAddress(false);
        }
    }, []);

    // Debounce address fetching on move
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const handleMapMove = (newCenter: L.LatLng) => {
        setCenter(newCenter);
        setAddress("Moving...");

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            fetchAddress(newCenter);
        }, 800); // Wait 800ms after move stops
    };

    const handleConfirm = () => {
        if (center) {
            onSelectLocation({ lat: center.lat, lng: center.lng });
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[100dvh] sm:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-0 sm:border rounded-none sm:rounded-lg">
                <DialogHeader className="p-4 bg-background z-20 border-b shadow-sm shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        {t("pinYourLocation")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("moveMapToAlignPin")}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 relative w-full bg-slate-100 overflow-hidden">
                    {isGettingLocation ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-background/80 backdrop-blur-sm">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-2" />
                            <p className="text-sm text-muted-foreground font-medium">{t("acquiringGps")}</p>
                        </div>
                    ) : center && (
                        <MapContainer
                            center={center}
                            zoom={15}
                            scrollWheelZoom={true}
                            className="w-full h-full z-0"
                            zoomControl={false}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapController initialCenter={center} onMove={handleMapMove} />
                        </MapContainer>
                    )}

                    {/* Fixed Center Pin */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none pb-[40px] drop-shadow-xl">
                        <div className="relative">
                            <MapPin className="w-10 h-10 text-primary fill-primary" />
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/20 rounded-full blur-[2px]" />
                        </div>
                    </div>

                    {/* Address Card */}
                    <div className="absolute bottom-4 left-4 right-4 z-10">
                        <div className="bg-background/95 backdrop-blur shadow-lg border rounded-xl p-4 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-0.5">{t("selectedLocation")}</p>
                                <div className="flex items-center gap-2">
                                    {loadingAddress ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3.5 h-3.5 text-primary shrink-0" />}
                                    <p className="text-sm font-medium truncate leading-tight">
                                        {address || t("loadingAddress")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-background shrink-0 flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                        {t("cancel")}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isGettingLocation || !center}
                        className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-white shadow-md transition-all active:scale-95"
                    >
                        {t("confirmLocation")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
