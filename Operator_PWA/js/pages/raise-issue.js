/**
 * raise-issue.js — Operator Raise Issue
 * Submit issues to Supabase with dynamic kit/material dropdowns
 */

IMAuth.requireAuth(['operator'], '../index.html')

document.addEventListener('DOMContentLoaded', async () => {
    // Populate dropdowns from Supabase
    await populateKitSelect()
    await populateMaterialSelect()

    // Clone form to remove the inline submit handler,
    // then attach our Supabase-backed handler
    const oldForm = document.getElementById('raiseIssueForm')
    if (oldForm) {
        const newForm = oldForm.cloneNode(true)
        oldForm.parentNode.replaceChild(newForm, oldForm)
        newForm.addEventListener('submit', handleSubmitIssue)
    }
})

async function populateKitSelect() {
    try {
        const kits = await IMData.getKits()
        const selects = document.querySelectorAll('.select-input-glass')
        const kitSelect = selects[1] // Second select is Kit
        if (!kitSelect) return

        const firstOption = kitSelect.querySelector('option[disabled]')
        kitSelect.innerHTML = ''
        if (firstOption) kitSelect.appendChild(firstOption)

        kits.forEach(kit => {
            kitSelect.insertAdjacentHTML('beforeend',
                `<option value="${kit.id}">${kit.name}</option>`
            )
        })
    } catch (err) {
        console.error('[Raise Issue] Failed to load kits:', err)
    }
}

async function populateMaterialSelect() {
    try {
        const items = await IMData.getInventoryItems()
        const selects = document.querySelectorAll('.select-input-glass')
        const matSelect = selects[2] // Third select is Material
        if (!matSelect) return

        const firstOption = matSelect.querySelector('option[disabled]')
        matSelect.innerHTML = ''
        if (firstOption) matSelect.appendChild(firstOption)

        items.forEach(item => {
            matSelect.insertAdjacentHTML('beforeend',
                `<option value="${item.id}">${item.name}</option>`
            )
        })
    } catch (err) {
        console.error('[Raise Issue] Failed to load materials:', err)
    }
}

async function handleSubmitIssue(e) {
    e.preventDefault()

    const user = await IMAuth.getCurrentUser()
    if (!user) return

    const selects = document.querySelectorAll('.select-input-glass')
    const textareas = document.querySelectorAll('.textarea-glass')

    const issueType = selects[0]?.value
    const kitId = selects[1]?.value || null
    const materialId = selects[2]?.value || null
    const reason = textareas[0]?.value?.trim() || ''
    const description = textareas[1]?.value?.trim() || ''

    if (!issueType) {
        alert('Please select the type of issue.')
        return
    }

    const { data, error } = await IMData.createIssue({
        type: issueType,
        kit_id: kitId,
        material_id: materialId,
        reason: reason,
        description: description,
        raised_by: user.id
    })

    if (error) {
        alert('Failed to raise issue: ' + error.message)
    } else {
        // Also create an alert for the manager
        await IMData.createAlert({
            type: 'critical',
            source_id: data?.id || '',
            title: 'Issue Raised: ' + issueType,
            description: reason || description || 'An operator raised an issue.',
            target_roles: ['manager', 'inventory_manager']
        })

        alert('Issue has been raised to the Workstation Manager.')
        window.location.href = 'home.html'
    }
}
