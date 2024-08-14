import React, { useState, useEffect } from 'react';
import { LoadScript, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Box, Modal, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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
  const [map, setMap] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [center, setCenter] = useState({ lat: '', lng: '' }); // Initial center coordinates
  const [open, setOpen] = useState(false);
  const [locationData, setLocationData] = useState({ city: '', state: '', country: '' });
  const [locationString, setLocationString] = useState('');
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleLoad = (mapInstance) => {
    setMap(mapInstance);
  };

  useEffect(() => {
    const fetchWeatherData = async (lat, lng) => {
      const apiKey = 'd8a63be92e9856c6b85717af421ab957'; // Replace with your actual API key
      const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      const weatherDetails = {
        temperature: data.main.temp,
        description: data.weather[0].description,
        windSpeed: data.wind.speed,
        humidity: data.main.humidity,
      };

      return weatherDetails;
    };

    const fetchLocationData = async (lat, lng) => {
      const apiKey = 'AIzaSyCJ5OJwzBUMaFXx93pJgcN1T9dxUh8oUws';
      const locationURI = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetch(locationURI);
      const data = await response.json();

      const addressComponents = data.results[0].address_components;
      const city = getAddressComponent(addressComponents, 'locality');
      const state = getAddressComponent(addressComponents, 'administrative_area_level_1');
      const country = getAddressComponent(addressComponents, 'country');

      return { city, state, country };
    };

    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
      } else {
        alert("Geolocation is not supported by this browser.");
      }
    };

    const showError = () => {
      alert("Couldn't fetch at this time");
    };

    const showPosition = async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setCenter({ lat, lng });

      try {
        const weatherDetails = await fetchWeatherData(lat, lng);
        setWeatherData(weatherDetails);

        const locationDetails = await fetchLocationData(lat, lng);
        setLocationData(locationDetails);
        setLocationString(`${locationDetails.city}, ${locationDetails.state}, ${locationDetails.country}`);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    const getAddressComponent = (addressComponents, type) => {
      for (const component of addressComponents) {
        if (component.types.includes(type)) {
          return component.long_name;
        }
      }
      return '';
    };

    getLocation();
  }, []);

  return (
    <LoadScript
      googleMapsApiKey="AIzaSyCJ5OJwzBUMaFXx93pJgcN1T9dxUh8oUws"
      libraries={libraries}
    >
      <button onClick={handleOpen} className='loc-btn'>Obtain Location</button>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <div className='header'>
            <IconButton onClick={handleClose}><CloseIcon /></IconButton>
            <h2 className='header-title'>Location</h2>
            <h2 className='save-btn'></h2>
          </div>
          <div id='location-display'>{locationString}</div> 
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
                  <p>Temperature: {weatherData.temperature}°C</p>
                  <p>Description: {weatherData.description}</p>
                  <p>Wind Speed: {weatherData.windSpeed} m/s</p>
                  <p>Humidity: {weatherData.humidity}%</p>
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
