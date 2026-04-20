/**
 * ws-detail.js — Manager Workstation Detail
 * Fetches workstation info and tasks from Supabase
 */

// Auth guard
IMAuth.requireAuth(['manager'], '../index.html')

document.addEventListener('DOMContentLoaded', async () => {
    // Wire logout
    const logoutBtn = document.getElementById('logoutBtn')
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await IMAuth.logout('../index.html')
        })
    }

    // Get workstation ID from URL
    const urlParams = new URLSearchParams(window.location.search)
    const wsId = urlParams.get('id')

    if (wsId) {
        await loadWorkstationDetail(wsId)
        await loadWorkstationTasks(wsId)
    }
})

async function loadWorkstationDetail(wsId) {
    try {
        const ws = await IMData.getWorkstationById(wsId)
        if (!ws) return

        // Update title
        const wsTitle = document.querySelector('.ws-title')
        const wsSubtitle = document.querySelector('.ws-subtitle')
        const statusBadge = document.querySelector('.page-subheader .status-badge')

        if (wsTitle) wsTitle.textContent = ws.code
        if (wsSubtitle) wsSubtitle.textContent = ws.name

        if (statusBadge) {
            statusBadge.className = 'status-badge'
            if (ws.status === 'active') {
                statusBadge.classList.add('status-active')
                statusBadge.textContent = 'Active'
            } else if (ws.status === 'issue') {
                statusBadge.classList.add('status-issue')
                statusBadge.textContent = 'Issue Raised'
            } else if (ws.status === 'hold') {
                statusBadge.classList.add('status-hold')
                statusBadge.textContent = 'Hold'
            }
        }

        // Update progress ring
        const progressRing = document.querySelector('.large-circular-chart .circle.orange-ring')
        const progressText = document.querySelector('.large-circular-chart .percentage-large')

        if (progressRing) {
            progressRing.setAttribute('stroke-dasharray', `${ws.progress}, 100`)
        }
        if (progressText) {
            progressText.innerHTML = `${ws.progress}<tspan class="percentage-small">%</tspan>`
        }
    } catch (err) {
        console.error('[WS Detail] Failed to load workstation:', err)
    }
}

async function loadWorkstationTasks(wsId) {
    try {
        const tasks = await IMData.getTasks({ workstation_id: wsId })
        const taskList = document.querySelector('.allotments-list')
        if (!taskList) return

        taskList.innerHTML = ''

        if (tasks.length === 0) {
            taskList.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">No tasks assigned to this workstation.</p>'
            return
        }

        tasks.forEach(task => {
            const time = task.scheduled_time
                ? new Date(task.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                : '--:--'

            const avatarHTML = task.assignee
                ? `<img src="assets/lisa.svg" class="task-avatar-small" alt="${task.assignee.display_name}">`
                : ''

            const taskHTML = `
                <div class="task-row">
                    <div class="task-card-new">
                        <div class="task-info">
                            <span class="task-name-new">${task.name}</span>
                            <span class="task-desc-new">${task.description || 'No description'}</span>
                            <div class="task-avatars-group">
                                ${avatarHTML}
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="action-btn-circle edit-btn" onclick="window.location.href='edit-task.html?id=${task.id}'">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="action-btn-circle delete-btn" onclick="deleteTask('${task.id}', '${wsId}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D32F2F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    <span class="task-time-outside">${time}</span>
                </div>
            `
            taskList.insertAdjacentHTML('beforeend', taskHTML)
        })
    } catch (err) {
        console.error('[WS Detail] Failed to load tasks:', err)
    }
}

async function deleteTask(taskId, wsId) {
    if (!confirm('Are you sure you want to delete this task?')) return

    const { error } = await IMData.deleteTask(taskId)
    if (error) {
        alert('Failed to delete task: ' + error.message)
    } else {
        await loadWorkstationTasks(wsId)
    }
}
