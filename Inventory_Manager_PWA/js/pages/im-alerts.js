/**
 * im-alerts.js — Inventory Manager Alerts
 * Fetch and render alerts from Supabase
 */

IMAuth.requireAuth(['inventory_manager'], '../index.html')

document.addEventListener('DOMContentLoaded', async () => {
    await loadIMAlerts()
})

async function loadIMAlerts() {
    try {
        const alerts = await IMData.getAlerts('inventory_manager')

        // Update title
        const titleEl = document.querySelector('.page-title')
        if (titleEl) {
            titleEl.textContent = `${alerts.length} Alert${alerts.length !== 1 ? 's' : ''} !`
        }

        const alertsList = document.querySelector('.alerts-list')
        if (!alertsList) return

        alertsList.innerHTML = ''

        if (alerts.length === 0) {
            alertsList.innerHTML = '<p style="text-align: center; padding: 40px 20px; color: #999;">No alerts at this time.</p>'
            return
        }

        alerts.forEach(alertItem => {
            const time = alertItem.created_at
                ? new Date(alertItem.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                : ''

            const cardHTML = `
                <div class="alert-card" data-alert-id="${alertItem.id}" onclick="markIMAlertRead('${alertItem.id}')" style="cursor: pointer; ${alertItem.is_read ? 'opacity: 0.6;' : ''}">
                    <div class="alert-header">
                        <div class="alert-header-left">
                            <svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            <span class="alert-id">${alertItem.source_id || ''}</span>
                        </div>
                        <span class="alert-time">${time}</span>
                    </div>
                    <h2 class="alert-name">${alertItem.title}</h2>
                    <p class="alert-desc">${alertItem.description || ''}</p>
                </div>
            `
            alertsList.insertAdjacentHTML('beforeend', cardHTML)
        })
    } catch (err) {
        console.error('[IM Alerts] Failed to load alerts:', err)
    }
}

async function markIMAlertRead(alertId) {
    await IMData.markAlertRead(alertId)
    const card = document.querySelector(`[data-alert-id="${alertId}"]`)
    if (card) card.style.opacity = '0.6'
}
