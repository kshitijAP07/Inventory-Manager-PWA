// 1. Protect Route
IMAuth.requireAuth(['inventory_manager'], '../index.html');

// Global cache for instant filtering
let globalInventoryData = [];

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'stock') {
        switchTab('stock');
    }

    // Wire up tab buttons
    document.getElementById('btn-location').addEventListener('click', () => switchTab('location'));
    document.getElementById('btn-stock').addEventListener('click', () => switchTab('stock'));

    // Wire up filter panel toggle
    document.getElementById('toggle-advanced-filters').addEventListener('click', () => {
        const panel = document.getElementById('advanced-filters-panel');
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    });

    // Event Listeners for Filters
    document.getElementById('search-input').addEventListener('input', handleFilterChange);
    document.getElementById('filter-category').addEventListener('change', handleFilterChange);
    document.getElementById('filter-status').addEventListener('change', handleFilterChange);
    document.getElementById('sort-by').addEventListener('change', handleFilterChange);

    // Wire up clear search icon
    const searchInput = document.getElementById('search-input');
    const clearIcon = document.getElementById('clear-search');
    searchInput.addEventListener('input', (e) => {
        clearIcon.style.display = e.target.value.length > 0 ? 'block' : 'none';
    });
    clearIcon.addEventListener('click', () => {
        searchInput.value = '';
        clearIcon.style.display = 'none';
        handleFilterChange();
    });

    // Wire up Quick Pills
    document.querySelectorAll('#quick-filters .filter-pill-orange').forEach(pill => {
        pill.addEventListener('click', (e) => {
            // Reset active states
            document.querySelectorAll('#quick-filters .filter-pill-orange').forEach(p => {
                p.classList.remove('active');
                p.style.background = '#FFF';
                p.style.color = 'var(--color-primary)';
            });
            
            // Set clicked to active
            e.target.classList.add('active');
            e.target.style.background = 'var(--color-primary)';
            e.target.style.color = '#FFF';

            // Sync with advanced dropdown and trigger filter
            const filterType = e.target.getAttribute('data-filter');
            const statusDropdown = document.getElementById('filter-status');
            
            if (filterType === 'low_stock') {
                statusDropdown.value = 'issue';
            } else {
                statusDropdown.value = 'all';
            }
            handleFilterChange();
        });
    });

    // Load Live Inventory Data
    await fetchAndInitializeInventory();
});

function switchTab(tab) {
    const locView = document.getElementById('view-location');
    const stockView = document.getElementById('view-stock');
    const btnLoc = document.getElementById('btn-location');
    const btnStock = document.getElementById('btn-stock');
    const title = document.getElementById('inventory-title');

    if (tab === 'location') {
        locView.style.display = 'grid';
        stockView.style.display = 'none';
        btnLoc.classList.add('active');
        btnStock.classList.remove('active');
        title.innerText = 'Check Location';
    } else {
        locView.style.display = 'none';
        stockView.style.display = 'flex';
        btnStock.classList.add('active');
        btnLoc.classList.remove('active');
        title.innerText = 'Stock Inventory';
    }
}

async function fetchAndInitializeInventory() {
    // Show a temporary loading state
    document.getElementById('view-location').innerHTML = '<p style="text-align: center; width: 100%;">Loading inventory...</p>';
    document.getElementById('view-stock').innerHTML = '<p style="text-align: center; width: 100%;">Loading inventory...</p>';

    // Fetch once and store in memory
    globalInventoryData = await IMData.getInventoryItems() || [];
    
    // Auto-populate Category Dropdown based on live data
    populateDynamicDropdowns();

    // Run initial render
    handleFilterChange();
}

function populateDynamicDropdowns() {
    const categorySet = new Set();
    globalInventoryData.forEach(item => {
        if (item.category) categorySet.add(item.category);
    });

    const catDropdown = document.getElementById('filter-category');
    categorySet.forEach(cat => {
        catDropdown.insertAdjacentHTML('beforeend', `<option value="${cat}">${cat}</option>`);
    });
}

