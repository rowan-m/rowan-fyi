## 2025-03-14 - Fix Hardcoded API Key

**Vulnerability:** A hardcoded Last.fm API key (`edcf3d9e6ada6d0b9f565d83c92b6724`) was found in `src/components/LastFmTrack.astro`.
**Learning:** Hardcoding secrets or API keys in Astro client-side scripts exposes them to attackers via version control and the built files (though public keys are exposed client-side anyway, placing them in source control creates a static, unrotatable risk and pollutes the repository with credentials).
**Prevention:** Use environment variables (like `import.meta.env.PUBLIC_LASTFM_API_KEY`) for public-facing tokens and securely inject them at build time to prevent hardcoding them in the source. Ensure `.env` is ignored by version control.
