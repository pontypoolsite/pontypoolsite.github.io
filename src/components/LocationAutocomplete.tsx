import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import L, { type LatLngBoundsExpression, type LatLngExpression, type LatLngTuple } from "leaflet";
import { isPointInKenya } from "@/lib/kenya-boundary";
import "leaflet/dist/leaflet.css";
import "./LocationAutocomplete.css";

export type DeliveryPoint = {
  latitude: number;
  longitude: number;
};

type PhotonFeature = {
  properties?: {
    name?: string;
    street?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

type LocationSuggestion = {
  label: string;
  value: string;
  point: DeliveryPoint;
};

const kenyaBounds: [[number, number], [number, number]] = [[-4.9, 33.7], [5.2, 42.2]];
const mapKenyaBounds: LatLngBoundsExpression = kenyaBounds;
const kenyaBoundsQuery = "33.7,-4.9,42.2,5.2";
const kenyaCenter: LatLngTuple = [-0.0236, 37.9062];

function locationLabel(feature: PhotonFeature): string | null {
  const place = feature.properties;
  if (!place || place.countrycode?.toUpperCase() !== "KE") return null;

  const coordinates = feature.geometry?.coordinates;
  if (!coordinates || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return null;
  const [longitude, latitude] = coordinates;
  if (!isPointInKenya(latitude, longitude)) return null;

  const street = place.street;
  const locality = place.city || place.district;
  const value = [
    street || place.name,
    locality,
    place.state,
    place.country || "Kenya",
  ].filter(Boolean).filter((part, index, parts) => parts.indexOf(part) === index).join(", ");
  return value || null;
}

function toSuggestion(feature: PhotonFeature): LocationSuggestion | null {
  const value = locationLabel(feature);
  const coordinates = feature.geometry?.coordinates;
  if (!value || !coordinates) return null;

  return {
    label: value,
    value,
    point: { longitude: coordinates[0], latitude: coordinates[1] },
  };
}

const pinIcon = L.divIcon({
  className: "delivery-map-pin",
  html: "<span><i></i></span>",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapCamera({ point }: { point: DeliveryPoint | null }) {
  const map = useMap();

  useEffect(() => {
    if (point) map.flyTo([point.latitude, point.longitude], Math.max(map.getZoom(), 15), { duration: 0.65 });
  }, [map, point]);

  return null;
}

function MapInteractions({
  onPick,
}: {
  onPick: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export function LocationAutocomplete({
  value,
  point,
  onChange,
}: {
  value: string;
  point: DeliveryPoint | null;
  onChange: (value: string, point: DeliveryPoint | null) => void;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const skipSearchForValue = useRef("");

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    const search = query.trim();
    if (search && search === skipSearchForValue.current) {
      skipSearchForValue.current = "";
      setSuggestions([]);
      setLoading(false);
      return;
    }
    if (search.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    const currentRequestId = ++requestId.current;
    const timerId = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const url = new URL("https://photon.komoot.io/api/");
        url.searchParams.set("q", search);
        url.searchParams.set("limit", "8");
        url.searchParams.set("lang", "en");
        url.searchParams.set("bbox", kenyaBoundsQuery);
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Location search failed (${response.status}).`);

        const result = await response.json() as PhotonResponse;
        if (currentRequestId !== requestId.current) return;
        const uniqueSuggestions = new Map<string, LocationSuggestion>();
        for (const feature of result.features ?? []) {
          const suggestion = toSuggestion(feature);
          if (suggestion) uniqueSuggestions.set(suggestion.value, suggestion);
        }
        setSuggestions([...uniqueSuggestions.values()]);
      } catch (cause) {
        if (controller.signal.aborted || currentRequestId !== requestId.current) return;
        console.error("OpenStreetMap location search failed:", cause);
        setSuggestions([]);
        setError("Location suggestions are temporarily unavailable. Try moving the pin or search again.");
      } finally {
        if (currentRequestId === requestId.current) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setSuggestions([]);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    skipSearchForValue.current = suggestion.value;
    setQuery(suggestion.value);
    setSuggestions([]);
    setError("");
    setNotice("Pinned in Kenya. Drag the pin or tap the map to adjust it.");
    onChange(suggestion.value, suggestion.point);
  };

  const placePin = (latitude: number, longitude: number): boolean => {
    if (!isPointInKenya(latitude, longitude)) {
      setError("Choose a point within Kenya.");
      return false;
    }

    setError("");
    const label = "Pinned location";
    skipSearchForValue.current = label;
    setQuery(label);
    setSuggestions([]);
    setNotice("Pin set inside Kenya. Drag the pin or tap the map to adjust it.");
    onChange(label, { latitude, longitude });
    return true;
  };

  const markerPosition: LatLngExpression | null = point
    ? [point.latitude, point.longitude]
    : null;

  return (
    <div ref={wrapperRef} className="space-y-2">
      <div className="delivery-map-frame">
        <MapContainer
          center={point ? [point.latitude, point.longitude] : kenyaCenter}
          zoom={point ? 15 : 6}
          minZoom={5}
          maxZoom={19}
          maxBounds={mapKenyaBounds}
          maxBoundsViscosity={1}
          zoomControl={false}
          scrollWheelZoom={false}
          zoomAnimation
          className="delivery-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> | <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, HERE, Garmin, GIS community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            detectRetina
            updateWhenIdle
            updateWhenZooming={false}
            keepBuffer={2}
            maxNativeZoom={23}
          />
          <MapInteractions onPick={placePin} />
          <MapCamera point={point} />
          <ZoomControl position="bottomright" />
          {markerPosition && (
            <Marker
              position={markerPosition}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend(event) {
                  const position = event.target.getLatLng();
                  if (!placePin(position.lat, position.lng) && markerPosition) {
                    event.target.setLatLng(markerPosition);
                  }
                },
              }}
            />
          )}
        </MapContainer>
        <div className="delivery-map-search">
          <Search size={18} aria-hidden="true" />
          <input
            id="delivery-location"
            className="delivery-map-search-input"
            value={query}
            autoComplete="street-address"
            placeholder="Search a place or address"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
            aria-controls="delivery-location-suggestions"
            onChange={(event) => {
              const nextQuery = event.target.value;
              skipSearchForValue.current = "";
              setQuery(nextQuery);
              setNotice("");
              onChange(nextQuery, null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSuggestions([]);
            }}
          />
          {loading && <span className="delivery-map-search-loading" aria-label="Searching" />}
          {suggestions.length > 0 && (
            <ul
              id="delivery-location-suggestions"
              role="listbox"
              className="delivery-map-suggestions"
            >
              {suggestions.map((suggestion) => (
                <li key={`${suggestion.value}-${suggestion.point.latitude}-${suggestion.point.longitude}`}>
                  <button
                    type="button"
                    role="option"
                    className="delivery-map-suggestion"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    <span className="delivery-map-suggestion-icon"><Search size={15} /></span>
                    <span>{suggestion.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!point && (
          <div className="delivery-map-prompt">
            <span className="delivery-map-prompt-dot" />
            Search an address or tap the map
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--muted)]">
        Kenya only · Tap the map or drag the pin to adjust your location.
        Search suggestions use Photon and OpenStreetMap data; selected coordinates are checked against Kenya’s mapped boundary.
      </p>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {notice && !error && <p role="status" className="text-xs text-green-700">{notice}</p>}
      {point && (
        <p className="text-[11px] text-[var(--muted)]">
          Pin set on map.
        </p>
      )}
    </div>
  );
}

export default LocationAutocomplete;
