// client/src/App.js
// DEBUGGING VERSION - Prevents app reset on error

import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

// The backend URL will be read from an environment variable in production,
// otherwise it will default to our local server for development.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8888';

function App() {
  // State for authentication & data
  const [accessToken, setAccessToken] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedPlaylistName, setSelectedPlaylistName] = useState('');

  // State for UI control
  const [appState, setAppState] = useState('login'); 
  const [loadingMessage, setLoadingMessage] = useState('');

  // --- Effects ---

  // On mount, check for access token in URL
  useEffect(() => {
    const hash = window.location.hash
      .substring(1)
      .split('&')
      .reduce((initial, item) => {
        if (item) {
          var parts = item.split('=');
          initial[parts[0]] = decodeURIComponent(parts[1]);
        }
        return initial;
      }, {});
    
    window.location.hash = '';

    if (hash.access_token) {
      setAccessToken(hash.access_token);
      setAppState('playlists');
    }
  }, []);

  // Fetch playlists
  useEffect(() => {
    if (appState !== 'playlists' || !accessToken) return;

    const fetchPlaylists = async () => {
      setLoadingMessage('Loading your playlists...');
      try {
        const response = await axios.get(`${API_BASE_URL}/api/playlists`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        setPlaylists(response.data.items);
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
      setLoadingMessage('');
    };

    fetchPlaylists();
  }, [appState, accessToken]);


  // --- Handlers ---

  const handlePlaylistClick = async (playlist) => {
    if (!accessToken) return;

    setAppState('analyzing');
    setSelectedPlaylistName(playlist.name);
    setLoadingMessage(`Casting the vibe for "${playlist.name}"...`);
    
    try {
        const response = await axios.get(`${API_BASE_URL}/api/playlist/${playlist.id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        setAnalysisData(response.data);
        setAppState('results'); 
    } catch (error) {
        console.error("Error analyzing playlist:", error);
        setAppState('playlists');
    }
    setLoadingMessage('');
  };

  const handleAnalyzeAnother = () => {
      setAnalysisData(null);
      setAppState('playlists');
  }

  // --- Render Logic ---

  const renderContent = () => {
    switch (appState) {
      case 'playlists':
        return (
          <div className="playlists-container">
            <h2>Choose a Playlist to Analyze</h2>
            {loadingMessage ? <p>{loadingMessage}</p> : (
              <div className="playlists-grid">
                {playlists.map((playlist) => (
                  <div key={playlist.id} className="playlist-item" onClick={() => handlePlaylistClick(playlist)}>
                    {playlist.images?.[0] ? (
                      <img src={playlist.images[0].url} alt={`${playlist.name} cover`} />
                    ) : (
                      <div className="playlist-placeholder-image">♫</div>
                    )}
                    <h3>{playlist.name}</h3>
                    <p>{playlist.tracks.total} tracks</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'analyzing':
        return (
          <div className="analyzing-container">
            <div className="spinner"></div>
            <p className="loading-text">{loadingMessage}</p>
            {/* Added a cancel button in case it freezes */}
            <button className="spotify-button" style={{marginTop: '20px', background: '#444'}} onClick={() => setAppState('playlists')}>Cancel / Go Back</button>
          </div>
        );
      
      case 'results':
          if (!analysisData) return <p>No analysis data available.</p>;
          return (
              <div className="results-container">
                  <h2>The VibeCast for "{selectedPlaylistName}" is...</h2>
                  <div className="mood-display">
                    <p className="primary-mood">{analysisData.primaryMood}</p>
                    <div className="tags-container">
                        {analysisData.tags && analysisData.tags.map(tag => <span key={tag} className="mood-tag">{tag}</span>)}
                    </div>
                  </div>

                  {analysisData.recommendedSong && (
                    <div className="recommendation-container">
                        <h3>Vibe-Matched Song</h3>
                        <div className="song-card">
                            <img src={analysisData.recommendedSong.coverArt || 'https://placehold.co/150x150/181818/b3b3b3?text=?'} alt="Recommended song cover" />
                            <div className="song-details">
                                <p className="song-name">{analysisData.recommendedSong.name}</p>
                                <p className="song-artist">{analysisData.recommendedSong.artist}</p>
                                <p className="song-reason">"{analysisData.recommendedSong.reason}"</p>
                            </div>
                        </div>
                    </div>
                  )}

                  <div className="suggestions-container">
                      <h3>Activity Suggestions</h3>
                      <ul>
                          {analysisData.activitySuggestions && analysisData.activitySuggestions.map(activity => (
                              <li key={activity} className="suggestion-item">{activity}</li>
                          ))}
                      </ul>
                  </div>

                  <button className="spotify-button" onClick={handleAnalyzeAnother}>Analyze Another</button>
              </div>
          );

      default: // 'login' state
        return (
          <div className="login-container">
            <h1 className="login-title">VibeCast</h1>
            <p className="login-tagline">Smart Music Recommender by Joshua Veasy.</p>
            <a className="spotify-button" href={`${API_BASE_URL}/api/auth/login`}>
              ♫ Connect with Spotify
            </a>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        {appState !== 'login' && <h1 className="main-title">VibeCast</h1>}
        {renderContent()}
      </header>
    </div>
  );
}

export default App;