// Protect Route
IMAuth.requireAuth(['inventory_manager'], '../index.html');

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Grab the ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    if (!itemId) {
        alert("No item selected.");
        window.location.href = 'inventory.html?tab=stock';
        return;
    }

    // 2. Fetch the specific item from Supabase
    const item = await IMData.getInventoryItemById(itemId);

    if (!item) {
        alert("Item not found in database.");
        window.location.href = 'inventory.html?tab=stock';
        return;
    }

    // 3. Inject the Core Data
    document.getElementById('detail-name').textContent = item.name;
    document.getElementById('detail-category').textContent = item.category;
    document.getElementById('detail-qty').textContent = item.quantity;
    document.getElementById('detail-units').textContent = item.unit;

    // 4. Handle Status Badge Styling
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

    // 5. Inject Stock Details
    document.getElementById('det-qty').textContent = `${item.quantity} ${item.unit}`;
    document.getElementById('det-min').textContent = `${item.min_threshold} ${item.unit}`;
    document.getElementById('det-max').textContent = `${item.max_capacity} ${item.unit}`;
    
    // Parse JSONB location safely
    const rack = item.location?.rack || 'N/A';
    const shelf = item.location?.shelf || 'N/A';
    const locString = `Rack ${rack} Shelf ${shelf}`;
    document.getElementById('det-loc1').textContent = locString;
    document.getElementById('det-loc2').textContent = locString;

    // Format Dates & Arrays
    document.getElementById('det-updated').textContent = new Date(item.updated_at).toLocaleDateString();
    document.getElementById('det-updated-by').textContent = Array.isArray(item.last_updated_by) ? item.last_updated_by.join(', ') : 'System';

    // 6. Inject Supplier Info (JSONB)
    document.getElementById('det-supplier').textContent = item.supplier_info?.name || 'N/A';
    document.getElementById('det-city').textContent = item.supplier_info?.city || 'N/A';
    document.getElementById('det-po').textContent = item.supplier_info?.po || 'N/A';

    // 7. Inject Notes
    document.getElementById('det-notes').textContent = item.storage_notes || 'No specific storage notes available.';
});