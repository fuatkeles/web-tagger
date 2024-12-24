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
      showMarker: true,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
      marker: {
        icon: customIcon
      }
    });

    map.addControl(searchControl);

    map.on('geosearch/showlocation', (result) => {
      if (result && result.location) {
        setLocation({
          lat: result.location.y,
          lng: result.location.x
        });
      }
    });

    return () => map.removeControl(searchControl);
  }, [map, setLocation]);

  return null;
};

export default SearchControl; 