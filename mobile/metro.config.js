// Metro config with web support for expo-sqlite (wasm + SharedArrayBuffer headers).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web ships a wasm binary.
config.resolver.assetExts.push('wasm');

// SharedArrayBuffer (needed by sqlite-wasm) requires cross-origin isolation.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
