(function () {
  const mymapsFrame = document.getElementById("mymaps-frame");
  mymapsFrame.src = `https://www.google.com/maps/d/embed?mid=${SITE_CONFIG.MYMAPS_MID}&ehbc=2E312F`;

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
  const routeContainer = document.getElementById("route-map-container");
  const routeFrame = document.getElementById("route-frame");
  const routeError = document.getElementById("route-error");

  routeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    routeError.hidden = true;

    const origin = document.getElementById("origin").value.trim();
    const destination = document.getElementById("destination").value.trim();
    const mode = document.getElementById("mode").value;

    if (!origin || !destination) {
      return;
    }

    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_API_KEY_HERE") {
      routeError.textContent =
        "Google Maps APIキーが設定されていません。README の手順に従って設定してください。";
      routeError.hidden = false;
      return;
    }

    const params = new URLSearchParams({
      origin,
      destination,
      mode,
      language: "ja",
      region: "JP",
      key: GOOGLE_MAPS_API_KEY,
    });

    routeFrame.src = `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
    routeContainer.hidden = false;
  });
})();
