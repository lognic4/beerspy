// script.js

document.addEventListener("DOMContentLoaded", async () => {
  // ─────────────────────────────────────────────────────────
  // A) CONFIGURE Supabase client (UMD style)
  // ─────────────────────────────────────────────────────────
  const SUPABASE_URL = "https://bvuuhxlsilmroyidaovp.supabase.co";

  // ==== PASTE YOUR ACTUAL ANON KEY HERE (no ellipsis) ====
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    + ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dXVoeGxzaWxtcm95aWRhb3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTYzMzgsImV4cCI6MjA1ODk5MjMzOH0"
    + ".eCueNnzM6ezrpsRqaILPefnFTuRRvhr0g_cWIguqYzc";
  // ======================================================

  // Create a Supabase client and store it in sbClient
  // (avoid shadowing global "supabase")
  const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ─────────────────────────────────────────────────────────
  // B) INITIALIZE Leaflet map (one #map)
  // ─────────────────────────────────────────────────────────
  const mainMap = L.map("map").setView([-37.8136, 144.9631], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(mainMap);

  // Keep references to current markers so we can clear them on view‐change
  let markers = [];

  // ─────────────────────────────────────────────────────────
  // C) FUNCTION: Refresh markers based on selected “view” (min/avg/max)
  // ─────────────────────────────────────────────────────────
  async function refreshMarkers(view = "min") {
    // 1) Remove any existing markers
    markers.forEach((m) => m.remove());
    markers = [];

    // 2) Decide which aggregate to use
    let agg, alias;
    if (view === "min") {
      agg = "MIN(price)";
      alias = "cheapest_price";
    }
    if (view === "avg") {
      agg = "AVG(price)";
      alias = "avg_price";
    }
    if (view === "max") {
      agg = "MAX(price)";
      alias = "expensive_price";
    }

    // 3) Query Supabase (grouped by pub_name, lat, lon)
    const { data: pubsData, error } = await sbClient
      .from("beer_prices")
      .select(`pub_name, lat, lon, ${agg} as ${alias}`)
      .group("pub_name, lat, lon");

    if (error) {
      console.error("Could not load pubs:", error);
      return;
    }

    // 4) Add a marker for each pub
    pubsData.forEach((pub) => {
      const priceVal = pub[alias];
      const m = L.marker([pub.lat, pub.lon]).addTo(mainMap);

      // Show the price as a permanent tooltip
      m.bindTooltip(`$${priceVal.toFixed(2)}`, {
        permanent: true,
        direction: "top",
        className: "cheap-label",
      });

      // When clicked, show full details for that pub
      m.on("click", () =>
        showPubDetails(pub.pub_name, pub.lat, pub.lon)
      );

      markers.push(m);
    });
  }

  // ─────────────────────────────────────────────────────────
  // D) FUNCTION: On marker click, show a popup with ALL beer entries for that pub
  // ─────────────────────────────────────────────────────────
  async function showPubDetails(pubName, lat, lon) {
    // 1) Fetch every row for this pub_name
    const { data: beers, error } = await sbClient
      .from("beer_prices")
      .select("beer_name, size, price, location, last_updated")
      .eq("pub_name", pubName);

    if (error || !beers || beers.length === 0) {
      console.error("Failed to load details for", pubName, error);
      return;
    }

    // 2) Build HTML for the popup
    let html = `<div style="min-width:180px; font-family:sans-serif">
      <strong>${pubName}</strong><br>
      <em>${beers[0].location || ""}</em><br><hr>`;

    html += `<table style="width:100%; font-size:0.9rem; border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left">Beer</th>
            <th style="text-align:left">Size</th>
            <th style="text-align:right">Price</th>
          </tr>
        </thead>
        <tbody>`;

    beers.forEach((b) => {
      html += `<tr>
          <td>${b.beer_name}</td>
          <td>${b.size}</td>
          <td style="text-align:right">$${b.price.toFixed(2)}</td>
        </tr>`;
    });

    html += `</tbody></table><br>`;
    html += `<small>Last updated: ${new Date(
      beers[0].last_updated
    ).toLocaleDateString()}</small></div>`;

    // 3) Open a Leaflet popup at [lat, lon]
    L.popup({ maxWidth: 240 })
      .setLatLng([lat, lon])
      .setContent(html)
      .openOn(mainMap);
  }

  // ─────────────────────────────────────────────────────────
  // E) ON INITIAL LOAD: catch errors from refreshMarkers
  // ─────────────────────────────────────────────────────────
  try {
    await refreshMarkers("min"); // default to “cheapest” view
  } catch (err) {
    console.error("refreshMarkers threw an error:", err);
  }

  // ─────────────────────────────────────────────────────────
  // F) HOOK UP the “view” dropdown to re‐draw markers
  // ─────────────────────────────────────────────────────────
  document
    .getElementById("view-select")
    .addEventListener("change", (e) => {
      refreshMarkers(e.target.value);
    });
});
