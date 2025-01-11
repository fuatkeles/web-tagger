import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { FaMapMarkerAlt } from 'react-icons/fa';
import L from 'leaflet';
import ReactDOMServer from 'react-dom/server';
import 'leaflet-geosearch/dist/geosearch.css';

const SearchControl = ({ setLocation }) => {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();
    let currentMarker = null;

    const customIcon = L.divIcon({
      className: 'custom-icon',
      html: ReactDOMServer.renderToString(
        <div style={{ filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.4))' }}>
          <FaMapMarkerAlt size={48} color="#000000" />
        </div>
      ),
      iconSize: [48, 48],
      iconAnchor: [24, 48],  // Center horizontally, bottom vertically
      popupAnchor: [0, -48]  // Center horizontally, above the icon
    });

    const searchControl = new GeoSearchControl({
      provider,
      style: 'bar',
      showMarker: false, // Disable default marker
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true
    });

    map.addControl(searchControl);

    // Handle search result
    map.on('geosearch/showlocation', (result) => {
      if (result && result.location) {
        // Remove previous marker if exists
        if (currentMarker) {
          map.removeLayer(currentMarker);
        }
        
        // Add new marker
        currentMarker = L.marker([result.location.y, result.location.x], {
          icon: customIcon
        }).addTo(map);

        setLocation({
          lat: result.location.y,
          lng: result.location.x
        });
      }
    });

    // Handle map click to remove search marker
    map.on('click', () => {
      if (currentMarker) {
        map.removeLayer(currentMarker);
        currentMarker = null;
      }
    });

    return () => {
      map.removeControl(searchControl);
      if (currentMarker) {
        map.removeLayer(currentMarker);
      }
    };
  }, [map, setLocation]);

  return null;
};

export default SearchControl; 