/**
 * operators.js — Manager Operators View
 * Fetch operator list from Supabase
 */

IMAuth.requireAuth(['manager'], '../index.html')

document.addEventListener('DOMContentLoaded', async () => {
    await loadOperators()
})

async function loadOperators() {
    try {
        const operators = await IMData.getOperators()
        const grid = document.querySelector('.operators-grid')
        if (!grid) return

        grid.innerHTML = ''

        if (operators.length === 0) {
            grid.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">No operators found.</p>'
            return
        }

        operators.forEach(op => {
            const avatarUrl = op.avatar_url || 'assets/lisa.svg'
            const cardHTML = `
                <div class="operator-card">
                    <span class="op-name">${op.display_name || 'Unknown'}</span>
                    <img src="${avatarUrl}" alt="${op.display_name}" class="op-avatar">
                    <span class="op-age">${op.email || ''}</span>
                </div>
            `
            grid.insertAdjacentHTML('beforeend', cardHTML)
        })
    } catch (err) {
        console.error('[Operators] Failed to load operators:', err)
    }
}
