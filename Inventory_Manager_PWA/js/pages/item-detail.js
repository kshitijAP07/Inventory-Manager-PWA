// Protect Route
IMAuth.requireAuth(['inventory_manager'], '../index.html');

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    if (!itemId) {
        alert("No item selected.");
        window.location.href = 'inventory.html?tab=stock';
        return;
    }

    const item = await IMData.getInventoryItemById(itemId);

    if (!item) {
        alert("Item not found in database.");
        window.location.href = 'inventory.html?tab=stock';
        return;
    }

    // 1. Header & Main Card
    document.getElementById('detail-name').textContent = item.name;
    document.getElementById('detail-category').textContent = item.category;
    document.getElementById('detail-qty').textContent = item.quantity;
    document.getElementById('detail-units').textContent = item.unit.charAt(0).toUpperCase() + item.unit.slice(1);

    // 2. Status Badge Logic
    const statusEl = document.getElementById('detail-status');
    if (item.stock_status === 'critical' || item.stock_status === 'out_of_stock') {
        statusEl.className = 'status-badge status-issue';
        statusEl.textContent = item.stock_status === 'critical' ? 'Critically Low' : 'Out of Stock';
    } else if (item.stock_status === 'low') {
        statusEl.className = 'status-badge status-hold';
        statusEl.textContent = 'Getting Low';
    } else {
        statusEl.className = 'status-badge status-active';
        statusEl.textContent = 'Adequate';
    }

    // 3. Stock Details Section
    document.getElementById('det-qty').textContent = `${item.quantity} ${item.unit.charAt(0).toUpperCase() + item.unit.slice(1)}`;
    document.getElementById('det-min').textContent = `${item.min_threshold} ${item.unit.charAt(0).toUpperCase() + item.unit.slice(1)}`;
    document.getElementById('det-max').textContent = `${item.max_capacity} ${item.unit.charAt(0).toUpperCase() + item.unit.slice(1)}`;
    
    // Parse JSONB location safely
    const rack = item.location?.rack || 'N/A';
    const shelf = item.location?.shelf || 'N/A';
    const locString = `Rack ${rack} Shelf ${shelf}`;
    document.getElementById('det-loc1').textContent = locString;

    // Formatting Date safely
    const updatedDate = new Date(item.updated_at);
    document.getElementById('det-updated').textContent = updatedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('det-updated-by').textContent = Array.isArray(item.last_updated_by) ? item.last_updated_by.join(', ') : 'System';

    // 4. Where We Bought Section (From JSONB)
    document.getElementById('det-supplier').textContent = item.supplier_info?.name || 'N/A';
    document.getElementById('det-city').textContent = item.supplier_info?.city || 'N/A';
    document.getElementById('det-po').textContent = item.supplier_info?.po || 'N/A';
    document.getElementById('det-email').textContent = item.supplier_info?.email || 'N/A';

    // 5. Notes
    document.getElementById('det-notes').textContent = item.storage_notes || 'No specific storage notes available.';
// 6. Wire up Edit Button
    const editBtn = document.getElementById('btn-edit-item');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            window.location.href = `edit-location.html?id=${itemId}`;
        });
    }
});
