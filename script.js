document.addEventListener("DOMContentLoaded", () => {
    var map = L.map('map').setView([-37.8136, 144.9631], 12); // Melbourne Default View

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Example pub marker
    var marker = L.marker([-37.814, 144.963]).addTo(map)
        .bindPopup("The Drunken Kangaroo 🍻<br>Price: $10.50")
        .openPopup();
});
