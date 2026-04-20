/**
 * edit-task.js — Manager Edit Task
 * Load and update existing task via Supabase
 */

IMAuth.requireAuth(['manager'], '../index.html')

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const taskId = urlParams.get('id')

    if (!taskId) {
        alert('No task ID provided.')
        window.location.href = 'quick-allot.html'
        return
    }

    // Populate selects first
    await populateSelects()
    // Then load task data to set selected values
    await loadTaskData(taskId)

    // Wire submit button — override any existing onclick
    const submitBtn = document.querySelector('.btn-submit')
    if (submitBtn) {
        submitBtn.removeAttribute('onclick')
        submitBtn.onclick = async () => {
            await handleUpdateTask(taskId)
        }
    }
})

async function populateSelects() {
    const form = document.querySelector('.edit-form')
    if (!form) return

    const selects = form.querySelectorAll('.form-select')

    // Workstation select (first)
    const workstations = await IMData.getWorkstations()
    const wsSelect = selects[0]
    if (wsSelect) {
        wsSelect.innerHTML = '<option value="" disabled selected hidden>Select Workstation</option>'
        workstations.forEach(ws => {
            wsSelect.insertAdjacentHTML('beforeend', `<option value="${ws.id}">${ws.code} — ${ws.name}</option>`)
        })
    }

    // Operator select (second)
    const operators = await IMData.getOperators()
    const opSelect = selects[1]
    if (opSelect) {
        opSelect.innerHTML = '<option value="" disabled selected hidden>Select Operator</option>'
        operators.forEach(op => {
            opSelect.insertAdjacentHTML('beforeend', `<option value="${op.id}">${op.display_name}</option>`)
        })
    }
}

async function loadTaskData(taskId) {
    const task = await IMData.getTaskById(taskId)
    if (!task) {
        alert('Task not found.')
        window.location.href = 'quick-allot.html'
        return
    }

    const form = document.querySelector('.edit-form')
    if (!form) return

    const selects = form.querySelectorAll('.form-select')
    const taskInput = form.querySelector('.form-input')
    const descInput = form.querySelector('.form-textarea')
    const timeSelects = form.querySelectorAll('.time-row .form-select')

    // Set workstation
    if (selects[0] && task.workstation_id) selects[0].value = task.workstation_id
    // Set operator
    if (selects[1] && task.assigned_to) selects[1].value = task.assigned_to
    // Set task name
    if (taskInput) taskInput.value = task.name || ''
    // Set description
    if (descInput) descInput.value = task.description || ''

    // Set duration
    if (task.duration_minutes && timeSelects.length >= 2) {
        const hours = Math.floor(task.duration_minutes / 60)
        const mins = task.duration_minutes % 60

        if (hours > 0) timeSelects[0].value = String(hours)
        if (mins > 0) timeSelects[1].value = String(mins)
    }
}

async function handleUpdateTask(taskId) {
    const form = document.querySelector('.edit-form')
    if (!form) return

    const selects = form.querySelectorAll('.form-select')
    const taskInput = form.querySelector('.form-input')
    const descInput = form.querySelector('.form-textarea')
    const timeSelects = form.querySelectorAll('.time-row .form-select')

    const hours = parseInt(timeSelects[0]?.value) || 0
    const minutes = parseInt(timeSelects[1]?.value) || 0

    const updates = {
        workstation_id: selects[0]?.value || undefined,
        assigned_to: selects[1]?.value || undefined,
        name: taskInput?.value?.trim() || undefined,
        description: descInput?.value?.trim() || '',
        duration_minutes: (hours * 60) + minutes
    }

    const { data, error } = await IMData.updateTask(taskId, updates)

    if (error) {
        alert('Failed to update task: ' + error.message)
    } else {
        alert('Task updated successfully!')
        window.location.href = 'quick-allot.html'
    }
}