function handleFilterChange() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const categoryFilter = document.getElementById('filter-category').value;
    const statusFilter = document.getElementById('filter-status').value;
    const sortBy = document.getElementById('sort-by').value;

    // 1. Filter Data
    let filteredData = globalInventoryData.filter(item => {
        // Search Filter (Name, Category, or Batch Number if it exists)
        const matchSearch = !searchTerm || 
                            item.name?.toLowerCase().includes(searchTerm) || 
                            item.category?.toLowerCase().includes(searchTerm) ||
                            item.batch_number?.toLowerCase().includes(searchTerm) ||
                            item.location?.rack?.toLowerCase().includes(searchTerm);

        // Category Filter
        const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;

        // Status Filter
        let matchStatus = true;
        if (statusFilter === 'issue') {
            matchStatus = ['low', 'critical', 'out_of_stock'].includes(item.stock_status);
        } else if (statusFilter === 'adequate') {
            matchStatus = item.stock_status === 'adequate' || item.stock_status === 'good';
        }

        return matchSearch && matchCategory && matchStatus;
    });

    // 2. Sort Data
    filteredData.sort((a, b) => {
        if (sortBy === 'name_asc') {
            return (a.name || '').localeCompare(b.name || '');
        } else if (sortBy === 'recent') {
            // Requires 'created_at' in Supabase, falls back to ID if missing
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA; // Newest first
        } else if (sortBy === 'qty_low') {
            return (a.quantity || 0) - (b.quantity || 0);
        }
        return 0;
    });

    // 3. Render
    renderItems(filteredData);
}

function renderItems(items) {
    const locView = document.getElementById('view-location');
    const stockView = document.getElementById('view-stock');

    locView.innerHTML = '';
    stockView.innerHTML = '';

    if (items.length === 0) {
        const noDataHTML = '<p style="text-align: center; padding: 20px; width: 100%; color: #888;">No items match your filters.</p>';
        locView.innerHTML = noDataHTML;
        stockView.innerHTML = noDataHTML;
        return;
    }

    items.forEach(item => {
        const rack = item.location?.rack || 'Unassigned';
        const shelf = item.location?.shelf || 'Unassigned';

        // --- Render Location Card ---
        const locCard = `
            <div class="loc-card" onclick="window.location.href='item-detail.html?id=${item.id}'" style="cursor: pointer;">
                <div class="loc-header">${item.name}<br><span class="loc-sub">${item.category}</span></div>
                <div class="loc-qty">${item.quantity}<br><span class="loc-units">${item.unit}</span></div>
                <div class="loc-footer"><span>RN: ${rack}</span><span>SN: ${shelf}</span></div>
            </div>
        `;
        locView.insertAdjacentHTML('beforeend', locCard);

        // --- Render Stock Card ---
        let statusClass = 'status-active';
        let statusLabel = 'Adequate';

        if (item.stock_status === 'critical' || item.stock_status === 'out_of_stock') {
            statusClass = 'status-issue'; 
            statusLabel = item.stock_status === 'critical' ? 'Critically Low' : 'Out of Stock';
        } else if (item.stock_status === 'low') {
            statusClass = 'status-hold'; 
            statusLabel = 'Getting Low';
        }

        const stockCard = `
            <div class="stock-card" onclick="window.location.href='item-detail.html?id=${item.id}'">
                <div class="stock-header">
                    <div class="stock-title-area">
                        <h3>${item.name}</h3>
                        <p>${item.category}</p>
                    </div>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </div>
                <div class="stock-qty-center">${item.quantity}<br><span>${item.unit}</span></div>
                <div class="stock-footer"><span>Rack: ${rack}</span><span>Shelf: ${shelf}</span></div>
            </div>
        `;
        stockView.insertAdjacentHTML('beforeend', stockCard);
    });
}