import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateLastFmTrack } from "./lastfm";

describe("updateLastFmTrack", () => {
  beforeEach(() => {
    // Setup the DOM elements expected by the script
    document.body.innerHTML = `
      <a id="track-url" href="#">
        <img id="track-image" src="#" alt="Cover art" />
        <div id="track-name">...</div>
        <div id="track-album">...</div>
        <div id="track-artist">...</div>
      </a>
      <div>Last.fm <span id="track-status">last played</span></div>
    `;

    // Mock global fetch
    global.fetch = vi.fn();

    // Mock console.error
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("updates DOM with fetched track data successfully", async () => {
    const mockTrackData = {
      recenttracks: {
        track: [
          {
            name: "Test Song",
            artist: { "#text": "Test Artist" },
            album: { "#text": "Test Album" },
            url: "https://last.fm/test",
            image: [
              { "#text": "small.jpg", size: "small" },
              { "#text": "medium.jpg", size: "medium" },
              { "#text": "large.jpg", size: "large" },
            ],
            "@attr": { nowplaying: "true" },
          },
        ],
      },
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockTrackData,
    } as Response);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockTrackData,
    } as Response);

    await updateLastFmTrack();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("method=user.getrecenttracks"),
    );

    const trackUrlEl = document.getElementById(
      "track-url",
    ) as HTMLAnchorElement;
    expect(trackUrlEl.href).toBe("https://last.fm/test");

    const trackImageEl = document.getElementById(
      "track-image",
    ) as HTMLImageElement;
    expect(trackImageEl.src).toContain("large.jpg");

    const trackNameEl = document.getElementById("track-name");
    expect(trackNameEl?.textContent).toBe("Test Song");

    const trackArtistEl = document.getElementById("track-artist");
    expect(trackArtistEl?.textContent).toBe("Test Artist");

    const trackAlbumEl = document.getElementById("track-album");
    expect(trackAlbumEl?.textContent).toBe("Test Album");

    const trackStatusEl = document.getElementById("track-status");
    expect(trackStatusEl?.textContent).toBe("now playing");
  });

  it("sets status to 'last played' when not nowplaying", async () => {
    const mockTrackData = {
      recenttracks: {
        track: [
          {
            name: "Old Song",
            artist: { "#text": "Old Artist" },
            album: { "#text": "Old Album" },
            url: "https://last.fm/old",
            image: [
              { "#text": "small.jpg", size: "small" },
              { "#text": "medium.jpg", size: "medium" },
              { "#text": "large.jpg", size: "large" },
            ],
            // Missing "@attr" or nowplaying is not true
          },
        ],
      },
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockTrackData,
    } as Response);

    await updateLastFmTrack();

    const trackStatusEl = document.getElementById("track-status");
    expect(trackStatusEl?.textContent).toBe("last played");
  });

  it("handles fetch errors gracefully", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await updateLastFmTrack();

    expect(console.error).toHaveBeenCalledWith(
      "Could not fetch Last.fm data:",
      expect.any(Error),
    );

    // Verify DOM wasn't changed
    const trackNameEl = document.getElementById("track-name");
    expect(trackNameEl?.textContent).toBe("...");
  });

  it("handles fetch rejection gracefully", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network Error"));

    await updateLastFmTrack();

    expect(console.error).toHaveBeenCalledWith(
      "Could not fetch Last.fm data:",
      expect.any(Error),
    );
  });
});
