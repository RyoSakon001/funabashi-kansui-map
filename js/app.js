(function () {
  const FUNABASHI_CENTER = { lat: 35.72800753725795, lng: 140.00721115 };

  const TRAVEL_MODE_MAP = {
    driving: "DRIVE",
    walking: "WALK",
    bicycling: "BICYCLE",
    transit: "TRANSIT",
  };

  const ROUTE_FIELD_MASK =
    "routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation";

  const statusBanner = document.getElementById("status-banner");
  fetch("./status.json", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((status) => {
      if (status && status.available === false) {
        statusBanner.textContent =
          status.message || "現在、一部機能を一時停止しています。";
        statusBanner.hidden = false;
      }
    })
    .catch(() => {
      // status.json が取得できない場合は何もしない
    });

  const routeForm = document.getElementById("route-form");
  const routeError = document.getElementById("route-error");

  let map;
  let routePolyline = null;
  let originMarker = null;
  let destinationMarker = null;

  window.initMap = function () {
    map = new google.maps.Map(document.getElementById("map"), {
      center: FUNABASHI_CENTER,
      zoom: 13,
    });

    new google.maps.KmlLayer({
      url: `https://www.google.com/maps/d/kml?mid=${SITE_CONFIG.MYMAPS_MID}&forcekml=1`,
      map,
      preserveViewport: false,
    });
  };

  function loadGoogleMapsScript() {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_API_KEY_HERE") {
      routeError.textContent =
        "Google Maps APIキーが設定されていません。README の手順に従って設定してください。";
      routeError.hidden = false;
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&language=ja&region=JP&libraries=geometry`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  loadGoogleMapsScript();

  async function computeRoute(origin, destination, travelMode) {
    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": ROUTE_FIELD_MASK,
        },
        body: JSON.stringify({
          origin: { address: origin },
          destination: { address: destination },
          travelMode,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || `HTTP ${res.status}`);
    }
    if (!data.routes || data.routes.length === 0) {
      throw new Error("ルートが見つかりませんでした");
    }
    return data.routes[0];
  }

  function clearRoute() {
    if (routePolyline) {
      routePolyline.setMap(null);
      routePolyline = null;
    }
    if (originMarker) {
      originMarker.setMap(null);
      originMarker = null;
    }
    if (destinationMarker) {
      destinationMarker.setMap(null);
      destinationMarker = null;
    }
  }

  function renderRoute(route) {
    clearRoute();

    const path = google.maps.geometry.encoding.decodePath(
      route.polyline.encodedPolyline
    );

    routePolyline = new google.maps.Polyline({
      path,
      map,
      strokeColor: "#0b6fab",
      strokeWeight: 5,
    });

    const bounds = new google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));

    const leg = route.legs && route.legs[0];
    if (leg) {
      originMarker = new google.maps.Marker({
        position: leg.startLocation.latLng,
        map,
        label: "出発",
      });
      destinationMarker = new google.maps.Marker({
        position: leg.endLocation.latLng,
        map,
        label: "到着",
      });
    }

    map.fitBounds(bounds);
  }

  routeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    routeError.hidden = true;

    if (!map) {
      return;
    }

    const origin = document.getElementById("origin").value.trim();
    const destination = document.getElementById("destination").value.trim();
    const travelMode =
      TRAVEL_MODE_MAP[document.getElementById("mode").value] || "DRIVE";

    if (!origin || !destination) {
      return;
    }

    try {
      const route = await computeRoute(origin, destination, travelMode);
      renderRoute(route);
    } catch (err) {
      routeError.textContent = `ルートを取得できませんでした(${err.message})。地点名を見直してください。`;
      routeError.hidden = false;
    }
  });
})();
