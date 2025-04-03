document.addEventListener("DOMContentLoaded", async () => {
    var map = L.map('map').setView([-37.8136, 144.9631], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let selectedLat = null;
    let selectedLon = null;

    const SUPABASE_URL = "https://bvuuhxlsilmroyidaovp.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dXVoeGxzaWxtcm95aWRhb3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTYzMzgsImV4cCI6MjA1ODk5MjMzOH0.eCueNnzM6ezrpsRqaILPefnFTuRRvhr0g_cWIguqYzc";


    async function fetchPubs() {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/beer_prices`, {
            headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
        });
        return response.json();
    }

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
});
