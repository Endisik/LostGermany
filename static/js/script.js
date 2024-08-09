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
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Monate sind nullbasiert
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function createDetailModal(place) {
  const modal = document.createElement('div');
  modal.className = 'modal';

  let modalBodyContent = '';

  // Check and add address as buttons
  if (place.address) {
    const addressQuery = encodeURIComponent(place.address);
    const latLngQuery = `${place.latitude},${place.longitude}`;
    modalBodyContent += `
      <div class="info-group">
        <div class="info-label">Adresse:</div>
        <div class="info-value">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${addressQuery}" target="_blank" class="route-button">
            <img src="static/img/marker.png" alt="Routenbeschreibung Icon">
            Routenbeschreibung
          </a>
          <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latLngQuery}" target="_blank" class="streetview-button">
            <img src="static/img/streetview.png" alt="Street View Icon">
            Street View
          </a>
        </div>
      </div>
    `;
  }

  // Check and add email
  if (place.email) {
    modalBodyContent += `
      <div class="info-group">
        <div class="info-label">E-Mail:</div>
        <div class="info-value"><a href="mailto:${place.email}">${place.email}</a></div>
      </div>
    `;
  }

  // Check and add phone
  if (place.phone) {
    modalBodyContent += `
      <div class="info-group">
        <div class="info-label">Telefon:</div>
        <div class="info-value">${place.phone}</div>
      </div>
    `;
  }

  // Check and add website
  if (place.website) {
    modalBodyContent += `
      <div class="info-group">
        <div class="info-label">Website:</div>
        <div class="info-value"><a href="${place.website}" target="_blank">${place.website}</a></div>
      </div>
    `;
  }

  // Check and add quote with expand/collapse functionality
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
        <span class="modal-date">${place.date ? formatDate(place.date) : 'Datum nicht angegeben'}</span>
        <span class="close">&times;</span>
      </div>
      ${place.images ? `
        <div class="image-section">
          <div class="image-gallery">
            ${place.images.split(', ').map((url, index) => `<img class="gallery-image" src="${url}" alt="Bild von ${place.title}" onclick="openModal(['${place.images.split(', ').join("','")}'], ${index})">`).join('')}
          </div>
        </div>
      ` : ''}
      <div class="modal-body">
        <div class="info-column">
          ${modalBodyContent}
        </div>
      </div>
      ${place.youtube_links ? `
        <div class="video-section">
          <h3>YouTube Videos:</h3>
          <div class="video-container">
            ${place.youtube_links.split(', ').map(link => {
    return `<iframe src="${link}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }).join('')}
          </div>
        </div>
      ` : ''}
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
      loadedMarkers.set(place.id, marker);
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
        loadMarkers(); // Aktualisieren Sie die Marker, um den neuen Punkt anzuzeigen
      })
      .catch((error) => {
        console.error('Fehler:', error);
      });
  });
});
