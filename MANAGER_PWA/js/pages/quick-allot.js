/**
 * quick-allot.js — Manager Quick Allot
 * Create tasks and assign to workstations via Supabase
 */

IMAuth.requireAuth(['manager'], '../index.html')

document.addEventListener('DOMContentLoaded', async () => {
    const user = await IMAuth.getCurrentUser()

    // Populate Workstation select
    await populateWorkstationSelect()
    // Populate Operator select
    await populateOperatorSelect()
    // Load recent allotments
    if (user) await loadRecentAllotments(user.id)

    // Wire submit button
    const submitBtn = document.querySelector('.btn-submit')
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            await handleCreateTask(user)
        })
    }
})

async function populateWorkstationSelect() {
    const workstations = await IMData.getWorkstations()
    const selects = document.querySelectorAll('.allot-form .form-select')
    const wsSelect = selects[0]
    if (!wsSelect) return

    wsSelect.innerHTML = '<option value="" disabled selected hidden>Select Workstation</option>'
    workstations.forEach(ws => {
        wsSelect.insertAdjacentHTML('beforeend', `<option value="${ws.id}">${ws.code} — ${ws.name}</option>`)
    })
}

async function populateOperatorSelect() {
    const operators = await IMData.getOperators()
    const selects = document.querySelectorAll('.allot-form .form-select')
    const opSelect = selects[1]
    if (!opSelect) return

    opSelect.innerHTML = '<option value="" disabled selected hidden>Select Operator</option>'
    operators.forEach(op => {
        opSelect.insertAdjacentHTML('beforeend', `<option value="${op.id}">${op.display_name}</option>`)
    })
}

async function handleCreateTask(user) {
    const form = document.querySelector('.allot-form')
    if (!form) return

    const selects = form.querySelectorAll('.form-select')
    const taskInput = form.querySelector('.form-input')
    const descInput = form.querySelector('.form-textarea')
    const timeSelects = form.querySelectorAll('.time-row .form-select')

    const workstationId = selects[0]?.value
    const operatorId = selects[1]?.value
    const taskName = taskInput?.value?.trim()
    const description = descInput?.value?.trim()
    const hours = parseInt(timeSelects[0]?.value) || 0
    const minutes = parseInt(timeSelects[1]?.value) || 0

    if (!workstationId || !operatorId || !taskName) {
        alert('Please fill in Workstation, Operator, and Task Name.')
        return
    }

    const { data, error } = await IMData.createTask({
        name: taskName,
        description: description || '',
        workstation_id: workstationId,
        assigned_to: operatorId,
        assigned_by: user?.id,
        status: 'pending',
        duration_minutes: (hours * 60) + minutes,
        scheduled_time: new Date().toISOString()
    })

    if (error) {
        alert('Failed to create task: ' + error.message)
    } else {
        alert('Task allotted successfully!')
        // Reset form
        if (taskInput) taskInput.value = ''
        if (descInput) descInput.value = ''
        selects[0].selectedIndex = 0
        selects[1].selectedIndex = 0
        if (timeSelects[0]) timeSelects[0].selectedIndex = 0
        if (timeSelects[1]) timeSelects[1].selectedIndex = 0
        // Reload recent allotments
        await loadRecentAllotments(user.id)
    }
}

async function loadRecentAllotments(managerId) {
    const tasks = await IMData.getTasks({ assigned_by: managerId, limit: 5 })
    const taskList = document.querySelector('.allotments-list')
    if (!taskList) return

    taskList.innerHTML = ''

    if (tasks.length === 0) {
        taskList.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">No recent allotments.</p>'
        return
    }

    tasks.forEach(task => {
        const time = task.scheduled_time
            ? new Date(task.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
            : '--:--'

        const wsCode = task.workstation?.code || 'N/A'
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
                        <span class="task-id-badge">${wsCode}</span>
                        <button class="action-btn-circle edit-btn" onclick="window.location.href='edit-task.html?id=${task.id}'">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="action-btn-circle delete-btn" onclick="deleteRecentTask('${task.id}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D32F2F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
                <span class="task-time-outside">${time}</span>
            </div>
        `
        taskList.insertAdjacentHTML('beforeend', taskHTML)
    })
}

async function deleteRecentTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return
    const { error } = await IMData.deleteTask(taskId)
    if (error) {
        alert('Failed to delete task: ' + error.message)
    } else {
        const user = await IMAuth.getCurrentUser()
        if (user) await loadRecentAllotments(user.id)
    }
}
