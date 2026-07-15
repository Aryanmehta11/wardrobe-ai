// Backend base URL.
//
// "localhost" only works in a simulator/emulator running on the same machine
// as the backend. When testing on a REAL PHONE with Expo Go, replace it with
// your computer's LAN IP address, e.g. "http://192.168.1.42:8000".
// Find your LAN IP on Windows with: ipconfig  (look for "IPv4 Address").
// Your phone and computer must be on the same Wi-Fi network.
export const BACKEND_URL = 'https://wardrobe-ai-backend-ul6t.onrender.com';

/**
 * Shared secret sent as the x-app-secret header. Must match the APP_SECRET
 * env var on the deployed backend. Leave empty for local dev (backend with
 * no APP_SECRET set accepts everything).
 */
export const APP_SECRET = 'robertlewandoskibutmessiisbetter';

/** How long to wait for the auto-tagging backend before falling back to manual tagging. */
export const TAG_TIMEOUT_MS = 20000;
