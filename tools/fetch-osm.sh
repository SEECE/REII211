#!/bin/sh
# Refetch the street network behind topics/manhattan. Run this by hand; the SITE never talks to
# the network (structure/PAGES.md), so the result is committed as a static asset and that asset
# is what ships.
#
#   sh tools/fetch-osm.sh
#
# The bbox is Manhattan from the Battery to Washington Heights. The highway filter is the set a
# person on foot or in a car can actually use — no footways, no service roads, no cycleways —
# because a routing lesson wants the streets, not every line OSM knows about.
#
# `out geom` is what makes the split possible: it returns each way's node IDs *and* the lat/lon
# of every one of them, so a shared ID is a real junction and the metres between two junctions
# are real metres. `out body` alone would give the IDs with no positions, and `out skel` the
# positions with no IDs — either way there would be nothing to split on.
set -eu

BBOX='40.700,-74.020,40.882,-73.907'
CLASSES='motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street'
OUT="js/city/osm-manhattan.js"

query="[out:json][timeout:180];
way[\"highway\"~\"^($CLASSES)\$\"]($BBOX);
out geom;"

echo "querying overpass-api.de …"
raw=$(mktemp)
curl -sS --compressed --fail \
  -X POST -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "data=$query" \
  https://overpass-api.de/api/interpreter > "$raw"

# The payload is the response VERBATIM. It is wrapped in an assignment rather than saved as
# .json for one reason: the site must open over file://, where fetch() and XMLHttpRequest are
# both blocked by the browser, and a <script> tag is the only thing that still loads. JSON is a
# subset of JavaScript's object literal syntax, so wrapping costs the data nothing.
{
  echo '/* OpenStreetMap — Manhattan streets, © OpenStreetMap contributors, ODbL 1.0.'
  echo '   https://www.openstreetmap.org/copyright · https://opendatacommons.org/licenses/odbl/'
  echo ''
  echo "   Overpass response, verbatim. Refetch with tools/fetch-osm.sh; do not edit by hand."
  echo "   bbox $BBOX · highway in $CLASSES */"
  printf 'window.OsmManhattanRaw ='
  cat "$raw"
  echo ';'
} > "$OUT"
rm -f "$raw"

echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
