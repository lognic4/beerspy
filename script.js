document.addEventListener("DOMContentLoaded", async () => {
    var map = L.map('map').setView([-37.8136, 144.9631], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let selectedLat = null;
    let selectedLon = null;

    const SUPABASE_URL = "https://bvuuhxlsilmroyidaovp.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dXVoeGxzaWxtcm95aWRhb3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTYzMzgsImV4cCI6MjA1ODk5MjMzOH0.eCueNnzM6ezrpsRqaILPefnFTuRRvhr0g_cWIguqYzc";


    async function submitBeer(pubName, lat, lon, beerName, size, price) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/beer_prices`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({
                pub_name: pubName,
                lat: lat,
                lon: lon,
                beer_name: beerName,
                size: size,
                price: parseFloat(price),
                last_updated: new Date().toISOString()
            })
        });
        if (!response.ok) {
            const text = await response.text();
            console.error("submitBeer failed, status:", response.status, text);
         return { error: text };
      }
      return response.json();


    }

    // Load existing pubs into dropdown
    const pubs = await fetchPubs();
    const pubSelect = document.getElementById("pub-name");

    pubs.forEach(pub => {
        let option = document.createElement("option");
        option.value = pub.pub_name;
        option.textContent = pub.pub_name;
        option.dataset.lat = pub.lat;
        option.dataset.lon = pub.lon;
        pubSelect.appendChild(option);
    });
    
    let markers = [];
    
    async function refreshMarkers(view = "min") {
      // 1) Clear old markers
      markers.forEach(m => m.remove());
      markers = [];
    
      // 2) Determine SQL aggregate
      let agg, alias;
      if (view === "min")    { agg = "MIN(price)"; alias = "cheapest_price"; }
      if (view === "avg")    { agg = "AVG(price)"; alias = "avg_price"; }
      if (view === "max")    { agg = "MAX(price)"; alias = "expensive_price"; }
    
      // 3) Fetch from Supabase
      const { data: pubsData, error } = await supabase
        .from("beer_prices")
        .select(`pub_name,lat,lon,${agg} as ${alias}`)
        .group("pub_name,lat,lon");
    
      if (error) {
        return console.error("Could not load pubs:", error);
      }
    
      // 4) Plot each marker with a tooltip showing the chosen metric
      pubsData.forEach(pub => {
        const priceVal = pub[alias];
        const m = L.marker([pub.lat, pub.lon]).addTo(mainMap);
        m.bindTooltip(`\$${priceVal.toFixed(2)}`, { permanent: true, direction: 'top' });
        m.on("click", () => showPubDetails(pub.pub_name));
        markers.push(m);
      });
    }
    
    async function showPubDetails(pubName) {
      const { data: beers } = await supabase
        .from("beer_prices")
        .select("beer_name,size,price,location,last_updated")
        .eq("pub_name", pubName);
    
      if (!beers || beers.length === 0) return;
    
      let html = `<div style="min-width:200px"><strong>${pubName}</strong><br>`;
      html += `<em>${beers[0].location || ""}</em><br><hr>`;
      html += `<table style="width:100%; font-size:0.9rem">
        <thead>
          <tr><th>Beer</th><th>Size</th><th>Price</th></tr>
        </thead>
        <tbody>`;
    
      beers.forEach(b => {
        html += `<tr>
          <td>${b.beer_name}</td>
          <td>${b.size}</td>
          <td>\$${b.price.toFixed(2)}</td>
        </tr>`;
      });
      html += `</tbody></table><br>`;
      html += `<small>Last updated: ${new Date(
        beers[0].last_updated
      ).toLocaleDateString()}</small></div>`;
    
      // Find the existing marker for pubName, then open its popup
      const marker = markers.find(m => {
        const { lat, lng } = m.getLatLng();
        return lat === beers[0].lat && lng === beers[0].lon;
      });
      if (marker) {
        marker.bindPopup(html).openPopup();
      }
    }
    
    // On page load:
    document.addEventListener("DOMContentLoaded", async () => {
      // 1) Initialize mainMap (as before)
      window.mainMap = L.map("map").setView([-37.8136, 144.9631], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(mainMap);
    
      // 2) Initialize Supabase client
      window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
      // 3) Fetch & plot initial markers (cheapest by default)
      await refreshMarkers("min");
    
      // 4) Wire up the view‐select dropdown
      document.getElementById("view‐select").addEventListener("change", (e) => {
        refreshMarkers(e.target.value);
      });
    
      // 5) Show or hide the “add‐form” when the +Add button is clicked
      document.getElementById("add‐btn").addEventListener("click", () => {
        document.getElementById("add‐form").style.display = "block";
      });
      
      // 6) Handle add‐form submission (as shown earlier)
      //    …call submitBeer(...) then do refreshMarkers("min") again…
    });


    // Handle pub selection
    pubSelect.addEventListener("change", function() {
        if (this.value) {
            document.getElementById("new-pub-name").value = "";
            selectedLat = this.options[this.selectedIndex].dataset.lat;
            selectedLon = this.options[this.selectedIndex].dataset.lon;
        }
    });

    // Handle new pub location selection on map
    map.on('click', function(e) {
        selectedLat = e.latlng.lat;
        selectedLon = e.latlng.lng;
        alert(`Location selected: ${selectedLat}, ${selectedLon}`);
    });

    // Handle form submission
    document.getElementById("pub-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        
        let pubName = document.getElementById("pub-name").value;
        const newPubName = document.getElementById("new-pub-name").value;
        const beerName = document.getElementById("beer-name").value;
        const size = document.getElementById("size").value;
        const price = document.getElementById("beer-price").value;

        if (!pubName && !newPubName) {
            alert("Please select or enter a pub name.");
            return;
        }

        if (newPubName) {
            pubName = newPubName;
            if (!selectedLat || !selectedLon) {
                alert("Please select a location on the map.");
                return;
            }
        } else {
            selectedLat = document.getElementById("pub-name").selectedOptions[0].dataset.lat;
            selectedLon = document.getElementById("pub-name").selectedOptions[0].dataset.lon;
        }

        await submitBeer(pubName, selectedLat, selectedLon, beerName, size, price);
        alert("Beer price added!");
        location.reload();
    });

    // Load pubs on map
    pubs.forEach(pub => {
        L.marker([pub.lat, pub.lon]).addTo(map).bindPopup(`<strong>${pub.pub_name}</strong><br>${pub.location}`);
    });
    async function fetchPubs() {
      const response = await fetch(
    `${SUPABASE_URL}/rest/v1/beer_prices?select=*`,
    {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  if (!response.ok) {
    console.error("fetchPubs failed, status:", response.status, await response.text());
    return []; // or throw new Error("fetchPubs failed");
  }
  const pubs = await response.json();
  console.log("Fetched pubs:", pubs);
  return pubs;
}

    
});
