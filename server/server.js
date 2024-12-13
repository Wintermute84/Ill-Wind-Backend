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

app.get('/search', async (req, res) => {
    const { albumName, artistName, releaseYear } = req.query; // Extract album, artist, and release year from query parameters

    try {
        const albums = await searchAlbums(albumName, artistName, releaseYear); // Call the search function
        res.json(albums); // Send the found albums as a JSON response
    } catch (error) {
        console.error('Error fetching album data:', error);
        res.status(500).json({ error: 'An error occurred while fetching album data.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

function normalizeTitle(title) {
    // Remove common unwanted substrings from album titles
    return title
        .toLowerCase()
        .replace(/\(.*remaster.*\)/g, '')   // Remove "(...Remaster...)" substrings
        .replace(/\(.*deluxe.*\)/g, '')     // Remove "(...Deluxe...)" substrings
        .replace(/\(.*edition.*\)/g, '')    // Remove "(...Edition...)" substrings
        .replace(/\s+/g, ' ')               // Replace multiple spaces with a single space
        .trim();                            // Trim leading and trailing whitespace
}

async function searchAlbums(albumName, artistName, releaseYear) {
    const token = await getSpotifyAccessToken();
    
    const query = [];
    if (albumName) {
        query.push(`album:"${albumName}"`);
    }
    if (artistName) {
        query.push(`artist:"${artistName}"`);
    }
    if (releaseYear) {
        query.push(`year:${releaseYear}`);
    }

    let searchQuery = query.join(' ');
    let url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=album&limit=10`;

    try {
        let response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        let albums = response.data.albums.items;

        // Log the retrieved albums to inspect their structure
        console.log('Retrieved Albums:', albums);

        // If no albums are found, try again without the release year
        if (albums.length === 0 && releaseYear) {
            console.log('No albums found with year. Trying without year...');
            query.pop(); // Remove the release year from the query
            searchQuery = query.join(' ');
            url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=album&limit=10`;

            response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            albums = response.data.albums.items;
        }

        // Log the structure of each album's artists
        albums.forEach(album => {
            console.log('Album Name:', album.name);
            console.log('Artists:', album.artists);
        });

        // Filter out remastered editions and ensure exact matches
        

        return albums;  // Return the exact matching albums
    } catch (error) {
        console.error('Error searching for albums:', error);
        throw error;
    }
}





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


  app.post('/updateid', (req, res) => {
    const { id, spotifyid } = req.body;
    const updateQuery = `
       UPDATE essentials SET spotifyid=? WHERE id=?;
    `; 
    db.run(updateQuery, [spotifyid, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'ID updated successfully!', id: id });
    });
});

app.post('/updatealbumid', (req, res) => {
    const { id, spotifyid } = req.body;
    const updateQuery = `
       UPDATE classic1001 SET spotifyid=? WHERE id=?;
    `; 
    db.run(updateQuery, [spotifyid, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Updated', id: id });
    });
});

