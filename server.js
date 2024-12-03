const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();
const port = 3000;

// Use body-parser to parse JSON bodies
app.use(bodyParser.json());

// MongoDB connection URI (replace with your MongoDB URI if using Atlas)
const mongoURI = 'mongodb://localhost:27017/school_management';

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log('Error connecting to MongoDB:', err));

// Define the School Schema and Model
const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true }
});

const School = mongoose.model('School', schoolSchema);

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Add School API
app.post('/addSchool', async (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  // Log the request body to inspect the data
  console.log('Request Body:', req.body);

  // Validate input
  if (!name || !address || !latitude || !longitude) {
    // Improved error message with which field is missing
    return res.status(400).json({
      message: 'All fields are required',
      missingFields: {
        name: !name,
        address: !address,
        latitude: !latitude,
        longitude: !longitude
      }
    });
  }

  // Check if latitude and longitude are valid numbers
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      message: 'Latitude and longitude must be valid numbers',
      latitude,
      longitude
    });
  }

  try {
    const newSchool = new School({ name, address, latitude, longitude });
    await newSchool.save();
    res.status(201).json({ message: 'School added successfully', id: newSchool._id });
  } catch (err) {
    res.status(500).json({ message: 'Error adding school', error: err });
  }
});

// List Schools API (Sorted by Proximity)
app.get('/listSchools', async (req, res) => {
  const { latitude, longitude } = req.query;

  // Validate query parameters
  if (!latitude || !longitude) {
    return res.status(400).json({
      message: 'Latitude and longitude are required as query parameters.'
    });
  }

  // Check if latitude and longitude are valid numbers
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      message: 'Latitude and longitude must be valid numbers',
      latitude,
      longitude
    });
  }

  try {
    // Fetch all schools from the database
    const schools = await School.find();

    // Sort the schools by proximity to the user's location
    const sortedSchools = schools.map(school => {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        school.latitude,
        school.longitude
      );
      return { ...school.toObject(), distance };
    }).sort((a, b) => a.distance - b.distance); // Sort by ascending distance

    res.status(200).json(sortedSchools);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving schools', error: err });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
