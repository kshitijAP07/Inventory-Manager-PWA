/**
 * create-kit.js — Inventory Manager Create Kit (Step 2)
 * Features added: Dynamic Stock Validation & Compulsory Fields
 */

IMAuth.requireAuth(['inventory_manager'], '../index.html')

// Store inventory in memory to validate against
let inventoryStock = [];

document.addEventListener('DOMContentLoaded', async () => {
    await populateMaterialSelect()

    // Wire Next button — override inline onclick
    const nextBtn = document.querySelector('.btn-primary.center-btn')
    if (nextBtn) {
        nextBtn.removeAttribute('onclick')
        nextBtn.onclick = handleNext
    }

    // Wire remove buttons for kit items
    document.querySelectorAll('.remove-kit-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const group = e.target.closest('.kit-item-group')
            if (group) group.style.display = 'none'
        })
    })
})

async function populateMaterialSelect() {
    try {
        inventoryStock = await IMData.getInventoryItems()
        const matSelect = document.querySelector('.allotment-form .select-input')
        if (!matSelect) return

        const firstOption = matSelect.querySelector('option[disabled]')
        matSelect.innerHTML = ''
        if (firstOption) matSelect.appendChild(firstOption)

        // Inject the max quantity dynamically into the dataset
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

    // 1. Compulsory Field: Material Dropdown
    const matSelect = document.querySelector('.allotment-form .select-input')
    if (!matSelect || !matSelect.value) {
        alert("⚠️ Compulsory: Please select a material from the dropdown.")
        return
    }

    const selectedOption = matSelect.options[matSelect.selectedIndex]
    const materialId = matSelect.value
    const materialName = selectedOption.dataset.name
    const maxAvailableQty = parseInt(selectedOption.dataset.qty) || 0

    // 2. Compulsory Field: Quantity Input
    const qtyInputs = document.querySelectorAll('.input-qty')
    let enteredQty = 0;
    
    // Grab the first visible quantity input box (matching the UI mockup)
    for (let input of qtyInputs) {
        if (input.closest('.kit-item-group').style.display !== 'none') {
            enteredQty = parseInt(input.value);
            break; 
        }
    }

    if (isNaN(enteredQty) || enteredQty <= 0) {
        alert(`⚠️ Compulsory: Please enter a valid quantity for ${materialName}.`)
        return
    }

    // 3. Instant Stock Validation
    if (enteredQty > maxAvailableQty) {
        alert(`❌ Error: Insufficient Stock! You entered ${enteredQty}, but only ${maxAvailableQty} units of ${materialName} are available.`)
        return
    }

    // If all validation passes, save to session and proceed
    kitItems.push({ id: materialId, name: materialName, quantity: enteredQty, unit: 'units' })
    sessionStorage.setItem('im_kit_items', JSON.stringify(kitItems))
    window.location.href = 'allot-kit.html'
}