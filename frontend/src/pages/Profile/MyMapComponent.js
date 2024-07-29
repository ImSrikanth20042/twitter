import React, { useState, useEffect } from 'react';
import { LoadScript, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Box, Modal } from '@mui/material';
import { google } from 'google-geocoder';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  height: 300,
  bgcolor: 'background.paper',
  boxShadow: 24,
  borderRadius: 8,
};
const libraries = ['places']; // Include places library for searching

const MyMapComponent = () => {
  const [maps, setMap] = useState(null);
  const [weatherData, setWeatherData] = useState();
  const [center, setCenter] = useState({ lat: 40.7128, lng: -74.0059 }); // Initial center coordinates
  const [open, setOpen] = React.useState(false);
  const [location, setLocation] = useState({}); // Added state to store location

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleLoad = (mapInstance) => {
    setMap(mapInstance);
  };

  const fetchWeatherData = async (lat, lng) => {
    const apiKey = 'd8a63be92e9856c6b85717af421ab957'; // Replace with your actual API key
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

    const response = await fetch(apiUrl);
    const data = await response.json();
    return data;
  };

  function getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  function showError() {
    alert("Couldn't fetch at this time");
  }

  function showPosition(position) {
    const geocoder = new google.maps.Geocoder();
    const latlng = { lat: position.coords.latitude, lng: position.coords.longitude };
    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === "OK") {
        const addressComponents = results[0].address_components;
        const city = getAddressComponent(addressComponents, 'locality');
        const state = getAddressComponent(addressComponents, 'administrative_area_level_1');
        const country = getAddressComponent(addressComponents, 'country');
        const locationString = `${city}, ${state}, ${country}`;

        // Update the location state with extracted details
        setLocation({ city, state, country });

        setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        fetchWeatherData(position.coords.latitude, position.coords.longitude)
          .then((weatherData) => {
            // Update weather state with fetched data
            setWeatherData(weatherData);
          })
          .catch((error) => {
            console.error('Error fetching weather data:', error);
          });
      } else {
        // Handle geocoding error
      }
    });
  }

  function getAddressComponent(addressComponents, type) {
    for (const component of addressComponents) {
      if (component.types.includes(type)) {
        return component.long_name;
      }
    }
    return '';
  }

  useEffect(() => {
    getLocation();
  }, []);

  return (
    <LoadScript
      googleMapsApiKey="AIzaSyDCl54pE9PWGkFZ_QDRiJYEJruGc15FUIQ"
      libraries={libraries}
    >
      <button onClick={() => setOpen(true)} className="loc-btn">Obtain Location</button>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <div className="header">
            <IconButton onClick={() => { setOpen(false); }}><CloseIcon /></IconButton></div>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '400px' }}
            zoom={10}
            center={center}
            onLoad={handleLoad}
          >
            <Marker position={center} />
            {weatherData && (
              <InfoWindow position={center}>
                <div>
                  <h3>{weatherData.name}</h3>
                  <h2>{location.city}, {location.state}, {location.country}</h2>
                  <p>Temperature: {weatherData.main.temp}°C</p>
                  <p>Description: {weatherData.weather[0].description}</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </Box>
      </Modal>
    </LoadScript>
  );
};

export default MyMapComponent;
