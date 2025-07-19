// Garage Sale JavaScript

// Load garageItems from JSON file
let garageItems = [];
let filteredItems = [];

// Contact info (only WhatsApp and location are used)
const contactInfo = {
  phone: "+40730020215",
  location: "https://maps.app.goo.gl/AyPsEuipgAnCLiy96",
  name: ""
};

// State management
let searchTerm = "";
let currentItem = null;
let currentImageIndex = 0;

// DOM elements
const itemsGrid = document.getElementById("itemsGrid");
const searchInput = document.getElementById("searchInput"); // not used, but kept for possible future search
const availableFilter = document.getElementById("availableFilter"); // not used, but kept for possible future filter
const resultsCount = document.getElementById("resultsCount");
const noResults = document.getElementById("noResults");
const itemModal = document.getElementById("itemModal");
const contactModal = document.getElementById("contactModal");

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  // Load items from Google Sheets CSV
  const SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd9ak0x4hKnlFnEoU313y5mk4a1K2yHsYL_6Q-JTU5DDjnZLreqVOsuVe808xA5JmfyeRplGOpM8H7/pub?gid=0&single=true&output=csv";

  function csvToArray(str, delimiter = ",") {
    const rows = str.trim().split("\n");
    const headers = rows.shift().split(delimiter);
    return rows.map(row => {
      const values = row.split(delimiter);
      return headers.reduce((obj, header, i) => {
        obj[header.trim()] = values[i]?.trim() || "";
        return obj;
      }, {});
    });
  }

  fetch(SHEET_CSV_URL)
    .then(res => res.text())
    .then(csv => {
      const items = csvToArray(csv);
      // Optionally, map/convert fields to match your app's expectations
      garageItems = items.map(item => {
        // Trim all fields (no more id)
        const title = (item.Titlu || "").trim();
        const description = (item.Descriere || "").trim();
        const imagesRaw = (item.Imagini || "").trim();
        const images = imagesRaw
          ? imagesRaw
              .split("|")
              .map(url => url.trim())
              .filter(Boolean)
          : [];
        const originalLink = (item.Link || "").trim();
        const disponibil = (item.Disponibil || "").trim().toLowerCase();
        const isAvailable = disponibil === "da" || disponibil === "1" || disponibil === "true";
        const dateAdded = (item.Data || "").trim();
        return {
          title,
          description,
          images,
          originalLink,
          isAvailable,
          dateAdded
        };
      });
      // Sort so available items come first
      garageItems.sort((a, b) => {
        if (a.isAvailable === b.isAvailable) return 0;
        return a.isAvailable ? -1 : 1;
      });
      filteredItems = [...garageItems];
      updateStats();
      renderItems();
      setupEventListeners();
      // Hide loader overlay
      const loader = document.getElementById("loaderOverlay");
      if (loader) loader.style.display = "none";
      // Setup event listeners for search
      function setupEventListeners() {
        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
          searchInput.addEventListener("input", function (e) {
            searchTerm = e.target.value.toLowerCase();
            filterItems();
          });
        }
      }

      // Filter items based on search
      function filterItems() {
        filteredItems = garageItems.filter(item => {
          if (searchTerm) {
            const matchesSearch =
              item.title.toLowerCase().includes(searchTerm) || item.description.toLowerCase().includes(searchTerm);
            if (!matchesSearch) return false;
          }
          return true;
        });
        // Sort so available items come first
        filteredItems.sort((a, b) => {
          if (a.isAvailable === b.isAvailable) return 0;
          return a.isAvailable ? -1 : 1;
        });
        renderItems();
        updateResultsCount();
      }

      // Update results count
      function updateResultsCount() {
        const count = filteredItems.length;
        const total = garageItems.length;
        if (resultsCount) resultsCount.textContent = `Se afișează ${count} din ${total} obiecte`;

        if (count === 0) {
          if (itemsGrid) itemsGrid.style.display = "none";
          if (noResults) noResults.style.display = "block";
        } else {
          if (itemsGrid) itemsGrid.style.display = "grid";
          if (noResults) noResults.style.display = "none";
        }
      }
    })
    .catch(err => {
      console.error("Eroare la încărcarea CSV", err);
      // fallback: show nothing
    });
});

// Update statistics
function updateStats() {
  const availableCount = garageItems.filter(item => item.isAvailable).length;
  const totalCount = garageItems.length;
  const availableCountEl = document.getElementById("availableCount");
  const availableStatsEl = document.getElementById("availableStats");
  if (availableCountEl) availableCountEl.textContent = `${availableCount}/${totalCount}`;
  if (availableStatsEl) availableStatsEl.textContent = availableCount;
}

// Render items grid
function renderItems() {
  itemsGrid.innerHTML = "";
  (filteredItems.length ? filteredItems : garageItems).forEach(item => {
    const itemCard = createItemCard(item);
    itemsGrid.appendChild(itemCard);
  });
}

