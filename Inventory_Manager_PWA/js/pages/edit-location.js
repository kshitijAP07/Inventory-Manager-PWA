/**
 * edit-location.js — Update an item's location or delete it entirely
 */
IMAuth.requireAuth(['inventory_manager'], '../index.html');

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    if (!itemId) {
        alert("No item selected to update.");
        window.location.href = 'inventory.html';
        return;
    }

    // 1. Scanner vs Manual Toggles
    const manualBtn = document.getElementById('toggle-manual-btn');
    const scannerBtn = document.getElementById('toggle-scanner-btn');
    const manualSec = document.getElementById('manual-section');
    const scannerSec = document.getElementById('scanner-section');

    const html5QrCode = new Html5Qrcode("reader");

    manualBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scannerSec.style.display = 'none';
        manualSec.style.display = 'block';
        if (html5QrCode.isScanning) html5QrCode.stop();
    });

    scannerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        manualSec.style.display = 'none';
        scannerSec.style.display = 'flex';
        startScanner();
    });

    // 2. Scanner Logic
    // 2. Scanner Logic
    const processScan = async (decodedText) => {
        try {
            await html5QrCode.stop();
            
            let locData;
            try {
                // If the QR code is exactly your JSON format: 
                // {"code": "R5S3P1", "rack": 5, "shelf": 3, "position": 1}
                locData = JSON.parse(decodedText);
            } catch(e) {
                // Fallback: If it's just raw text, create a default fallback so it doesn't crash
                locData = { 
                    code: "UNKNOWN", 
                    rack: 0, 
                    shelf: 0, 
                    position: 0 
                };
            }
            
            await updateDatabaseLocation(itemId, locData);
        } catch (err) {
            console.error("Scanner error:", err);
        }
    };

    function startScanner() {
        html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, 
            processScan
        ).catch(err => console.log("Camera init failed."));
    }

    // Start scanner on load
    startScanner();

    // 3. Manual Update Logic
    document.getElementById('confirm-manual-btn').addEventListener('click', async () => {
        const rackInput = document.getElementById('rack-select').value;
        const shelfInput = document.getElementById('shelf-select').value;
        const positionInput = document.getElementById('position-select').value;
        
        if (!rackInput || !shelfInput) {
            alert('Please select at least a Rack and Shelf.');
            return;
        }

        // Convert the string inputs into actual Numbers
        const rackNum = parseInt(rackInput, 10);
        const shelfNum = parseInt(shelfInput, 10);
        // Default to position 1 if the user leaves it blank
        const positionNum = positionInput ? parseInt(positionInput, 10) : 1; 

        // Construct the EXACT requested JSON format
        const locData = { 
            code: `R${rackNum}S${shelfNum}P${positionNum}`,
            rack: rackNum, 
            shelf: shelfNum, 
            position: positionNum 
        };
        
        await updateDatabaseLocation(itemId, locData);
    });

    function startScanner() {
        html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, 
            processScan
        ).catch(err => console.log("Camera init failed."));
    }

    // Start scanner on load
    startScanner();

    // 3. Manual Update Logic
    document.getElementById('confirm-manual-btn').addEventListener('click', async () => {
        const rack = document.getElementById('rack-select').value;
        const shelf = document.getElementById('shelf-select').value;
        
        if (!rack || !shelf) {
            alert('Please select at least a Rack and Shelf.');
            return;
        }

        const locData = { rack: rack, shelf: shelf, position: document.getElementById('position-select').value || '' };
        await updateDatabaseLocation(itemId, locData);
    });

    // 4. Delete Stock Logic (DANGER)
    document.getElementById('delete-stock-btn').addEventListener('click', async () => {
        const confirmed = confirm("⚠️ DANGER: Are you sure you want to permanently delete this inventory record? This is usually done for expired or defective material.");
        
        if (confirmed) {
            try {
                const { error } = await IMData.deleteInventoryItem(itemId);
                if (error) throw error;
                
                alert('✅ Stock deleted successfully.');
                window.location.href = 'inventory.html';
            } catch (err) {
                alert('Failed to delete stock: ' + err.message);
            }
        }
    });
});

// Helper to push location updates to Supabase
async function updateDatabaseLocation(itemId, locData) {
    try {
        const { error } = await IMData.updateInventoryItem(itemId, { location: locData });
        if (error) throw error;

        alert('✅ Location updated successfully!');
        window.location.href = `item-detail.html?id=${itemId}`;
    } catch (err) {
        alert('Failed to update location: ' + err.message);
    }
}