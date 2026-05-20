const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Stub @opentelemetry/api — supabase-js tries to lazy-load it for tracing,
// but Hermes doesn't support dynamic import(). The supabase dist file has
// been patched to use require(), and this resolver makes that require() a no-op.
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@opentelemetry/api') {
    return {
      filePath: path.resolve(__dirname, 'stubs/opentelemetry-api.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
