// Garage Sale JavaScript

// Load garageItems from JSON file
let garageItems = [];

const contactInfo = {
  email: "hello@freegaraggsale.com",
  phone: "(555) 123-4567",
  location: "Zona Centrală, Oraș",
};

// State management
let filteredItems = [];
let searchTerm = "";
let showAvailableOnly = false;
let currentItem = null;
let currentImageIndex = 0;

// DOM elements
const itemsGrid = document.getElementById("itemsGrid");
const searchInput = document.getElementById("searchInput");
const availableFilter = document.getElementById("availableFilter");
const resultsCount = document.getElementById("resultsCount");
const noResults = document.getElementById("noResults");
const itemModal = document.getElementById("itemModal");
const contactModal = document.getElementById("contactModal");

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  fetch("garage-items.json")
    .then((res) => res.json())
    .then((data) => {
      garageItems = data;
      filteredItems = [...garageItems];
      updateStats();
      renderItems();
      setupEventListeners();
    })
    .catch((err) => {
      console.error("Eroare la încărcarea garage-items.json", err);
      // fallback: show nothing
    });
});

// Setup event listeners
function setupEventListeners() {
  searchInput.addEventListener("input", function (e) {
    searchTerm = e.target.value.toLowerCase();
    filterItems();
  });
}

// Update statistics
function updateStats() {
  const availableCount = garageItems.filter((item) => item.isAvailable).length;
  const totalCount = garageItems.length;
  const availableCountEl = document.getElementById("availableCount");
  const availableStatsEl = document.getElementById("availableStats");
  if (availableCountEl)
    availableCountEl.textContent = `${availableCount}/${totalCount}`;
  if (availableStatsEl) availableStatsEl.textContent = availableCount;
}

// Filter items based on search and filters
function filterItems() {
  filteredItems = garageItems.filter((item) => {
    // Search filter
    if (searchTerm) {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm);
      if (!matchesSearch) return false;
    }

    // Available only filter
    if (showAvailableOnly && !item.isAvailable) {
      return false;
    }

    return true;
  });

  renderItems();
  updateResultsCount();
}

// Update results count
function updateResultsCount() {
  const count = filteredItems.length;
  const total = garageItems.length;
  if (resultsCount)
    resultsCount.textContent = `Se afișează ${count} din ${total} obiecte`;

  if (count === 0) {
    if (itemsGrid) itemsGrid.style.display = "none";
    if (noResults) noResults.style.display = "block";
  } else {
    if (itemsGrid) itemsGrid.style.display = "grid";
    if (noResults) noResults.style.display = "none";
  }
}

// Render items grid
function renderItems() {
  itemsGrid.innerHTML = "";

  filteredItems.forEach((item) => {
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

  card.innerHTML = `
        <div class="item-image-container">
            <img src="${item.images[0]}" alt="${item.title}" class="item-image">
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
  document.getElementById("modalDate").textContent = `Listat pe ${formatDate(
    item.dateAdded
  )}`;

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
  modalImage.src = currentItem.images[currentImageIndex];
  modalImage.alt = currentItem.title;

  // Update dots
  const imageDots = document.getElementById("imageDots");
  if (currentItem.images.length > 1) {
    imageDots.innerHTML = currentItem.images
      .map(
        (_, index) =>
          `<div class="image-dot ${
            index === currentImageIndex ? "active" : ""
          }" 
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

// Filter functions
function toggleAvailableFilter() {
  showAvailableOnly = !showAvailableOnly;
  availableFilter.classList.toggle("active", showAvailableOnly);
  filterItems();
}

function clearFilters() {
  searchTerm = "";
  showAvailableOnly = false;
  searchInput.value = "";
  availableFilter.classList.remove("active");
  filterItems();
}

// Contact functions
function contactAboutItem() {
  if (!currentItem) return;

  const subject = `Interesat de: ${currentItem.title}`;
  const body = `Salut! Sunt interesat de "${currentItem.title}" pe care îl ai disponibil gratuit. Mai este disponibil?`;

  window.location.href = `mailto:${
    contactInfo.email
  }?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function sendEmail() {
  window.location.href = `mailto:${contactInfo.email}`;
}

function callPhone() {
  window.location.href = `tel:${contactInfo.phone}`;
}

function openOriginalLink() {
  if (currentItem && currentItem.originalLink) {
    window.open(currentItem.originalLink, "_blank");
  }
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("ro-RO", {
    year: "numeric",
    month: "long",
    day: "numeric",
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
