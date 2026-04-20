// 1. Protect the Route: Kick to login if not an operator
IMAuth.requireAuth(['operator'], '../index.html');

document.addEventListener('DOMContentLoaded', async () => {
    
    // 2. Wire up the Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await IMAuth.logout('../index.html');
        });
    }

    function updateIndianTime() {
        const now = new Date();
        
        // Force the timezone to India Standard Time (Asia/Kolkata)
        const opts = { timeZone: 'Asia/Kolkata' };
        
        // Extract the specific parts
        const weekday = new Intl.DateTimeFormat('en-US', { ...opts, weekday: 'long' }).format(now);
        const time = new Intl.DateTimeFormat('en-US', { ...opts, hour: '2-digit', minute: '2-digit', hour12: true }).format(now);
        
        const day = new Intl.DateTimeFormat('en-US', { ...opts, day: '2-digit' }).format(now);
        const month = new Intl.DateTimeFormat('en-US', { ...opts, month: 'short' }).format(now);
        
        // Update the DOM elements
        const timeTextEl = document.querySelector('.time-text');
        const dateDayEl = document.querySelector('.date-day');
        const dateMonthEl = document.querySelector('.date-month');

        if (timeTextEl) timeTextEl.innerText = `${weekday}- ${time}`;
        if (dateDayEl) dateDayEl.innerText = day;
        if (dateMonthEl) dateMonthEl.innerText = month;
    }

    // Run immediately on page load
    updateIndianTime();
    
    // Refresh the time every 60,000 milliseconds (1 minute)
    setInterval(updateIndianTime, 60000);

    // Load live tasks from Supabase
    await loadOperatorTasks();
});

async function loadOperatorTasks() {
    const user = await IMAuth.getCurrentUser();
    if (!user) return;

    try {
        const tasks = await IMData.getTasks({ assigned_to: user.id });
        const taskList = document.querySelector('.task-list');
        if (!taskList) return;

        taskList.innerHTML = '';

        if (tasks.length === 0) {
            taskList.innerHTML = '<p style="text-align: center; padding: 20px; color: #fff; opacity: 0.7;">No tasks assigned to you.</p>';
            return;
        }

        tasks.forEach(task => {
            const time = task.scheduled_time
                ? new Date(task.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                : '--:--';

            const assignerName = task.assigner?.display_name || 'Manager';

            const taskHTML = `
                <div class="task-row" data-task-id="${task.id}">
                    <div class="op-task-card">
                        <div class="task-info">
                            <h4>${task.name}</h4>
                            <p>${task.description || 'No description'}</p>
                            <div class="task-assignee">
                                <img src="assets/operator-avatar.svg" alt="Avatar" class="avatar-xs">
                                <span>-${assignerName} assigned you</span>
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="btn-action btn-yellow" onclick="window.location.href='raise-issue.html?task_id=${task.id}'">
                                <svg viewBox="0 0 24 24" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"><path d="M12 4L4 20h16z"></path></svg>
                            </button>
                            <button class="btn-action btn-green" onclick="acceptTask('${task.id}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                            <button class="btn-action btn-red" onclick="rejectTask('${task.id}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>
                    <span class="task-time-side">${time}</span>
                </div>
            `;
            taskList.insertAdjacentHTML('beforeend', taskHTML);
        });
    } catch (err) {
        console.error('[Operator Home] Failed to load tasks:', err);
    }
}

async function acceptTask(taskId) {
    const { error } = await IMData.updateTask(taskId, { status: 'in_progress' });
    if (error) {
        alert('Failed to accept task: ' + error.message);
    } else {
        const row = document.querySelector(`[data-task-id="${taskId}"]`);
        if (row) {
            row.style.opacity = '0.5';
            const greenBtn = row.querySelector('.btn-green');
            const redBtn = row.querySelector('.btn-red');
            if (greenBtn) greenBtn.setAttribute('disabled', 'true');
            if (redBtn) redBtn.setAttribute('disabled', 'true');
        }
    }
}

async function rejectTask(taskId) {
    if (!confirm('Are you sure you want to reject this task?')) return;
    const { error } = await IMData.updateTask(taskId, { status: 'rejected' });
    if (error) {
        alert('Failed to reject task: ' + error.message);
    } else {
        const row = document.querySelector(`[data-task-id="${taskId}"]`);
        if (row) row.remove();
    }
}