#!/bin/bash
# Build script for iOS (Capacitor).
# The app loads from the Vercel server URL, but Capacitor still
# requires the webDir to exist. Create a minimal fallback page.

set -e

mkdir -p out

cat > out/index.html << 'HTML'
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Recipe Book</title></head>
<body><p>Loading...</p></body>
</html>
HTML

echo "iOS build complete — app will load from Vercel server URL."
