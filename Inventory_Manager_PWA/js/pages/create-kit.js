/**
 * create-kit.js — Inventory Manager Create Kit (Step 2)
 */

IMAuth.requireAuth(['inventory_manager'], '../index.html')

let inventoryStock = [];

document.addEventListener('DOMContentLoaded', async () => {
    await populateMaterialSelect()

    const nextBtn = document.getElementById('next-btn')
    if (nextBtn) {
        nextBtn.addEventListener('click', handleNext)
    }

    // Check if we arrived here from a scanner
    const urlParams = new URLSearchParams(window.location.search);
    const scannedData = urlParams.get('data');
    if (scannedData) {
        document.getElementById('scanned-item-container').style.display = 'flex';
        document.getElementById('scanned-data-text').innerText = scannedData;
    }
})

async function populateMaterialSelect() {
    try {
        inventoryStock = await IMData.getInventoryItems()
        const matSelect = document.getElementById('material-select')
        if (!matSelect) return

        matSelect.innerHTML = '<option value="" disabled selected>Select Material</option>'

        inventoryStock.forEach(item => {
            matSelect.insertAdjacentHTML('beforeend',
                `<option value="${item.id}" data-name="${item.name}" data-qty="${item.quantity}">${item.name} (${item.quantity} ${item.unit} available)</option>`
            )
        })
    } catch (err) {
        console.error('[Create Kit] Failed to load materials:', err)
    }
}

function handleNext() {
    const kitItems = []

    // Check Manual Dropdown
    const matSelect = document.getElementById('material-select')
    if (matSelect && matSelect.value) {
        const selectedOption = matSelect.options[matSelect.selectedIndex]
        const materialId = matSelect.value
        const materialName = selectedOption.dataset.name
        const maxQty = parseInt(selectedOption.dataset.qty) || 0
        
        const manualQty = parseInt(document.getElementById('manual-qty').value)
        const manualUnit = document.getElementById('manual-unit').value

        if (isNaN(manualQty) || manualQty <= 0) {
            alert(`⚠️ Compulsory: Please enter a valid quantity for ${materialName}.`)
            return
        }
        if (manualQty > maxQty) {
            alert(`❌ Error: Only ${maxQty} units of ${materialName} are available in stock.`)
            return
        }

        kitItems.push({ id: materialId, name: materialName, quantity: manualQty, unit: manualUnit })
    }

    // Check Scanned Item
    const scannedContainer = document.getElementById('scanned-item-container')
    if (scannedContainer.style.display !== 'none') {
        const scannedName = document.getElementById('scanned-data-text').innerText
        const scannedQty = parseInt(document.getElementById('scanned-qty').value)
        const scannedUnit = document.getElementById('scanned-unit').value

        if (isNaN(scannedQty) || scannedQty <= 0) {
            alert(`⚠️ Compulsory: Please enter a valid quantity for the scanned item.`)
            return
        }
        // Push scanned item (Note: We use fake ID for raw scanned text, or match it to DB later)
        kitItems.push({ id: null, name: scannedName, quantity: scannedQty, unit: scannedUnit })
    }

    if (kitItems.length === 0) {
        alert("⚠️ Please select a material or scan an item before proceeding.")
        return
    }

    sessionStorage.setItem('im_kit_items', JSON.stringify(kitItems))
    window.location.href = 'allot-kit.html'
}