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

  return location ? (
    <Marker 
      position={location} 
      icon={L.divIcon({
        className: 'custom-icon',
        html: ReactDOMServer.renderToString(<FaMapMarkerAlt size={50} color="black" />)
      })} 
    />
  ) : null;
};

export default LocationMarker; 