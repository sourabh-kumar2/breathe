#!/usr/bin/env bash
# OpenAQ v3 adapter — fetches AQI data for CITIES and writes DATA_OUT
set -euo pipefail

: "${OPENAQ_API_KEY:?OPENAQ_API_KEY secret is required}"
CITIES="${CITIES:-Delhi,Mumbai,Bangalore,Chennai,Kolkata}"
DATA_OUT="${DATA_OUT:-data/aqi.json}"
BASE="https://api.openaq.org/v3"

curl_aq() {
  curl -sf --max-time 30 \
    -H "X-API-Key: $OPENAQ_API_KEY" \
    -H "Accept: application/json" \
    "$@"
}

# US EPA PM2.5 → AQI linear interpolation
pm25_to_aqi() {
  jq -rn --argjson p "${1:-0}" '
    [ [0,12.0,0,50], [12.1,35.4,51,100], [35.5,55.4,101,150],
      [55.5,150.4,151,200], [150.5,250.4,201,300],
      [250.5,350.4,301,400], [350.5,500.4,401,500] ] |
    first(
      .[] | select(.[0] <= $p and $p <= .[1]) |
      ((.[3]-.[2]) / (.[1]-.[0]) * ($p - .[0]) + .[2]) | round
    ) // 500'
}

aqi_category() {
  local n=$1
  if   [[ $n -le  50 ]]; then echo "Good"
  elif [[ $n -le 100 ]]; then echo "Moderate"
  elif [[ $n -le 150 ]]; then echo "Unhealthy for Sensitive Groups"
  elif [[ $n -le 200 ]]; then echo "Unhealthy"
  elif [[ $n -le 300 ]]; then echo "Very Unhealthy"
  else                        echo "Hazardous"
  fi
}

fetch_city() {
  local city="$1"
  local enc
  enc=$(python3 -c "from urllib.parse import quote; print(quote('$city'))")
  local since
  since=$(date -u -d '25 hours ago' '+%Y-%m-%dT%H:%M:%SZ')

  echo "  → locations" >&2
  local locs
  locs=$(curl_aq "${BASE}/locations?city=${enc}&country_id=IN&limit=20")

  local location_ids
  location_ids=$(echo "$locs" | jq -r '[.results[].id] | join(",")' 2>/dev/null || true)

  if [[ -z "$location_ids" || "$location_ids" == "null" ]]; then
    echo "  no locations found for $city, skipping" >&2
    jq -n --arg city "$city" \
      '{name:$city,country:"IN",aqi:0,category:"Unknown",pollutants:{},stations:[],_pm25:0}'
    return
  fi

  # Build repeated location_id query params (OpenAQ v3 style)
  local id_params=""
  IFS=',' read -ra ids <<< "$location_ids"
  for id in "${ids[@]}"; do
    id_params+="&location_id=${id}"
  done

  echo "  → measurements (${#ids[@]} stations)" >&2
  local meas
  meas=$(curl_aq "${BASE}/measurements?date_from=${since}&limit=5000${id_params}")

  jq -n \
    --arg city "$city" \
    --argjson locs "$locs" \
    --argjson meas "$meas" \
    '
    ($locs.results // []) as $locations |

    # Normalize measurements: unify field names across API versions
    (($meas.results // []) | map(
      . + {
        _locId: ((.locationId // .locationsId // .location_id // 0) | tostring),
        _locName: (.location // .locationName // "Unknown"),
        _param: (
          if .parameter | type == "object"
          then .parameter.name
          else .parameter
          end | ascii_downcase | gsub("[^a-z0-9]"; "")
        ),
        _lat: (.coordinates.latitude // 0),
        _lon: (.coordinates.longitude // 0)
      }
    )) as $readings |

    # Location metadata from the locations response
    ($locations | map({
      key: (.id | tostring),
      value: {name:.name, lat:(.coordinates.latitude // 0), lon:(.coordinates.longitude // 0)}
    }) | from_entries) as $meta |

    # Latest reading per (location, parameter)
    ($readings | group_by(._locId) | map(
      {
        locId: .[0]._locId,
        byParam: (
          group_by(._param) | map({
            key: .[0]._param,
            value: (sort_by(.date.utc) | last | {value:.value, unit:.unit})
          }) | from_entries
        )
      }
    )) as $latest |

    # Stations with PM2.5
    ($latest | map({
      name: ($meta[.locId].name // "Unknown"),
      lat:  ($meta[.locId].lat  // 0),
      lon:  ($meta[.locId].lon  // 0),
      pm25: (.byParam.pm25.value // null)
    }) | map(select(.pm25 != null)) | sort_by(-.pm25)) as $stations |

    # Per-pollutant averages + 24hr hourly trend
    (["pm25","pm10","no2","o3","co","so2"] | map(. as $p | {
      key: $p,
      value: (
        ($readings | map(select(._param == $p))) as $pr |
        if ($pr | length) == 0 then null
        else (
          ($pr | map(.value) | add / length * 10 | round / 10) as $avg |
          ($pr | group_by(.date.utc[0:13]) | sort_by(.[0].date.utc) | .[-24:] |
            map(map(.value) | add / length * 10 | round / 10)) as $trend |
          ($pr | [.[].unit] | map(select(. != null)) | first // "µg/m³") as $unit |
          {value: $avg, unit: $unit, trend: $trend}
        ) end
      )
    }) | map(select(.value != null)) | from_entries) as $pollutants |

    # City-level PM2.5 average for AQI calculation
    ($readings | map(select(._param == "pm25") | .value) |
      if length > 0 then add / length else 0 end) as $pm25avg |

    {name:$city, country:"IN", pollutants:$pollutants, stations:$stations, _pm25:$pm25avg}
    '
}

# ── Main ──────────────────────────────────────────────────────────────────────
cities_json="[]"
IFS=',' read -ra city_list <<< "$CITIES"

for raw in "${city_list[@]}"; do
  city="${raw//[[:space:]]/}"
  echo "▶ $city" >&2

  city_data=$(fetch_city "$city")
  pm25=$(echo "$city_data" | jq '._pm25')
  aqi=$(pm25_to_aqi "$pm25")
  category=$(aqi_category "$aqi")

  city_entry=$(echo "$city_data" | jq \
    --argjson aqi "$aqi" \
    --arg cat "$category" \
    'del(._pm25) | . + {aqi:$aqi, category:$cat}')

  cities_json=$(echo "$cities_json" | jq --argjson e "$city_entry" '. + [$e]')
done

mkdir -p "$(dirname "$DATA_OUT")"
jq -n \
  --arg ts "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  --argjson cities "$cities_json" \
  '{updated_at:$ts, provider:"openaq", cities:$cities}' \
  > "$DATA_OUT"

echo "✓ Written to $DATA_OUT" >&2
