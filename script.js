var map = L.map('map').setView([13.0843, 80.2705], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var currentLine = null;
var lat1, lon1;
var prevLat = null, prevLon = null, prevTime = null;
var startMarker = null;
var pulseCircle = null;
var isAnimating = false;
var maxDistance = null; // Store the max distance for the loading bar

// Custom Icon for Starting Point
var startIcon = L.icon({
    iconUrl: 'drone2.png',
    iconSize: [100, 100],  
    iconAnchor: [50, 50], 
    popupAnchor: [0, -100] 
});

// Function to calculate animation radius based on zoom level
function getRadiusByZoom(zoom) {
    return Math.pow(2, 18 - zoom) * 5; 
}

// Function to create a pulsating effect at the start point
function createPulsatingEffect(lat, lon) {
    if (isAnimating) return;

    isAnimating = true;

    if (pulseCircle) {
        map.removeLayer(pulseCircle);
    }

    pulseCircle = L.circle([lat, lon], {
        color: '#ff0000',
        fillColor: '#ff6666',
        fillOpacity: 0.5,
        radius: 1
    }).addTo(map);

    let grow = 1;

    let animation = setInterval(() => {
        if (grow >= 100) {
            clearInterval(animation);
            map.removeLayer(pulseCircle);
            isAnimating = false;
        } else {
            pulseCircle.setRadius(grow);
            pulseCircle.setStyle({ opacity: 1 - (grow / 50) });
            grow += 5;
        }
    }, 50);
}

// Function to calculate distance (Haversine formula)
function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Function to calculate speed and ETA
function calculateSpeedAndETA(lat1, lon1, prevLat, prevLon, prevTime, lat2, lon2) {
    if (prevLat === null || prevLon === null || prevTime === null) {
        return { speed: 0, eta: 'Calculating...' };
    }

    let currentTime = Date.now();
    let timeDiff = (currentTime - prevTime) / 1000; 

    if (timeDiff <= 0) {
        return { speed: 0, eta: 'Infinity' };
    }

    let distanceMoved = haversine(prevLat, prevLon, lat1, lon1);
    let speed = (distanceMoved / (timeDiff / 3600)); 

    let distanceToTarget = haversine(lat1, lon1, lat2, lon2);
    let eta = speed > 0 ? (distanceToTarget / speed) * 60 : '∞';

    return { speed: speed.toFixed(2), eta: eta === '∞' ? '∞' : `${eta.toFixed(2)} min` };
}

// Function to update the loading bar
function updateLoadingBar(distance) {
    if (maxDistance === null) {
        maxDistance = distance;
    }
    
    let progress = ((maxDistance - distance) / maxDistance) * 100;
    progress = Math.min(Math.max(progress, 0), 100);

    document.getElementById('progress-bar').style.width = progress + "%";
    console.log("Loading progress:", progress + "%"); 

    if (progress >= 95) {
        document.getElementById('Details').style.display = 'none';
        document.getElementById('qrcode').style.display = 'block';
    }
    // document.getElementById('max').innerText = 'Max : ' +  maxDistance;
    // document.getElementById('progress').innerText = 'Progress : ' +  progress + '%';
}

function updateMap() {
    document.getElementById('map').style.opacity = "1";

    var lat2 = parseFloat(document.getElementById('lat2').value);
    var lon2 = parseFloat(document.getElementById('lon2').value);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
        alert("Please enter valid coordinates!");
        return;
    }

    var distance = haversine(lat1, lon1, lat2, lon2);
    document.getElementById('distance').innerText = 'Distance: ' + distance.toFixed(2) + ' km';

    // Update the loading bar
    updateLoadingBar(distance);

    map.panTo([lat1, lon1]);

    if (currentLine) {
        map.removeLayer(currentLine);
    }
    currentLine = L.polyline([[lat1, lon1], [lat2, lon2]], { color: 'red' }).addTo(map);

    if (startMarker) {
        map.removeLayer(startMarker);
    }

    startMarker = L.marker([lat1, lon1], { icon: startIcon }).addTo(map).bindPopup("Starting Point");

    createPulsatingEffect(lat1, lon1);

    let { speed, eta } = calculateSpeedAndETA(lat1, lon1, prevLat, prevLon, prevTime, lat2, lon2);
    document.getElementById('gps-status').innerText = `Live GPS: ${lat1.toFixed(6)}, ${lon1.toFixed(6)}`;
    document.getElementById('speed-status').innerText = `Speed: ${speed} km/h`;
    document.getElementById('eta-status').innerText = `ETA: ${eta}`;

    console.log("Speed:", speed, "ETA:", eta);

    prevLat = lat1;
    prevLon = lon1;
    prevTime = Date.now();
}

// Function to track location continuously
function trackLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            function (position) {
                lat1 = position.coords.latitude;
                lon1 = position.coords.longitude;
                document.getElementById('lat1').value = lat1;
                document.getElementById('lon1').value = lon1;
                updateMap();
            },
            function (error) {
                console.error("Error getting location: ", error);
            },
            { enableHighAccuracy: true }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Update animation radius dynamically when zoom changes
map.on('zoomend', function() {
    if (pulseCircle) {
        let zoomLevel = map.getZoom();
        pulseCircle.setRadius(getRadiusByZoom(zoomLevel));
    }
});

// Start tracking GPS continuously
trackLocation();
