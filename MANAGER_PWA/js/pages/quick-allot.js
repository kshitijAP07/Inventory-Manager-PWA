/**
 * quick-allot.js — Manager Quick Allot
 * Create tasks and assign to Workstations (WS) or Assembly Lines (AL)
 * Toggle switches form context, dropdowns, and recent allotments
 */

IMAuth.requireAuth(['manager'], '../index.html')

// Current mode: 'ws' or 'al'
let currentMode = 'ws'

document.addEventListener('DOMContentLoaded', async () => {
    const user = await IMAuth.getCurrentUser()

    // --- Toggle Logic ---
    const toggleBtns = document.querySelectorAll('.toggle-pill')
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const mode = btn.getAttribute('data-mode')
            if (mode === currentMode) return

            // Update active pill
            toggleBtns.forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            currentMode = mode

            // Re-populate station dropdown
            await populateStationSelect()
            // Re-populate operator dropdown (same operators from DB)
            await populateOperatorSelect()
            // Re-load recent allotments filtered by mode
            if (user) await loadRecentAllotments(user.id)

            // Update submit button text
            const submitBtn = document.getElementById('submitBtn')
            if (submitBtn) {
                submitBtn.textContent = currentMode === 'ws' ? 'Allot To Station' : 'Allot To Line'
            }
        })
    })

    // --- Initial Load ---
    await populateStationSelect()
    await populateOperatorSelect()
    if (user) await loadRecentAllotments(user.id)

    // --- Wire submit button ---
    const submitBtn = document.getElementById('submitBtn')
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            await handleCreateTask(user)
        })
    }
})

// ═══════════════════════════════════════════
//  POPULATE STATION DROPDOWN (WS or AL)
// ═══════════════════════════════════════════

async function populateStationSelect() {
    const stationSelect = document.getElementById('stationSelect')
    if (!stationSelect) return

    if (currentMode === 'ws') {
        // Fetch workstations from DB
        const workstations = await IMData.getWorkstations()
        stationSelect.innerHTML = '<option value="" disabled selected hidden>Select Workstation</option>'
        workstations.forEach(ws => {
            stationSelect.insertAdjacentHTML('beforeend',
                `<option value="${ws.id}">${ws.code}</option>`
            )
        })
    } else {
        // Fetch assembly lines from DB
        const assemblyLines = await IMData.getAssemblyLines()
        stationSelect.innerHTML = '<option value="" disabled selected hidden>Select Assembly Line</option>'
        assemblyLines.forEach(al => {
            stationSelect.insertAdjacentHTML('beforeend',
                `<option value="${al.id}">${al.code}</option>`
            )
        })
    }
}

// ═══════════════════════════════════════════
//  POPULATE OPERATOR DROPDOWN
// ═══════════════════════════════════════════

async function populateOperatorSelect() {
    const opSelect = document.getElementById('operatorSelect')
    if (!opSelect) return

    const operators = await IMData.getOperators()
    opSelect.innerHTML = '<option value="" disabled selected hidden>Select Operator</option>'
    operators.forEach(op => {
        opSelect.insertAdjacentHTML('beforeend',
            `<option value="${op.id}">${op.display_name}</option>`
        )
    })
}

// ═══════════════════════════════════════════
//  CREATE TASK (WS or AL)
// ═══════════════════════════════════════════

async function handleCreateTask(user) {
    const stationSelect = document.getElementById('stationSelect')
    const operatorSelect = document.getElementById('operatorSelect')
    const taskInput = document.getElementById('taskInput')
    const descInput = document.getElementById('descInput')
    const hoursSelect = document.getElementById('hoursSelect')
    const minutesSelect = document.getElementById('minutesSelect')

    const stationId = stationSelect?.value
    const operatorId = operatorSelect?.value
    const taskName = taskInput?.value?.trim()
    const description = descInput?.value?.trim()
    const hours = parseInt(hoursSelect?.value) || 0
    const minutes = parseInt(minutesSelect?.value) || 0

    if (!stationId || !operatorId || !taskName) {
        const stationType = currentMode === 'ws' ? 'Workstation' : 'Assembly Line'
        alert(`Please fill in ${stationType}, Operator, and Task Name.`)
        return
    }

    // Build task data differently for WS vs AL
    const taskData = {
        name: taskName,
        description: description || '',
        assigned_to: operatorId,
        assigned_by: user?.id,
        status: 'pending',
        duration_minutes: (hours * 60) + minutes,
        scheduled_time: new Date().toISOString()
    }

    if (currentMode === 'ws') {
        // Workstation task — use workstation_id FK directly
        taskData.workstation_id = stationId
        taskData.metadata = { station_type: 'workstation' }
    } else {
        // Assembly line task — store in metadata (no FK to assembly_lines on tasks table)
        taskData.workstation_id = null
        taskData.metadata = {
            station_type: 'assembly_line',
            assembly_line_id: stationId
        }
    }

    const { data, error } = await IMData.createTask(taskData)

    if (error) {
        alert('Failed to create task: ' + error.message)
    } else {
        alert('Task allotted successfully!')
        // Reset form
        if (taskInput) taskInput.value = ''
        if (descInput) descInput.value = ''
        if (stationSelect) stationSelect.selectedIndex = 0
        if (operatorSelect) operatorSelect.selectedIndex = 0
        if (hoursSelect) hoursSelect.selectedIndex = 0
        if (minutesSelect) minutesSelect.selectedIndex = 0
        // Reload recent allotments
        if (user) await loadRecentAllotments(user.id)
    }
}

// ═══════════════════════════════════════════
//  LOAD RECENT ALLOTMENTS (filtered by mode)
// ═══════════════════════════════════════════

async function loadRecentAllotments(managerId) {
    const tasks = await IMData.getTasks({ assigned_by: managerId, limit: 20 })
    const taskList = document.querySelector('.allotments-list')
    if (!taskList) return

    // Filter tasks based on current toggle mode
    const filtered = tasks.filter(task => {
        const stationType = task.metadata?.station_type
        if (currentMode === 'ws') {
            // Show WS tasks: either has workstation_id and no assembly_line metadata,
            // or explicitly marked as workstation
            return stationType === 'workstation' || (!stationType && task.workstation_id)
        } else {
            // Show AL tasks: explicitly marked as assembly_line
            return stationType === 'assembly_line'
        }
    })

    // Limit to 5 after filtering
    const display = filtered.slice(0, 5)

    taskList.innerHTML = ''

    if (display.length === 0) {
        const label = currentMode === 'ws' ? 'Workstation' : 'Assembly Line'
        taskList.innerHTML = `<p style="text-align: center; padding: 20px; color: #999;">No recent ${label} allotments.</p>`
        return
    }

    for (const task of display) {
        let stationCode = 'N/A'

        if (currentMode === 'ws') {
            stationCode = task.workstation?.code || 'N/A'
        } else {
            // For AL tasks, fetch the assembly line code from metadata
            const alId = task.metadata?.assembly_line_id
            if (alId) {
                try {
                    const al = await IMData.getAssemblyLineById(alId)
                    stationCode = al?.code || 'AL'
                } catch (e) {
                    stationCode = 'AL'
                }
            }
        }

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
                        <span class="task-id-badge">${stationCode}</span>
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
    }
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
