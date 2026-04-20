/**
 * allot-kit.js — Inventory Manager Allot Kit (Step 3)
 * Features added: Operator Filtering & Real Database Subtraction
 */

IMAuth.requireAuth(['inventory_manager'], '../index.html')

document.addEventListener('DOMContentLoaded', async () => {
    await populateWorkstationSelect()

    // Override the confirm button (remove inline onclick)
    const confirmBtn = document.querySelector('.btn-primary.center-btn')
    if (confirmBtn) {
        confirmBtn.removeAttribute('onclick')
        confirmBtn.onclick = handleConfirmAllot
    }
})

async function populateWorkstationSelect() {
    try {
        const workstations = await IMData.getWorkstations()
        const selects = document.querySelectorAll('.allotment-form .select-input')
        const wsSelect = selects[0]
        if (!wsSelect) return

        wsSelect.innerHTML = '<option value="" disabled selected hidden>Select Workstation</option>'
        workstations.forEach(ws => {
            wsSelect.insertAdjacentHTML('beforeend',
                `<option value="${ws.id}">${ws.code} — ${ws.name}</option>`
            )
        })

        // LIVE FILTERING: Listen for Workstation changes to load the correct operator
        wsSelect.addEventListener('change', async (e) => {
            await populateOperatorForStation(e.target.value)
        })

    } catch (err) {
        console.error('[Allot Kit] Failed to load workstations:', err)
    }
}

async function populateOperatorForStation(workstationId) {
    try {
        const selects = document.querySelectorAll('.allotment-form .select-input')
        const opSelect = selects[1]
        if (!opSelect) return

        opSelect.innerHTML = '<option value="" disabled selected hidden>Scanning assignments...</option>'

        // Fetch active tasks for this specific workstation to see who is working there
        const tasks = await IMData.getTasks({ workstation_id: workstationId })
        const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'pending')

        opSelect.innerHTML = '<option value="" disabled selected hidden>Select Operator</option>'

        // If an operator is assigned, ONLY show them
        if (activeTasks.length > 0 && activeTasks[0].assignee) {
            const op = activeTasks[0].assignee;
            opSelect.innerHTML += `<option value="${op.id}" selected>${op.display_name}</option>`
        } else {
            opSelect.innerHTML = '<option value="" disabled selected>No operator currently assigned</option>'
        }
    } catch (err) {
        console.error('[Allot Kit] Failed to load operators:', err)
    }
}

async function handleConfirmAllot() {
    const user = await IMAuth.getCurrentUser()

    const selects = document.querySelectorAll('.allotment-form .select-input')
    const wsId = selects[0]?.value
    const opId = selects[1]?.value

    // 1. Compulsory Field Checks
    if (!wsId) {
        alert('⚠️ Compulsory: Please select a workstation.')
        return
    }
    if (!opId) {
        alert('⚠️ Compulsory: No operator assigned to this station. The Manager must assign a task to this station first before you can allot a kit.')
        return
    }

    // Get kit items from Step 2
    const kitItemsRaw = sessionStorage.getItem('im_kit_items')
    const kitItems = kitItemsRaw ? JSON.parse(kitItemsRaw) : []

    if (kitItems.length === 0) {
        alert('❌ Error: No materials selected. Please go back to step 2.')
        return
    }

    // 2. Create the Kit
    const { data, error } = await IMData.createKit({
        name: 'Kit-' + Date.now().toString(36).toUpperCase(),
        items: kitItems,
        workstation_id: wsId,
        status: 'created',
        created_by: user?.id
    })

    if (error) {
        alert('❌ Failed to allot kit: ' + error.message)
        return
    }

    // 3. DATABASE SUBTRACTION
    // Loop through each item in the kit, grab current quantity, subtract, and update database
    for (let item of kitItems) {
        if (item.id) {
            const dbItem = await IMData.getInventoryItemById(item.id)
            if (dbItem) {
                const newQty = dbItem.quantity - item.quantity
                
                // Update Supabase (data-service automatically recalculates stock_status if it goes low)
                await IMData.updateInventoryItem(item.id, { quantity: newQty })
            }
        }
    }

    // Clear session and finish
    sessionStorage.removeItem('im_kit_items')
    alert('✅ Kit Allotted Successfully! Inventory has been automatically subtracted.')
    window.location.href = 'im-dashboard.html'
}