import React, { useEffect, useRef } from 'react';
import { Experience } from '../types.ts';
import { TYPE_CONFIG } from '../constants.tsx';

// Declare L as a global from the script tag in index.html
declare const L: any;

interface MapViewProps {
  experiences: Experience[];
  onPinClick: (exp: Experience) => void;
}

export const MapView: React.FC<MapViewProps> = ({ experiences, onPinClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current || typeof L === 'undefined') return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([20, 0], 2);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
      markersLayerRef.current = L.featureGroup().addTo(mapRef.current);
      
      setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 100);
    }

    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
      const bounds = L.latLngBounds([]);
      let hasValidCoords = false;

      experiences.forEach((exp) => {
        if (exp.coordinates && exp.coordinates.lat !== 0) {
          const config = TYPE_CONFIG[exp.type];
          
          const icon = L.divIcon({
            className: 'custom-map-marker',
            html: `
              <div style="
                background-color: ${config?.color || '#000'}; 
                width: 24px; 
                height: 24px; 
                border-radius: 50% 50% 50% 0; 
                border: 3px solid #000000; 
                box-shadow: 3px 3px 0px 0px rgba(0,0,0,1);
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="transform: rotate(45deg); width: 12px; height: 12px; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px;">
                   📍
                </div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 24]
          });

          const marker = L.marker([exp.coordinates.lat, exp.coordinates.lng], { icon })
            .on('click', () => onPinClick(exp));
          
          markersLayerRef.current.addLayer(marker);
          bounds.extend([exp.coordinates.lat, exp.coordinates.lng]);
          hasValidCoords = true;
        }
      });

      if (hasValidCoords) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => resizeObserver.disconnect();
  }, [experiences, onPinClick]);

  return (
    <div className="w-full h-full relative bg-gray-100">
      <div ref={mapContainerRef} className="w-full h-full" />
      {experiences.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] z-10 pointer-events-none">
          <p className="bg-black text-white px-8 py-4 rounded-2xl shadow-[8px_8px_0px_0px_rgba(251,146,60,1)] text-lg font-black uppercase tracking-tighter">
            ¡No hay memorias mapeadas! 🗺️
          </p>
        </div>
      )}
    </div>
  );
};