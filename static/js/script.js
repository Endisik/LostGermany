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

  // Function to send a DELETE request to the server
  function deletePlace(placeId) {
    fetch(`/api/places/${placeId}`, {
      method: 'DELETE'
    }).then(response => response.json()).then(data => {
      if (data.status === 'success') {
        document.body.removeChild(modal);
        loadedMarkers.delete(placeId);
        activeLayer.clearLayers();
        loadedMarkers.forEach(marker => {
          activeLayer.addLayer(marker);
        });
      } else {
        alert('Fehler beim Löschen des Ortes: ' + data.message);
      }
    }).catch(error => {
      alert('Fehler beim Löschen des Ortes: ' + error);
    });
  }

  // Function to send an UPDATE request to the server
  function updatePlace(placeId, updatedData) {
    fetch(`/api/places/${placeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    }).then(response => response.json()).then(data => {
      if (data.status === 'success') {
        document.body.removeChild(modal);
        changeMarkerColor(placeId, 'white');
      } else {
        alert('Fehler beim Aktualisieren des Ortes: ' + data.message);
      }
    }).catch(error => {
      alert('Fehler beim Aktualisieren des Ortes: ' + error);
    });
  }

  // Function to change the marker color
  function changeMarkerColor(placeId, color) {
    const marker = loadedMarkers.get(placeId);
    if (marker) {
      marker.setIcon(L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%;"></div>`
      }));
    }
  }

  let modalBodyContent = '';

  // Editable fields
  modalBodyContent += `
    <div class="info-group">
      <div class="info-label">Titel:</div>
      <input type="text" class="info-value editable" id="place-title" value="${place.title}">
    </div>
    ${place.address ? `
      <div class="info-group">
        <div class="info-label">Adresse:</div>
        <div class="info-value">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.address)}" target="_blank" class="route-button">
            <img src="../img/marker.png" alt="Routenbeschreibung Icon">
            Routenbeschreibung
          </a>
          <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${place.latitude},${place.longitude}" target="_blank" class="streetview-button">
            <img src="../img/streetview.png" alt="Street View Icon">
            Street View
          </a>
        </div>
      </div>
    ` : ''}
    ${place.email ? `
      <div class="info-group">
        <div class="info-label">E-Mail:</div>
        <input type="text" class="info-value editable" id="place-email" value="${place.email}">
      </div>
    ` : ''}
    ${place.phone ? `
      <div class="info-group">
        <div class="info-label">Telefon:</div>
        <input type="text" class="info-value editable" id="place-phone" value="${place.phone}">
      </div>
    ` : ''}
    ${place.website ? `
      <div class="info-group">
        <div class="info-label">Website:</div>
        <input type="text" class="info-value editable" id="place-website" value="${place.website}">
      </div>
    ` : ''}
    ${place.quote ? `
      <div class="info-group">
        <div class="info-label">Zitat:</div>
        <textarea class="info-value editable" id="place-quote">${place.quote}</textarea>
      </div>
    ` : ''}
  `;

  // Image section with delete buttons
  if (place.images) {
    modalBodyContent += `
      <div class="image-section">
        <div class="image-gallery">
          ${place.images.split(', ').map((url, index) => `
            <div class="image-wrapper">
              <img class="gallery-image" src="${url}" alt="Bild von ${place.title}">
              <button class="delete-image-button" data-url="${url}">Bild löschen</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Ort bearbeiten: <span>${place.title}</span></h2>
        <span class="modal-date">${place.date ? formatDate(place.date) : 'Datum nicht angegeben'}</span>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="info-column">
          ${modalBodyContent}
        </div>
      </div>
      <div class="modal-footer">
        <button class="update-place-button">Ort aktualisieren</button>
        <button class="delete-place-button">Ort löschen</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listener for closing the modal
  modal.querySelector('.close').onclick = function() {
    document.body.removeChild(modal);
  };

  // Event listener for deleting the place
  modal.querySelector('.delete-place-button').onclick = function() {
    deletePlace(place.id);
  };

  // Event listener for updating the place
  modal.querySelector('.update-place-button').onclick = function() {
    const updatedData = {
      title: document.getElementById('place-title').value,
      email: document.getElementById('place-email') ? document.getElementById('place-email').value : null,
      phone: document.getElementById('place-phone') ? document.getElementById('place-phone').value : null,
      website: document.getElementById('place-website') ? document.getElementById('place-website').value : null,
      quote: document.getElementById('place-quote') ? document.getElementById('place-quote').value : null,
      images: place.images.split(', ').filter(url => {
        return !document.querySelector(`button[data-url="${url}"].deleted`);
      }).join(', ')
    };
    updatePlace(place.id, updatedData);
  };

  // Event listeners for deleting images
  modal.querySelectorAll('.delete-image-button').forEach(button => {
    button.onclick = function() {
      this.classList.add('deleted');
      this.parentElement.style.display = 'none';
    };
  });

  // Event listener for closing the modal when clicking outside
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

// Event Listener für das Schließen des Modals
document.querySelector('.close-image-modal').onclick = function() {
  closeModal();
};

// Event Listener für das Schließen des Modals bei Klick außerhalb des Bildes
window.onclick = function(event) {
  var modal = document.getElementById('image-modal');
  if (event.target == modal) {
    closeModal();
  }
};

