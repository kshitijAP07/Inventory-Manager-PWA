/**
 * alerts.js — Operator Alerts
 * Fetch and render alerts from Supabase for operators
 */

IMAuth.requireAuth(['operator'], '../index.html')

document.addEventListener('DOMContentLoaded', async () => {
    await loadOperatorAlerts()
})

async function loadOperatorAlerts() {
    try {
        const alerts = await IMData.getAlerts('operator')
        const currentUser = await IMAuth.getCurrentUser(); // NEW: Fetch current user

        const titleEl = document.querySelector('.page-title')
        if (titleEl) {
            titleEl.textContent = `${alerts.length} Alert${alerts.length !== 1 ? 's' : ''} !`
        }

        const alertsList = document.querySelector('.alerts-list')
        if (!alertsList) return

        alertsList.innerHTML = ''

        if (alerts.length === 0) {
            alertsList.innerHTML = '<p style="text-align: center; padding: 40px 20px; color: #fff; opacity: 0.7;">No alerts at this time.</p>'
            return
        }

        alerts.forEach(alertItem => {
            const time = alertItem.created_at
                ? new Date(alertItem.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                : ''

            const isWarning = alertItem.type === 'warning'
            const iconClass = isWarning ? 'warning-icon-yellow' : 'warning-icon-red'
            const iconStroke = isWarning ? '#FFD600' : '#FF1744'
            const iconSVG = isWarning
                ? `<svg class="${iconClass}" viewBox="0 0 24 24" fill="none" stroke="${iconStroke}" stroke-width="2.5" stroke-linejoin="round"><polygon points="12 2 22 9 18 22 6 22 2 9"></polygon></svg>`
                : `<svg class="${iconClass}" viewBox="0 0 24 24" fill="none" stroke="${iconStroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>`

            // NEW: Check if THIS specific operator has read it
            const hasRead = alertItem.read_by && alertItem.read_by.includes(currentUser.id);

            const cardHTML = `
                <div class="op-alert-card" data-alert-id="${alertItem.id}" onclick="markAlertRead('${alertItem.id}')" style="cursor: pointer; ${hasRead ? 'opacity: 0.6;' : ''}">
                    <div class="alert-header">
                        <div class="alert-header-left">
                            ${iconSVG}
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
        console.error('[Op Alerts] Failed to load alerts:', err)
    }
}

async function markAlertRead(alertId) {
    await IMData.markAlertRead(alertId)
    const card = document.querySelector(`[data-alert-id="${alertId}"]`)
    if (card) card.style.opacity = '0.6'
}
