// 1. Protect Route
IMAuth.requireAuth(['inventory_manager'], '../index.html');

document.addEventListener("DOMContentLoaded", async () => {
    // 2. Handle Tab Switching (Brought over from your inline script)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'stock') {
        switchTab('stock');
    }

    // Wire up tab buttons
    document.getElementById('btn-location').addEventListener('click', () => switchTab('location'));
    document.getElementById('btn-stock').addEventListener('click', () => switchTab('stock'));

    // 3. Load Live Inventory Data
    await loadInventory();
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

async function loadInventory() {
    const items = await IMData.getInventoryItems();
    
    const locView = document.getElementById('view-location');
    const stockView = document.getElementById('view-stock');

    // Clear hardcoded HTML
    locView.innerHTML = '';
    stockView.innerHTML = '';

    if (items.length === 0) {
        stockView.innerHTML = '<p style="text-align: center; padding: 20px;">No inventory items found.</p>';
        return;
    }

    items.forEach(item => {
        // --- Render Location Card ---
        // Safely parse the JSONB location
        const rack = item.location?.rack || 'Unassigned';
        const shelf = item.location?.shelf || 'Unassigned';

        const locCard = `
            <div class="loc-card" onclick="window.location.href='item-detail.html?id=${item.id}'" style="cursor: pointer;">
                <div class="loc-header">${item.name}<br><span class="loc-sub">${item.category}</span></div>
                <div class="loc-qty">${item.quantity}<br><span class="loc-units">${item.unit}</span></div>
                <div class="loc-footer"><span>RN: ${rack}</span><span>SN: ${shelf}</span></div>
            </div>
        `;
        locView.insertAdjacentHTML('beforeend', locCard);


        // --- Render Stock Card ---
        // Map database stock_status to your CSS classes
        let statusClass = 'status-active';
        let statusLabel = 'Adequate';

        if (item.stock_status === 'critical' || item.stock_status === 'out_of_stock') {
            statusClass = 'status-issue'; // Red
            statusLabel = item.stock_status === 'critical' ? 'Critically Low' : 'Out of Stock';
        } else if (item.stock_status === 'low') {
            statusClass = 'status-hold'; // Yellow
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