/**
 * alerts.js — Manager Alerts
 * Fetch and render alerts from Supabase
 */

IMAuth.requireAuth(['manager'], '../index.html')

document.addEventListener('DOMContentLoaded', async () => {
    await loadAlerts()
})

async function loadAlerts() {
    try {
        const alerts = await IMData.getAlerts('manager')
        const currentUser = await IMAuth.getCurrentUser(); // 1. Get the current user

        const titleEl = document.querySelector('.alerts-title')
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

            const isWarning = alertItem.type === 'warning'
            const iconSVG = isWarning
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="#FFC400" stroke="#FFC400" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9.5 6.5-3.5 11h-12l-3.5-11z"></path></svg>'
                : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF1744" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'

            // 2. Check if THIS specific user has read it
            const hasRead = alertItem.read_by && alertItem.read_by.includes(currentUser.id);

            const cardHTML = `
                <div class="alert-card" data-alert-id="${alertItem.id}" onclick="markRead('${alertItem.id}')" style="cursor: pointer; ${hasRead ? 'opacity: 0.6;' : ''}">
                    <div class="alert-icon-wrapper">
                        ${iconSVG}
                    </div>
                    <div class="alert-content">
                        <div class="alert-header">
                            <span class="alert-id">${alertItem.source_id || ''}</span>
                            <span class="alert-time">${time}</span>
                        </div>
                        <h3 class="alert-main-title">${alertItem.title}</h3>
                        <p class="alert-desc">${alertItem.description || ''}</p>
                    </div>
                </div>
            `
            alertsList.insertAdjacentHTML('beforeend', cardHTML)
        })
    } catch (err) {
        console.error('[Alerts] Failed to load alerts:', err)
    }
}

async function markRead(alertId) {
    await IMData.markAlertRead(alertId)
    const card = document.querySelector(`[data-alert-id="${alertId}"]`)
    if (card) card.style.opacity = '0.6'
}
