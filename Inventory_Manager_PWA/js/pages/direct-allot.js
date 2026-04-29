/**
 * direct-allot.js — Fast-Track 1-Step Kit Allotment
 */
IMAuth.requireAuth(['inventory_manager'], '../index.html')

let inventoryStock = [];
const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('targetId');
const targetType = urlParams.get('type');
const targetName = urlParams.get('name');

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Set Title
    if (targetName) {
        document.getElementById('direct-title').textContent = `Allot to ${targetName}`;
    }

    // 2. Setup Scanner Link to return to THIS page, not the 3-step page
    // Setup Scanner Link to return to the NEW direct scanner
    document.getElementById('scan-link').addEventListener('click', () => {
        window.location.href = `direct-scan.html?targetId=${targetId}&type=${targetType}&name=${targetName}`;
    });

    // 3. Handle Scanned Data
    const scannedData = urlParams.get('data');
    if (scannedData) {
        document.getElementById('scanned-item-container').style.display = 'flex';
        document.getElementById('scanned-data-text').innerText = scannedData;
    }

    await populateMaterialSelect();

    document.getElementById('confirm-btn').addEventListener('click', handleConfirm);
});

async function populateMaterialSelect() {
    inventoryStock = await IMData.getInventoryItems()
    const matSelect = document.getElementById('material-select')
    inventoryStock.forEach(item => {
        matSelect.insertAdjacentHTML('beforeend',
            `<option value="${item.id}" data-name="${item.name}" data-qty="${item.quantity}">${item.name} (${item.quantity} ${item.unit} available)</option>`
        )
    })
}

async function handleConfirm() {
    if (!targetId) { alert("Missing target location."); return; }
    
    const kitItems = [];
    const matSelect = document.getElementById('material-select');
    
    // Manual Input
    if (matSelect && matSelect.value) {
        const opt = matSelect.options[matSelect.selectedIndex];
        const qty = parseInt(document.getElementById('manual-qty').value);
        if (!qty || qty <= 0) return alert("Please enter a valid quantity.");
        if (qty > parseInt(opt.dataset.qty)) return alert("Not enough stock available.");
        kitItems.push({ id: matSelect.value, name: opt.dataset.name, quantity: qty, unit: document.getElementById('manual-unit').value });
    }

    // Scanned Input
    const scanContainer = document.getElementById('scanned-item-container');
    if (scanContainer.style.display !== 'none') {
        const sqty = parseInt(document.getElementById('scanned-qty').value);
        if (!sqty || sqty <= 0) return alert("Please enter a valid scanned quantity.");
        kitItems.push({ id: null, name: document.getElementById('scanned-data-text').innerText, quantity: sqty, unit: document.getElementById('scanned-unit').value });
    }

    if (kitItems.length === 0) return alert("Please select or scan an item.");

    const user = await IMAuth.getCurrentUser();
    
    // Create the kit in DB (handling both Assembly and Workstation)
    const kitPayload = {
        name: 'Kit-' + Date.now().toString(36).toUpperCase(),
        items: kitItems,
        status: 'created',
        created_by: user?.id
    };
    
    if (targetType === 'assembly') kitPayload.assembly_line_id = targetId;
    else kitPayload.workstation_id = targetId;

    const { error } = await IMData.createKit(kitPayload);
    if (error) return alert('Failed to allot: ' + error.message);

    // Subtract from inventory
    for (let item of kitItems) {
        if (item.id) {
            const dbItem = await IMData.getInventoryItemById(item.id);
            if (dbItem) await IMData.updateInventoryItem(item.id, { quantity: dbItem.quantity - item.quantity });
        }
    }

    alert('✅ Kit Allotted Successfully! Inventory subtracted.');
    window.location.href = `ws-detail.html?id=${targetId}&type=${targetType}`;
}