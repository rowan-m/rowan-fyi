export async function updateLastFmTrack() {
  const USERNAME = "rowan_m";
  const API_KEY = "edcf3d9e6ada6d0b9f565d83c92b6724";
  const URL = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${USERNAME}&api_key=${API_KEY}&format=json&limit=1`;

  try {
    const response = await fetch(URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const recentTrack = data.recenttracks?.track?.[0];

    if (recentTrack) {
      const trackUrlEl = document.getElementById(
        "track-url",
      ) as HTMLAnchorElement;
      if (trackUrlEl) trackUrlEl.href = recentTrack.url;

      const trackImageEl = document.getElementById(
        "track-image",
      ) as HTMLImageElement;
      if (trackImageEl) trackImageEl.src = recentTrack.image[2]["#text"];

      const trackNameEl = document.getElementById("track-name");
      if (trackNameEl) trackNameEl.textContent = recentTrack.name;

      const trackAlbumEl = document.getElementById("track-album");
      if (trackAlbumEl) trackAlbumEl.textContent = recentTrack.album["#text"];

      const trackArtistEl = document.getElementById("track-artist");
      if (trackArtistEl)
        trackArtistEl.textContent = recentTrack.artist["#text"];

      const trackStatusEl = document.getElementById("track-status");
      if (trackStatusEl) {
        trackStatusEl.textContent = recentTrack["@attr"]?.nowplaying
          ? "now playing"
          : "last played";
      }
    }
  } catch (error) {
    console.error("Could not fetch Last.fm data:", error);
  }
}
