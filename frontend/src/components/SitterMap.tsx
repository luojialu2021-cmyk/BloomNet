import { useCallback, useEffect, useRef } from "react";
import { SitterProfile } from "../api/types";
import { DEFAULT_MAP_COORDS, formatSitterAddress, getCoordinatesForSitter } from "../utils/geo";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type SitterMapProps = {
  sitters: SitterProfile[];
  activeSitterId?: string | null;
  onMarkerHover?: (id: string | null) => void;
  onMarkerSelect?: (id: string) => void;
};

export default function SitterMap({ sitters, activeSitterId = null, onMarkerHover, onMarkerSelect }: SitterMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const markerIconCache = useRef<Map<string, L.DivIcon>>(new Map());
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const indexLookupRef = useRef<Map<string, number>>(new Map());
  const activeSitterIdRef = useRef<string | null>(null);

  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
  }, []);

  const getMarkerIcon = useCallback((isActive: boolean) => {
    const key = isActive ? "active" : "default";
    const cached = markerIconCache.current.get(key);
    if (cached) {
      return cached;
    }

    const size = isActive ? 52 : 44;
    const height = isActive ? 68 : 56;

    const icon = L.divIcon({
      html: `<div class="sitter-map-marker${isActive ? " sitter-map-marker--active" : ""}"><span>🌿</span></div>`,
      className: "",
      iconSize: [size, height],
      iconAnchor: [size / 2, height],
      popupAnchor: [0, -(height - 20)],
    });
    markerIconCache.current.set(key, icon);
    return icon;
  }, []);

  const updateMarkerStyles = useCallback((activeId: string | null) => {
    markersRef.current.forEach((marker, sitterId) => {
      const index = indexLookupRef.current.get(sitterId) ?? 0;
      const isActive = activeId === sitterId;
      marker.setIcon(getMarkerIcon(isActive));
      marker.setZIndexOffset(isActive ? 1000 : index);
    });
  }, [getMarkerIcon]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView(
        [DEFAULT_MAP_COORDS.lat, DEFAULT_MAP_COORDS.lng],
        12
      );

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(mapRef.current);
      mapRef.current.zoomControl.setPosition("topright");
      mapRef.current.getContainer().classList.add("sitter-map-container");

      window.setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }

    if (!markerLayerRef.current) {
      markerLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    const containerEl = containerRef.current;
    const markersMap = markersRef.current;
    const indexMap = indexLookupRef.current;

    return () => {
      mapRef.current?.remove();
      if (containerEl) {
        containerEl.classList.remove("sitter-map-container");
      }
      mapRef.current = null;
      markerLayerRef.current = null;
      markersMap.clear();
      indexMap.clear();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current) {
      return;
    }

    const markerLayer = markerLayerRef.current;
    markerLayer.clearLayers();
    markersRef.current.clear();
    indexLookupRef.current.clear();
    const bounds: [number, number][] = [];

    sitters.forEach((sitter, index) => {
      const coords = getCoordinatesForSitter(sitter);
      if (!coords) {
        return;
      }

      const sitterId = sitter.id || (sitter as any)._id;
      const marker = L.marker([coords.lat, coords.lng], {
        title: sitter.name,
        icon: getMarkerIcon(false),
        riseOnHover: true,
        zIndexOffset: index,
      });

      marker.bindPopup(
        `<div style="font-size: 14px;">
          <strong>${sitter.name}</strong><br/>
          ${formatSitterAddress(sitter)}<br/>
          $${sitter.price_per_visit.toFixed(2)} per visit
        </div>`
      );

      if (onMarkerHover) {
        marker.on("mouseover", () => onMarkerHover(sitterId));
        marker.on("mouseout", () => onMarkerHover(null));
      }
      if (onMarkerSelect) {
        marker.on("click", () => onMarkerSelect(sitterId));
        marker.on("popupopen", () => onMarkerSelect(sitterId));
      }

      marker.addTo(markerLayer);
      markersRef.current.set(sitterId, marker);
      indexLookupRef.current.set(sitterId, index);
      bounds.push([coords.lat, coords.lng]);
    });

    if (bounds.length) {
      mapRef.current.fitBounds(bounds, { padding: [32, 32] });
    } else {
      mapRef.current.setView([DEFAULT_MAP_COORDS.lat, DEFAULT_MAP_COORDS.lng], 12);
    }
    updateMarkerStyles(activeSitterIdRef.current);
  }, [sitters, onMarkerHover, getMarkerIcon, updateMarkerStyles]);

  useEffect(() => {
    activeSitterIdRef.current = activeSitterId;
    updateMarkerStyles(activeSitterId);
  }, [activeSitterId, updateMarkerStyles]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
