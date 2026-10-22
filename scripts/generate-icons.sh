#!/usr/bin/env bash
# Generates every app icon from the bundled capybara artwork.
# Requires ImageMagick and icnsutils.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_png="$root/apps/mobile/assets/capybara.png"
mobile_assets="$root/apps/mobile/assets"
desktop_resources="$root/apps/desktop/resources"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$desktop_resources"

# Full-bleed square icon for iOS and stores (no transparency).
convert -size 1024x1024 xc:'#EAF6FD' \
  \( "$source_png" -resize 760x760 \) -gravity center -composite \
  "$mobile_assets/icon.png"

# Foreground-only artwork for Android adaptive icons.
convert -size 1024x1024 xc:none \
  \( "$source_png" -resize 620x620 \) -gravity center -composite \
  "$mobile_assets/adaptive-icon.png"

# Splash artwork (transparent; Expo composites it on the background color).
convert -size 512x512 xc:none \
  \( "$source_png" -resize 440x440 \) -gravity center -composite \
  "$mobile_assets/splash-icon.png"

# Web favicon.
convert "$mobile_assets/icon.png" -resize 64x64 "$mobile_assets/favicon.png"

# Rounded desktop icon (macOS/Windows/Linux application icon).
convert -size 1024x1024 xc:none -fill '#EAF6FD' \
  -draw 'roundrectangle 0,0 1023,1023 230,230' "$tmp/background.png"
convert "$tmp/background.png" \
  \( "$source_png" -resize 760x760 \) -gravity center -composite \
  "$desktop_resources/icon.png"

convert "$desktop_resources/icon.png" -define icon:auto-resize=256,128,64,48,32,16 \
  "$desktop_resources/icon.ico"

for size in 16 32 48 128 256 512 1024; do
  convert "$desktop_resources/icon.png" -resize "${size}x${size}" "$tmp/icon_${size}.png"
done
png2icns "$desktop_resources/icon.icns" \
  "$tmp/icon_16.png" "$tmp/icon_32.png" "$tmp/icon_48.png" \
  "$tmp/icon_128.png" "$tmp/icon_256.png" "$tmp/icon_512.png" "$tmp/icon_1024.png"

echo "Icons written to apps/mobile/assets and apps/desktop/resources"
