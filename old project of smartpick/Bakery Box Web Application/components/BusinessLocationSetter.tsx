import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import { Input } from "./Input";
import { Button } from "./Button";
import { Search, MapPin, Save, Loader2 } from "lucide-react";
import styles from "./BusinessLocationSetter.module.css";
import "leaflet/dist/leaflet.css";
import { useUpdateBusinessLocationMutation } from "../helpers/useFoodWasteQueries";

// Fix for default Leaflet icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface BusinessLocationSetterProps {
  businessId: number;
  currentLat?: number | string | null;
  currentLng?: number | string | null;
  currentAddress?: string | null;
  onLocationSaved?: () => void;
  className?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const MapController: React.FC<{ center: LatLngExpression }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15, { animate: true });
  }, [center, map]);
  return null;
};

const DraggableMarker: React.FC<{
  position: LatLngExpression;
  setPosition: (pos: LatLngExpression) => void;
  setAddress: (address: string) => void;
}> = ({ position, setPosition, setAddress }) => {
  const markerRef = useRef<L.Marker>(null);
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          setPosition([lat, lng]);
        }
      },
    }),
    [setPosition]
  );

  useEffect(() => {
    const reverseGeocode = async () => {
      if (Array.isArray(position)) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}`
          );
          const data = await response.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
        }
      }
    };
    reverseGeocode();
  }, [position, setAddress]);

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    ></Marker>
  );
};

export const BusinessLocationSetter: React.FC<BusinessLocationSetterProps> = ({
  businessId,
  currentLat,
  currentLng,
  currentAddress,
  onLocationSaved,
  className,
}) => {
  const defaultPosition: LatLngExpression = [41.7151, 44.8271]; // Tbilisi
  const initialPosition =
    currentLat && currentLng
      ? [Number(currentLat), Number(currentLng)]
      : defaultPosition;

  const [position, setPosition] = useState<LatLngExpression>(initialPosition as LatLngExpression);
  const [address, setAddress] = useState(currentAddress || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const updateLocationMutation = useUpdateBusinessLocationMutation();

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      const data: NominatimResult[] = await response.json();
      setSearchResults(data.slice(0, 5)); // Limit to 5 results
    } catch (error) {
      console.error("Geocoding search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSelectResult = (result: NominatimResult) => {
    const newPos: LatLngExpression = [Number(result.lat), Number(result.lon)];
    setPosition(newPos);
    setAddress(result.display_name);
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  const handleSaveChanges = () => {
    if (Array.isArray(position)) {
      updateLocationMutation.mutate(
        {
          businessId,
          latitude: position[0],
          longitude: position[1],
          address: address,
        },
        {
          onSuccess: () => {
            onLocationSaved?.();
          },
        }
      );
    }
  };

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <div className={styles.searchInputWrapper}>
            <Search className={styles.searchIcon} size={20} />
            <Input
              type="text"
              placeholder="Search for an address..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) setSearchResults([]);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className={styles.searchInput}
            />
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={isSearching}
              className={styles.searchButton}
            >
              {isSearching ? (
                <Loader2 className={styles.spinner} size={16} />
              ) : (
                "Search"
              )}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <ul className={styles.searchResults}>
              {searchResults.map((result) => (
                <li key={result.place_id} onClick={() => handleSelectResult(result)}>
                  <MapPin size={16} />
                  <span>{result.display_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.addressDisplay}>
          <MapPin size={18} className={styles.addressIcon} />
          <p>{address || "Drag the pin or search to set location"}</p>
        </div>
        <Button
          onClick={handleSaveChanges}
          disabled={updateLocationMutation.isPending}
          className={styles.saveButton}
        >
          {updateLocationMutation.isPending ? (
            <Loader2 className={styles.spinner} size={20} />
          ) : (
            <Save size={20} />
          )}
          Save Changes
        </Button>
      </div>
      <div className={styles.mapWrapper}>
        <MapContainer
          center={initialPosition as LatLngExpression}
          zoom={13}
          className={styles.map}
          scrollWheelZoom={true}
        >
          <MapController center={position} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DraggableMarker
            position={position}
            setPosition={setPosition}
            setAddress={setAddress}
          />
        </MapContainer>
      </div>
    </div>
  );
};