// Create item card element
function createItemCard(item) {
  const card = document.createElement("div");
  card.className = "item-card";
  card.onclick = () => openItemModal(item);

  const isAvailable = item.isAvailable;
  const hasOriginalLink = item.originalLink;

  const imageUrl = item.images && item.images[0] ? item.images[0] : "assets/default.png";
  card.innerHTML = `
        <div class="item-image-container">
            <img src="${imageUrl}" alt="${item.title}" class="item-image">
            ${
              !isAvailable
                ? `
                <div class="item-status-overlay">
                    <div class="status-badge">Nu Mai Este Disponibil</div>
                </div>
            `
                : ""
            }
            ${
              hasOriginalLink
                ? `
                <div class="original-link-badge">🔗</div>
            `
                : ""
            }
        </div>
        
        <div class="item-content">
            <div class="item-header">
                <h3 class="item-title">${item.title}</h3>
                ${isAvailable ? '<div class="free-badge">GRATUIT</div>' : ""}
            </div>
            
            <p class="item-description">${item.description}</p>
        </div>
    `;

  return card;
}

// Modal functions
function openItemModal(item) {
  currentItem = item;
  currentImageIndex = 0;

  document.getElementById("modalTitle").textContent = item.title;
  document.getElementById("modalDescription").textContent = item.description;
  document.getElementById("modalDate").textContent = `Listat pe ${formatDate(item.dateAdded)}`;

  // Update badges
  const modalBadges = document.getElementById("modalBadges");
  modalBadges.innerHTML = item.isAvailable
    ? '<div class="free-badge">GRATUIT</div>'
    : '<div class="status-badge">Nu Mai Este Disponibil</div>';

  // Update image
  updateModalImage();

  // Update buttons
  const contactBtn = document.getElementById("contactItemBtn");
  const originalBtn = document.getElementById("originalLinkBtn");

  contactBtn.style.display = item.isAvailable ? "block" : "none";
  originalBtn.style.display = item.originalLink ? "block" : "none";

  // Show modal
  itemModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeItemModal(event) {
  if (event && event.target !== event.currentTarget) return;

  itemModal.classList.remove("open");
  document.body.style.overflow = "";
  currentItem = null;
}

function updateModalImage() {
  if (!currentItem) return;

  const modalImage = document.getElementById("modalImage");
  const imageUrl =
    currentItem.images && currentItem.images[currentImageIndex]
      ? currentItem.images[currentImageIndex]
      : "assets/default.png";
  modalImage.src = imageUrl;
  modalImage.alt = currentItem.title;

  // Update dots
  const imageDots = document.getElementById("imageDots");
  if (currentItem.images && currentItem.images.length > 1) {
    imageDots.innerHTML = currentItem.images
      .map(
        (_, index) =>
          `<div class="image-dot ${index === currentImageIndex ? "active" : ""}" 
                  onclick="changeImage(${index})"></div>`
      )
      .join("");
    imageDots.style.display = "flex";
  } else {
    imageDots.style.display = "none";
  }
}

function changeImage(index) {
  currentImageIndex = index;
  updateModalImage();
}

function openContactModal() {
  contactModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeContactModal(event) {
  if (event && event.target !== event.currentTarget) return;

  contactModal.classList.remove("open");
  document.body.style.overflow = "";
}

// Contact functions
function contactAboutItem() {
  if (!currentItem) return;
  const message = `Salut! Sunt interesat de "${currentItem.title}" pe care îl donezi. Mai este disponibil?`;
  const whatsappUrl = `https://wa.me/40730020215?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
}

// Clear search filter
function clearFilters() {
  searchTerm = "";
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
  filterItems();
}

function openOriginalLink() {
  if (currentItem && currentItem.originalLink) {
    let url = currentItem.originalLink.trim();
    // If the link does not start with http or https, add https://
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url.replace(/^\/+/, "");
    }
    window.open(url, "_blank");
  }
}

// Utility functions
function formatDate(dateString) {
  // Fallback date: 12.07.2025
  const fallbackDate = new Date(Date.UTC(2025, 6, 12));
  if (!dateString) {
    return fallbackDate.toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }
  // Try dd/mm/yyyy
  const parts = dateString.split("/");
  if (parts.length === 3) {
    let [day, month, year] = parts.map(p => p.trim());
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      const date = new Date(Date.UTC(y, m - 1, d));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("ro-RO", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      }
    }
  }
  // fallback
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }
  // If all else fails, fallback
  return fallbackDate.toLocaleDateString("ro-RO", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

// Close modals when clicking outside
document.addEventListener("click", function (event) {
  if (event.target.classList.contains("modal-backdrop")) {
    if (event.target === itemModal) {
      closeItemModal();
    } else if (event.target === contactModal) {
      closeContactModal();
    }
  }
});

// Close modals with Escape key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    if (itemModal.classList.contains("open")) {
      closeItemModal();
    } else if (contactModal.classList.contains("open")) {
      closeContactModal();
    }
  }
});
