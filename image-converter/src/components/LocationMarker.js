import React from 'react';
import { Marker, useMapEvents } from 'react-leaflet';
import { FaMapMarkerAlt } from 'react-icons/fa';
import L from 'leaflet';
import ReactDOMServer from 'react-dom/server';

const LocationMarker = ({ location, setLocation }) => {
  useMapEvents({
    click(e) {
      setLocation(e.latlng);
    },
  });

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

  return location ? (
    <Marker 
      position={location} 
      icon={customIcon}
    />
  ) : null;
};

export default LocationMarker; 