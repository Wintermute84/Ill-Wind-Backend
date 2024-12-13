// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
app.use(cors());
app.use(express.json()); 
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database('./albums.db', (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
  });

  // Function to get Spotify access token using client ID and client secret
async function getSpotifyAccessToken() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    try {
        const response = await axios.post(tokenUrl, 'grant_type=client_credentials', {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        return response.data.access_token;
    } catch (error) {
        console.error(`Error fetching Spotify token`, error);
        throw error;
    }
}


app.get('/debug-tables', (req, res) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, tables) => {
      if (err) {
        res.status(500).send({ error: err.message });
      } else {
        res.send(tables);
      }
    });
  });

  
app.get('/api/album', async (req, res) => {
  const albumId = req.query.id;

  try {
      const accessToken = await getSpotifyAccessToken();
      const response = await axios.get(`https://api.spotify.com/v1/albums/${albumId}`, {
          headers: {
              'Authorization': `Bearer ${accessToken}`
          }
      });

      res.json(response.data); // Send album data back to client
  } catch (error) {
      console.error('Error fetching album data:', error);
      // Send a JSON error response
      res.status(500).json({ error: `Error fetching album data` });
  }
});

app.get('/getalbum', (req, res) => {
    const {id,option} = req.query;
    db.get(`SELECT * FROM ${option} where id = ?`, [id], (err, row) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({
        message: "success",
        data: row
      });
    });
  });


  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


