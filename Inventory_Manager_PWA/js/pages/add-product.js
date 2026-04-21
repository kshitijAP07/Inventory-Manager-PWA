/**
 * add-product.js — Inventory Manager Add Product (Step 1)
 * Saves item details to sessionStorage, then routes to location scanner
 */

IMAuth.requireAuth(['inventory_manager'], '../index.html')

document.addEventListener('DOMContentLoaded', () => {
    // Wire stepper buttons
    document.querySelectorAll('.stepper-row').forEach(row => {
        const minusBtn = row.querySelector('.minus')
        const plusBtn = row.querySelector('.plus')
        const input = row.querySelector('input[type="number"]')

        if (minusBtn && input) {
            minusBtn.addEventListener('click', () => {
                const val = parseInt(input.value) || 0
                if (val > 0) input.value = val - 1
            })
        }
        if (plusBtn && input) {
            plusBtn.addEventListener('click', () => {
                input.value = (parseInt(input.value) || 0) + 1
            })
        }
    })

    // Wire submit button
    const submitBtn = document.querySelector('.btn-primary.center-btn')
    if (submitBtn) {
        submitBtn.addEventListener('click', handleProceedToScan)
    }
})

async function handleProceedToScan() {
    const user = await IMAuth.getCurrentUser()

    const urlParams = new URLSearchParams(window.location.search)
    const mode = urlParams.get('mode')
    const scannedData = urlParams.get('data')

    let materialName = ''
    
    // FIX: Safely extract the name from the JSON payload
    if (mode === 'scanned' && scannedData) {
        try {
            const parsed = JSON.parse(scannedData);
            materialName = parsed.name || '';
        } catch (e) {
            materialName = scannedData; // Fallback for plain text
        }
    } else {
        materialName = document.getElementById('add-material-name')?.value?.trim() || ''
    }

    if (!materialName) {
        alert('Please enter a material name.')
        return
    }

    // Gather all form data using the specific IDs and classes
    const pendingItem = {
        name: materialName,
        batch_number: document.getElementById('add-batch-number')?.value?.trim() || '',
        qr_code: document.getElementById('manual-qr-field')?.value?.trim() || '',
        category: document.getElementById('add-category')?.value || '',
        
        // Quantity & Unit
        quantity: parseInt(document.querySelector('.input-qty')?.value) || 0,
        unit: document.querySelector('.input-units')?.value || 'units',
        
        // Steppers
        min_threshold: parseInt(document.querySelectorAll('.stepper-row input')[0]?.value) || 0,
        max_capacity: parseInt(document.querySelectorAll('.stepper-row input')[1]?.value) || 0,
        
        // Supplier Info
        supplier_info: {
            name: document.getElementById('add-supplier-name')?.value?.trim() || '',
            city: document.getElementById('add-supplier-city')?.value?.trim() || '',
            phone: document.getElementById('add-supplier-phone')?.value?.trim() || '',
            email: document.getElementById('add-supplier-email')?.value?.trim() || '',
            po: ''
        },
        
        storage_notes: document.getElementById('add-storage-notes')?.value?.trim() || '',
        last_updated_by: user ? [user.display_name || user.email] : []
    }

    // Save to sessionStorage and route to the new scanner page
    sessionStorage.setItem('pending_inventory_item', JSON.stringify(pendingItem))
    window.location.href = 'scan-location.html'
}