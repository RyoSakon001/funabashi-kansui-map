(function () {
  const FUNABASHI_CENTER = { lat: 35.72800753725795, lng: 140.00721115 };

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
  const mapError = document.getElementById("map-error");

  const aboutDialog = document.getElementById("about-dialog");
  document.getElementById("about-open").addEventListener("click", () => {
    aboutDialog.showModal();
  });
  document.getElementById("about-close").addEventListener("click", () => {
    aboutDialog.close();
  });
  aboutDialog.addEventListener("click", (event) => {
    if (event.target === aboutDialog) {
      aboutDialog.close();
    }
  });

  let map;
  let routePolyline = null;
  let originMarker = null;
  let destinationMarker = null;

  window.initMap = function () {
    map = new google.maps.Map(document.getElementById("map"), {
      center: FUNABASHI_CENTER,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: "greedy",
    });

    loadFloodPoints();
    setupAutocomplete(document.getElementById("origin"));
    setupAutocomplete(document.getElementById("destination"));
  };

  function setupAutocomplete(el) {
    el.includedRegionCodes = ["jp"];
    el.locationBias = { radius: 20000, center: FUNABASHI_CENTER };
  }

  function parseFloodPointsCsv(text) {
    const lines = text.replace(/^﻿/, "").trim().split(/\r?\n/);
    const headers = lines[0].split(",");
    return lines.slice(1).map((line) => {
      const values = line.split(",");
      const row = {};
      headers.forEach((key, i) => {
        row[key] = values[i];
      });
      return row;
    });
  }

  async function loadFloodPoints() {
    try {
      const res = await fetch("./data/flood-points.csv", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const rows = parseFloodPointsCsv(await res.text());
      if (rows.length === 0) {
        throw new Error("冠水ポイントが見つかりませんでした");
      }

      const infoWindow = new google.maps.InfoWindow();
      const bounds = new google.maps.LatLngBounds();

      rows.forEach((row) => {
        const lat = Number(row.lat);
        const lng = Number(row.lng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          return;
        }

        const name = `No.${row["番号"]}`;
        const address = row["住所"];
        const detailUrl = row["詳細図"];
        const photoUrl = row["写真"];
        const position = { lat, lng };
        const marker = new google.maps.Marker({ position, map, title: address });

        marker.addListener("click", () => {
          const photo = photoUrl
            ? `<br><img src="${photoUrl}" alt="${address}の現地写真" style="max-width:220px;border-radius:6px;margin-top:6px;">`
            : "";
          const detailLink = detailUrl
            ? `<br><a href="${detailUrl}" target="_blank" rel="noopener">詳細図を見る</a>`
            : "";
          infoWindow.setContent(
            `<strong>${name}</strong> ${address}${photo}${detailLink}`
          );
          infoWindow.open(map, marker);
        });

        bounds.extend(position);
      });

      if (bounds.isEmpty()) {
        throw new Error("冠水ポイントの座標が読み取れませんでした");
      }

      map.fitBounds(bounds, 4);
      mapError.hidden = true;
    } catch (err) {
      console.error("冠水ポイントの読み込みエラー:", err);
      mapError.textContent = `冠水ポイントを読み込めませんでした(${err.message})。`;
      mapError.hidden = false;
    }
  }

  function loadGoogleMapsScript() {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_API_KEY_HERE") {
      routeError.textContent =
        "Google Maps APIキーが設定されていません。README の手順に従って設定してください。";
      routeError.hidden = false;
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&language=ja&region=JP&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  loadGoogleMapsScript();

  async function computeRoute(origin, destination) {
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
          travelMode: "DRIVE",
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

    if (!origin || !destination) {
      return;
    }

    try {
      const route = await computeRoute(origin, destination);
      renderRoute(route);
    } catch (err) {
      routeError.textContent = `ルートを取得できませんでした(${err.message})。地点名を見直してください。`;
      routeError.hidden = false;
    }
  });
})();
