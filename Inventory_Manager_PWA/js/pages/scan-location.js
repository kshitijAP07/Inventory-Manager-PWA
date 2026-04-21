/**
 * scan-location.js — Step 2 of Add Product
 * Captures location, AUTOFILLS the form, checks collisions, saves to DB on confirm.
 */

IMAuth.requireAuth(['inventory_manager'], '../index.html');

let html5QrCode;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verify pending item
    const pendingItemJSON = sessionStorage.getItem('pending_inventory_item');
    if (!pendingItemJSON) {
        alert("⚠️ No product details found. Please fill out the material form first.");
        window.location.href = 'add-product.html';
        return;
    }

    // 2. Init Scanner
    html5QrCode = new Html5Qrcode("reader");

    const onScanSuccess = (decodedText) => {
        // FIX: Route the scan to the Autofill handler instead of saving instantly
        handleScanResult(decodedText);
    };

    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch((err) => {
        console.warn("Camera init failed.", err);
        document.getElementById("reader").innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ff1744; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; height: 100%; background: #fee; border-radius: 16px;">
                Camera blocked or not found.<br>Use Gallery or Add Manually.
            </div>
        `;
    });

    // 3. Wire Gallery Upload
    document.getElementById('upload-btn').addEventListener('click', () => {
        document.getElementById('qr-upload-input').click();
    });

    document.getElementById('qr-upload-input').addEventListener('change', e => {
        if (e.target.files.length == 0) return;
        html5QrCode.scanFile(e.target.files[0], true)
            .then(decodedText => handleScanResult(decodedText))
            .catch(err => alert("Could not detect a valid QR code in that image."));
    });

    // 4. Wire Toggles
    document.getElementById('toggle-manual-btn').addEventListener('click', (e) => {
        e.preventDefault();
        toggleManualEntry(true);
    });

    document.getElementById('toggle-scanner-btn').addEventListener('click', (e) => {
        e.preventDefault();
        toggleManualEntry(false);
    });

    // 5. Wire Manual Confirm (This is now the ONLY way to save to the database)
    document.getElementById('confirm-manual-btn').addEventListener('click', async () => {
        const rack = document.getElementById('rack-select').value;
        const shelf = document.getElementById('shelf-select').value;
        const position = document.getElementById('position-select').value;

        if (!rack || !shelf || !position) {
            alert("⚠️ Please select a Rack, Shelf, and Position.");
            return;
        }

        const generatedCode = `R${rack}S${shelf}P${position}`;
        await saveToDatabase(generatedCode, parseInt(rack), parseInt(shelf), parseInt(position));
    });
});

function toggleManualEntry(showManual) {
    document.getElementById('scanner-section').style.display = showManual ? 'none' : 'flex';
    document.getElementById('manual-section').style.display = showManual ? 'block' : 'none';
    document.getElementById('page-title').innerText = showManual ? "Add Manually" : "Storage Location";

    if (showManual && html5QrCode && html5QrCode.isScanning) {
        html5QrCode.pause();
    } else if (!showManual && html5QrCode && html5QrCode.isScanning) {
        html5QrCode.resume();
    }
}

// --- NEW FUNCTION: Only parses the QR and autofills the form ---
function handleScanResult(locCode) {
    locCode = locCode.toUpperCase().trim();

    // STRICT FORMAT VALIDATION
    const regex = /^R([1-8])S([1-6])P([1-4])$/;
    const match = locCode.match(regex);
    
    if (!match) {
        alert(`❌ Invalid Scan: ${locCode}\nMust be format R1S1P1.`);
        return;
    }

    const rack = match[1];
    const shelf = match[2];
    const position = match[3];

    // Autofill the Dropdowns!
    document.getElementById('rack-select').value = rack;
    document.getElementById('shelf-select').value = shelf;
    document.getElementById('position-select').value = position;

    // Switch to the form view so the user can verify and click Confirm
    toggleManualEntry(true);
}

// --- NEW FUNCTION: Actually talks to Supabase ---
async function saveToDatabase(locCode, rack, shelf, position) {
    // COLLISION CHECK
    const { data: existingItems, error } = await _supabase
        .from('inventory_items')
        .select('name, quantity')
        .eq('location->>code', locCode)
        .gt('quantity', 0)
        .limit(1);

    if (existingItems && existingItems.length > 0) {
        alert(`❌ Location Conflict!\n${locCode} is occupied by: ${existingItems[0].name} (${existingItems[0].quantity} units)`);
        return;
    }

    // SAVE TO DATABASE
    const pendingItem = JSON.parse(sessionStorage.getItem('pending_inventory_item'));
    
    pendingItem.location = {
        code: locCode,
        rack: rack,
        shelf: shelf,
        position: position
    };

    const { data, err } = await IMData.createInventoryItem(pendingItem);

    if (err) {
        alert("Failed to save: " + err.message);
    } else {
        if (html5QrCode && html5QrCode.isScanning) await html5QrCode.stop();
        sessionStorage.removeItem('pending_inventory_item');
        alert(`✅ Product logged to ${locCode}`);
        window.location.href = 'inventory.html';
    }
}