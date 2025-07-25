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
        const isReserved = disponibil === "rezervat";
        const dateAdded = (item.Data || "").trim();
        const id = slugify(title);
        return {
          id,
          title,
          description,
          images,
          originalLink,
          isAvailable,
          isReserved,
          dateAdded
        };
      });
      // Sort so available items come first
      garageItems.sort((a, b) => {
        // Available first, then reserved, then unavailable
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
        if (a.isReserved && !b.isReserved && !b.isAvailable) return -1;
        if (!a.isReserved && b.isReserved && !a.isAvailable) return 1;
        return 0;
      });
      filteredItems = [...garageItems];
      updateStats();
      updateLastUpdateStat();
      renderItems();
      updateResultsCount();
      setupEventListeners();
      // Hide loader overlay
      const loader = document.getElementById("loaderOverlay");
      if (loader) loader.style.display = "none";
      // After items are loaded, check for deep link
      const params = new URLSearchParams(window.location.search);
      const itemId = params.get("item");
      if (itemId) {
        const item = garageItems.find(i => i.id === itemId);
        if (item) openItemModal(item);
      }
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

  // Set last update stat to the maximum date from garageItems
  function updateLastUpdateStat() {
    if (!garageItems.length) return;
    // Find the max date from all items
    let maxDate = null;
    garageItems.forEach(item => {
      const d = parseDate(item.dateAdded);
      if (d && (!maxDate || d > maxDate)) maxDate = d;
    });
    const lastUpdateEl = document.getElementById("lastUpdate");
    if (lastUpdateEl && maxDate) {
      lastUpdateEl.textContent = maxDate.toLocaleDateString("ro-RO", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    }
  }

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
    // Always count the actual number of cards shown in the grid
    const gridItems = itemsGrid ? itemsGrid.children.length : 0;
    const total = garageItems.length;
    if (resultsCount) resultsCount.textContent = `Se afișează ${gridItems} din ${total} obiecte`;

    if (gridItems === 0) {
      if (itemsGrid) itemsGrid.style.display = "none";
      if (noResults) noResults.style.display = "block";
    } else {
      if (itemsGrid) itemsGrid.style.display = "grid";
      if (noResults) noResults.style.display = "none";
    }
  }
});

// Helper to parse date from dd/mm/yyyy or ISO
function parseDate(dateString) {
  if (!dateString) return null;

  const parts = dateString.split("/");
  if (parts.length === 3) {
    let [day, month, year] = parts.map(p => p.trim());
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      const date = new Date(Date.UTC(y, m - 1, d));
      if (!isNaN(date.getTime())) return date;
    }
  }
  // fallback
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) return date;
  return null;
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
  const isReserved = item.isReserved;
  const hasOriginalLink = item.originalLink;

  const imageUrl = item.images && item.images[0] ? item.images[0] : "assets/default.png";
  card.innerHTML = `
        <div class="item-image-container">
            <img src="${imageUrl}" alt="${item.title}" class="item-image">
            ${
              !isAvailable && !isReserved
                ? `
                <div class="item-status-overlay">
                    <div class="status-badge">Nu mai este disponibil</div>
                </div>
            `
                : ""
            }
            ${
              isReserved
                ? `
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <div class="status-badge status-badge-blue">Obiect rezervat</div>
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
  if (item.isAvailable) {
    modalBadges.innerHTML = '<div class="free-badge">GRATUIT</div>';
  } else if (item.isReserved) {
    modalBadges.innerHTML = '<div class="status-badge status-badge-blue">Rezervat</div>';
  } else {
    modalBadges.innerHTML = '<div class="status-badge">Nu Mai Este Disponibil</div>';
  }

  // Update image
  updateModalImage();

  // Update buttons
  const contactBtn = document.getElementById("contactItemBtn");
  const originalBtn = document.getElementById("originalLinkBtn");

  contactBtn.style.display = item.isAvailable || item.isReserved ? "block" : "none";
  originalBtn.style.display = item.originalLink ? "block" : "none";

  // Update URL for deep link
  if (item.id) {
    window.history.pushState({}, "", `?item=${encodeURIComponent(item.id)}`);
  }
  // Show modal
  itemModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeItemModal(event) {
  if (event && event.target !== event.currentTarget) return;

  itemModal.classList.remove("open");
  document.body.style.overflow = "";
  currentItem = null;
  // Restore URL
  window.history.pushState({}, "", window.location.pathname);
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

  // Show/hide nav buttons
  const prevBtn = document.getElementById("imagePrevBtn");
  const nextBtn = document.getElementById("imageNextBtn");
  if (currentItem.images && currentItem.images.length > 1) {
    prevBtn.classList.remove("modal-image-nav-hidden");
    nextBtn.classList.remove("modal-image-nav-hidden");
    prevBtn.disabled = currentImageIndex === 0;
    nextBtn.disabled = currentImageIndex === currentItem.images.length - 1;
  } else {
    prevBtn.classList.add("modal-image-nav-hidden");
    nextBtn.classList.add("modal-image-nav-hidden");
  }
}

function prevImage(event) {
  event.stopPropagation();
  if (!currentItem || currentImageIndex === 0) return;
  currentImageIndex--;
  updateModalImage();
}

function nextImage(event) {
  event.stopPropagation();
  if (!currentItem || currentImageIndex >= currentItem.images.length - 1) return;
  currentImageIndex++;
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

// Utility: slugify for item IDs
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
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

window.changeImage = function (index) {
  if (!currentItem || !currentItem.images || index < 0 || index >= currentItem.images.length) return;
  currentImageIndex = index;
  updateModalImage();
};
