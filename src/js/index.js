var map = L.map('map').setView([51.1657, 10.4515], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
}).addTo(map);

var markers = L.layerGroup();
var markerCluster = L.markerClusterGroup();
var activeLayer = markers;
map.addLayer(activeLayer);

let loadedMarkers = new Map();


function loadMarkers(minLat, maxLat, minLng, maxLng) {
  fetch(`/api/places?min_lat=${minLat}&max_lat=${maxLat}&min_lng=${minLng}&max_lng=${maxLng}`)
    .then(response => response.json())
    .then(data => {
      updateMarkers(data);
    });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function createDetailModal(place) {
  const modal = document.createElement('div');
  modal.className = 'modal';

  let modalBodyContent = '';

  // Routenbeschreibung und Streetview mittels latitude und longitude
  if (place.address) {
    // Längen- und Breitengrad in latLngQuery speichern
    const latLngQuery = `${place.latitude},${place.longitude}`;
    modalBodyContent += `
        <div class="info-group">
            <div class="info-value">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${latLngQuery}" target="_blank" class="route-button">
                    <img src="static/img/marker.png" alt="Routenbeschreibung Icon">
                    Route
                </a>
                <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latLngQuery}" target="_blank" class="streetview-button">
                    <img src="static/img/streetview.png" alt="Street View Icon">
                    StreetView
                </a>
            </div>
        </div>
        `;
  }

  let imagesHTML = "";

  // Bilder in DB
  if (place.images) {
    constimagesHTML = place.images.split(', ').map((url, index) => `<img class="gallery-image" src="${url}" alt="Bild von ${place.title}" onclick="openModal(['${place.images.split(', ').join("','")}'], ${index})">`).join('');

    // Satellitenbild
    const satelliteImageHTML = place.satellite_image ? `<img class="gallery-image" src="${place.satellite_image}" alt="Satellitenbild von ${place.title}" onclick="openModal(['${place.satellite_image}'], 0)">` : '';

    modalBodyContent += `
        <div class="image-section">
            <div class="image-gallery">
                ${constimagesHTML}
                ${satelliteImageHTML}
            </div>
        </div>
        `;
  }

  // Email
  if (place.email) {
    modalBodyContent += `
      <div class="info-group">
        <div class="info-label">E-Mail:</div>
        <div class="info-value"><a href="mailto:${place.email}">${place.email}</a></div>
      </div>
    `;
  }

  // Phone number
  if (place.phone) {
    modalBodyContent += `
      <div class="info-group">
        <div class="info-label">Telefon:</div>
        <div class="info-value">${place.phone}</div>
      </div>
    `;
  }

  // Website
    if (place.website) {
      const domain = extractDomain(place.website);
      modalBodyContent += `
        <div class="info-group">
          <div class="info-label">Website:</div>
          <div class="info-value">
            <a href="${place.website}" target="_blank">${domain}</a>
          </div>
        </div>
      `;
    }


  // quotes
  if (place.quote) {
    const quote = place.quote;
    const truncatedQuote = quote.length > 100 ? quote.slice(0, 100) + '... ' : quote;

    modalBodyContent += `
      <div class="info-group">
        <div class="info-label">Zitat:</div>
        <div class="info-value">
          <span class="truncated-quote">${truncatedQuote}</span>
          ${quote.length > 100 ? `
            <a href="#" class="toggle-quote">Mehr Anzeigen</a>
            <span class="full-text" style="display:none;">${quote}</span>
          ` : ''}
        </div>
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">${place.title}</h2>
        <span class="modal-date">${place.date ? formatDate(place.date) : ''}</span>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="info-column">
          ${modalBodyContent}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Toggle quote visibility
  modal.querySelectorAll('.toggle-quote').forEach(link => {
    link.onclick = function(e) {
      e.preventDefault();
      const fullText = this.nextElementSibling;
      const truncatedText = this.previousElementSibling;
      if (fullText.style.display === 'none') {
        fullText.style.display = 'inline';
        truncatedText.style.display = 'none';
        this.textContent = 'Weniger Anzeigen';
      } else {
        fullText.style.display = 'none';
        truncatedText.style.display = 'inline';
        this.textContent = 'Mehr Anzeigen';
      }
    };
  });

  modal.querySelector('.close').onclick = function() {
    document.body.removeChild(modal);
  };

  window.onclick = function(event) {
    if (event.target == modal) {
      document.body.removeChild(modal);
    }
  };
}

function extractDomain(url) {
  // Entfernt 'http://', 'https://', oder 'www.' am Anfang
  let domain = url.replace(/^https?:\/\/(www\.)?/, '');
  // Schneidet alles nach dem ersten '/' ab
  domain = domain.split('/')[0];
  return domain;
}

function updateMarkers(data) {
  let visibleIDs = new Set();

  data.forEach(place => {
    visibleIDs.add(place.id);
    if (!loadedMarkers.has(place.id)) {
      var marker = L.marker([place.latitude, place.longitude])
        .bindPopup(`<h3><a href="#" class="place-link" data-id="${place.id}">${place.title}</a></h3>
                    <img src="${place.images ? place.images.split(', ')[0] : ''}" alt="${place.title}" style="width:100px;height:auto;">`)
        .on('popupopen', function() {
          document.querySelector(`.place-link[data-id="${place.id}"]`).addEventListener('click', function(e) {
            e.preventDefault();
            createDetailModal(place);
          });
        });
      loadedMarkers.set(place.id, marker); // Marker in die Map hinzufügen
      activeLayer.addLayer(marker); // Marker der aktiven Layer hinzufügen
    }
  });

  // Entfernen von Markern, die nicht mehr im sichtbaren Bereich sind
  loadedMarkers.forEach((marker, id) => {
    if (!visibleIDs.has(id)) {
      activeLayer.removeLayer(marker);
      loadedMarkers.delete(id);
    }
  });

  // Überprüfen, ob Clustering aktiviert werden soll
  if (loadedMarkers.size > 1000 && activeLayer !== markerCluster) {
    map.removeLayer(activeLayer);
    activeLayer = markerCluster;
    map.addLayer(activeLayer);
  } else if (loadedMarkers.size <= 1000 && activeLayer !== markers) {
    map.removeLayer(activeLayer);
    activeLayer = markers;
    map.addLayer(activeLayer);
  }

  // Aktualisieren der aktiven Ebene
  activeLayer.clearLayers();
  loadedMarkers.forEach(marker => {
    activeLayer.addLayer(marker);
  });
}

map.on('moveend', function() {
  var bounds = map.getBounds();
  var minLat = bounds.getSouth();
  var maxLat = bounds.getNorth();
  var minLng = bounds.getWest();
  var maxLng = bounds.getEast();
  loadMarkers(minLat, maxLat, minLng, maxLng);
});

// Initiales Laden
var bounds = map.getBounds();
var minLat = bounds.getSouth();
var maxLat = bounds.getNorth();
var minLng = bounds.getWest();
var maxLng = bounds.getEast();
loadMarkers(minLat, maxLat, minLng, maxLng);

var slideIndex = 0;
var currentImages = [];

function openModal(images, index) {
  currentImages = images;
  slideIndex = index;
  document.getElementById('image-modal').style.display = "block";
  showSlides(slideIndex);
  displayThumbnails();
}

function closeModal() {
  document.getElementById('image-modal').style.display = "none";
}

function plusSlides(n) {
  showSlides(slideIndex += n);
}

function showSlides(n) {
  var modalImg = document.getElementById("image-modal-img");
  if (n >= currentImages.length) { slideIndex = 0; }
  if (n < 0) { slideIndex = currentImages.length - 1; }
  modalImg.src = currentImages[slideIndex];
  highlightThumbnail(slideIndex);
}

function displayThumbnails() {
  var thumbnailContainer = document.getElementById('thumbnail-container');
  thumbnailContainer.innerHTML = '';
  currentImages.forEach((imgSrc, index) => {
    var img = document.createElement('img');
    img.src = imgSrc;
    img.onclick = function() {
      showSlides(slideIndex = index);
    };
    thumbnailContainer.appendChild(img);
  });
  highlightThumbnail(slideIndex);
}

function highlightThumbnail(index) {
  var thumbnails = document.querySelectorAll('#thumbnail-container img');
  thumbnails.forEach((img, i) => {
    img.style.border = i === index ? '2px solid #fff' : 'none';
  });
}

// Event Listener für das Schließen des alten Modals
document.querySelector('.close-image-modal').onclick = function() {
  closeModal();
};

window.onclick = function(event) {
  if (event.target == document.getElementById('image-modal')) {
    closeModal();
  }
};

// Event Listener für das neue Modal
document.getElementById('open-add-point-modal').addEventListener('click', function() {
  document.getElementById('add-point-modal').style.display = 'block';
});

document.querySelector('#add-point-modal .close').addEventListener('click', function() {
  document.getElementById('add-point-modal').style.display = 'none';
});

window.onclick = function(event) {
  if (event.target == document.getElementById('add-point-modal')) {
    document.getElementById('add-point-modal').style.display = 'none';
  }
};

document.getElementById('add-point-form').addEventListener('submit', function(event) {
  event.preventDefault();

  const formData = new FormData(this);
  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });

  fetch('/api/add_place', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert('Punkt erfolgreich hinzugefügt!');
        document.getElementById('add-point-modal').style.display = 'none';
        // Optional: Lade die Marker neu
        var bounds = map.getBounds();
        loadMarkers(bounds.getSouth(), bounds.getNorth(), bounds.getWest(), bounds.getEast());
      } else {
        alert('Fehler beim Hinzufügen des Punktes.');
      }
    });
});
document.addEventListener("DOMContentLoaded", function() {
  // Funktion zum Öffnen des Modals
  function openAddPointModal() {
    document.getElementById('add-point-modal').style.display = 'block';
  }

  // Funktion zum Schließen des Modals
  function closeAddPointModal() {
    document.getElementById('add-point-modal').style.display = 'none';
  }

  // Event Listener für den Button
  document.querySelector('.menu-button').addEventListener('click', openAddPointModal);

  // Event Listener für das Schließen des Modals bei Klick auf das Schließen-Icon
  document.querySelector('#add-point-modal .close').addEventListener('click', closeAddPointModal);

  // Event Listener für das Schließen des Modals bei Klick außerhalb des Modals
  window.addEventListener('click', function(event) {
    if (event.target == document.getElementById('add-point-modal')) {
      closeAddPointModal();
    }
  });

  // Event Listener für das Formular
  document.getElementById('add-point-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const pointData = {};
    formData.forEach((value, key) => {
      pointData[key] = value;
    });

    // Hier können Sie den Code zum Senden der Daten an Ihren Server hinzufügen
    fetch('/api/add_point', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pointData),
    })
      .then(response => response.json())
      .then(data => {
        console.log('Erfolg:', data);
        closeAddPointModal();
        loadMarkers();
      })
      .catch((error) => {
        console.error('Fehler:', error);
      });
  });
});

document.getElementById('search-button').addEventListener('click', function() {
  var query = document.getElementById('search-input').value;
  if (query) {
    searchLocation(query);
  }
});

document.getElementById('close-search-window').addEventListener('click', function() {
  document.getElementById('floating-search-window').style.display = 'none';
});

function fetchSuggestions(query) {
  console.log(`Suche nach: ${query}`); // Zum Debuggen
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=de&limit=5`)
    .then(response => response.json())
    .then(data => {
      console.log('Empfangene Daten:', data); // Zum Debuggen
      if (data.length > 0) {
        displaySuggestions(data);
      } else {
        clearSuggestions();
      }
    })
    .catch(error => console.error('Fehler bei der Ortssuche:', error));
}

function displaySuggestions(suggestions) {
  var suggestionsList = document.getElementById('suggestions-list');
  suggestionsList.innerHTML = '';
  suggestions.forEach(suggestion => {
    var li = document.createElement('li');
    li.textContent = suggestion.display_name;
    li.setAttribute('data-lat', suggestion.lat);
    li.setAttribute('data-lon', suggestion.lon);
    suggestionsList.appendChild(li);
  });
  suggestionsList.style.display = 'block';
}

function clearSuggestions() {
  var suggestionsList = document.getElementById('suggestions-list');
  suggestionsList.innerHTML = '';
  suggestionsList.style.display = 'none';
}

document.getElementById('search-input').addEventListener('input', function() {
  var query = this.value;
  if (query.length > 2) {
    fetchSuggestions(query);
  } else {
    clearSuggestions();
  }
});

document.getElementById('suggestions-list').addEventListener('click', function(event) {
  if (event.target.tagName === 'LI') {
    var lat = event.target.getAttribute('data-lat');
    var lon = event.target.getAttribute('data-lon');
    map.setView(new L.LatLng(lat, lon), 10);
    clearSuggestions();
  }
});

document.getElementById('search-button').addEventListener('click', function() {
  var query = document.getElementById('search-input').value;
  if (query) {
    searchLocation(query);
  }
});

function searchLocation(query) {
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        var lat = data[0].lat;
        var lon = data[0].lon;
        map.setView(new L.LatLng(lat, lon), 12);
      } else {
        alert('Ort nicht gefunden');
      }
    })
    .catch(error => console.error('Fehler bei der Ortssuche:', error));
}
