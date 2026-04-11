#!/bin/bash

echo "🧹 Cleaning Build Gym project..."
echo ""

# Clean Android
echo "1. Cleaning Android build..."
# Delete app/build first — a stale Android-autolinking.cmake inside it references
# codegen JNI dirs that may not exist yet, which causes 'gradlew clean' itself to
# fail at CMake configuration time.
rm -rf android/app/build
cd android
./gradlew clean
cd ..
echo "   ✅ Android cleaned"

# Clear Metro cache
echo "2. Clearing Metro bundler cache..."
npx react-native start --reset-cache &
METRO_PID=$!
sleep 3
kill $METRO_PID 2>/dev/null
echo "   ✅ Metro cache cleared"

# Clear node_modules cache
echo "3. Clearing watchman and node caches..."
watchman watch-del-all 2>/dev/null || echo "   ⚠️  Watchman not installed (optional)"
rm -rf node_modules/.cache 2>/dev/null
echo "   ✅ Caches cleared"

echo ""
echo "✅ Project cleaned successfully!"
echo ""
echo "Next steps:"
echo "1. Run: npx react-native run-android (for development)"
echo "2. Or: cd android && ./gradlew assembleRelease (for release build)"
