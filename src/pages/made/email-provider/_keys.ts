// NOTE: this is a static demo for educational purposes only.
// In a real application, you should generate and manage your keys securely.
export const PUBLIC_KEY_JWK = {
  kty: "OKP",
  crv: "Ed25519",
  x: "bovaHIXvLOKA9ZKRpZfovzLmG-HbUFD1ec-GOjldpRs",
  kid: "demo-key-2026",
};

export const PRIVATE_KEY_JWK = {
  ...PUBLIC_KEY_JWK,
  d: "3cEjEXWv4ott4mGhyoOKLWVH_hsw7g_bYpX8whgedMQ",
};
