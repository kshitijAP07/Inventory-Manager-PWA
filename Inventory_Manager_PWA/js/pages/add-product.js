/**
 * add-product.js — Inventory Manager Add Product
 * Save new inventory items to Supabase
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
        submitBtn.addEventListener('click', handleAddProduct)
    }
})

async function handleAddProduct() {
    const user = await IMAuth.getCurrentUser()

    const form = document.querySelector('.product-form')
    if (!form) return

    // Determine if scanned mode
    const urlParams = new URLSearchParams(window.location.search)
    const mode = urlParams.get('mode')
    const scannedData = urlParams.get('data')

    let materialName = ''
    let batchNumber = ''
    let qrCode = ''

    if (mode === 'scanned') {
        materialName = scannedData || ''
        // In scanned mode, manual-inputs-container is hidden
        const batchInput = form.querySelectorAll('input.custom-input')[0]
        batchNumber = batchInput?.value?.trim() || ''
    } else {
        // Manual mode
        const manualContainer = document.getElementById('manual-inputs-container')
        const nameInput = manualContainer?.querySelector('.custom-input')
        materialName = nameInput?.value?.trim() || ''

        const allInputs = form.querySelectorAll('input.custom-input')
        batchNumber = allInputs[1]?.value?.trim() || ''
        qrCode = document.getElementById('manual-qr-field')?.value?.trim() || ''
    }

    // Category select
    const categorySelect = form.querySelector('.select-input:not(.input-units)')
    const category = categorySelect?.value || ''

    // Quantity & Unit
    const qtyInput = form.querySelector('.input-qty')
    const unitSelect = form.querySelector('.input-units')
    const quantity = parseInt(qtyInput?.value) || 0
    const unit = unitSelect?.value || 'units'

    // Min threshold & Max capacity (stepper rows)
    const stepperInputs = form.querySelectorAll('.stepper-row input')
    const minThreshold = parseInt(stepperInputs[0]?.value) || 0
    const maxCapacity = parseInt(stepperInputs[1]?.value) || 0

    // Supplier info
    const halfRows = form.querySelectorAll('.input-row-half')
    let supplierName = '', supplierCity = '', poNumber = '', phoneNumber = '', rackNumber = '', shelfNumber = ''

    if (halfRows[0]) {
        const inputs = halfRows[0].querySelectorAll('.custom-input')
        supplierName = inputs[0]?.value?.trim() || ''
        supplierCity = inputs[1]?.value?.trim() || ''
    }
    if (halfRows[1]) {
        const inputs = halfRows[1].querySelectorAll('.custom-input')
        poNumber = inputs[0]?.value?.trim() || ''
        phoneNumber = inputs[1]?.value?.trim() || ''
    }
    if (halfRows[2]) {
        const inputs = halfRows[2].querySelectorAll('.custom-input')
        rackNumber = inputs[0]?.value?.trim() || ''
        shelfNumber = inputs[1]?.value?.trim() || ''
    }

    // Email
    const emailInput = form.querySelector('input[type="email"]')
    const supplierEmail = emailInput?.value?.trim() || ''

    // Storage notes
    const textareas = form.querySelectorAll('.textarea-input')
    const storageNotes = textareas[0]?.value?.trim() || ''

    if (!materialName) {
        alert('Please enter a material name.')
        return
    }

    const { data, error } = await IMData.createInventoryItem({
        name: materialName,
        category: category,
        batch_number: batchNumber,
        qr_code: qrCode,
        quantity: quantity,
        unit: unit,
        min_threshold: minThreshold,
        max_capacity: maxCapacity,
        location: { rack: rackNumber, shelf: shelfNumber },
        supplier_info: {
            name: supplierName,
            city: supplierCity,
            po: poNumber,
            phone: phoneNumber,
            email: supplierEmail
        },
        storage_notes: storageNotes,
        last_updated_by: user ? [user.display_name || user.email] : []
    })

    if (error) {
        alert('Failed to add product: ' + error.message)
    } else {
        alert('Product logged to storage successfully!')
        window.location.href = 'inventory.html'
    }
}
