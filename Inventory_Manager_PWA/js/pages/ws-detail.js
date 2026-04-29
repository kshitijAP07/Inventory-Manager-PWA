/**
 * ws-detail.js — Inventory Manager Workstation Detail
 * Fetches workstation/assembly info and tasks from Supabase
 */

// 1. Auth guard: Ensure only Inventory Managers can access this page
IMAuth.requireAuth(['inventory_manager'], '../index.html')

document.addEventListener('DOMContentLoaded', async () => {
    
    // 2. Get ID AND TYPE from URL
    const urlParams = new URLSearchParams(window.location.search)
    const wsId = urlParams.get('id')
    const type = urlParams.get('type') || 'workstation' 

    if (wsId) {
        await loadWorkstationDetail(wsId, type)
        await loadWorkstationTasks(wsId, type)
    }
})

async function loadWorkstationDetail(wsId, type) {
    try {
        // 3. dynamically fetch based on type to prevent the Assembly Line crash!
        const ws = type === 'assembly' 
            ? await IMData.getAssemblyLineById(wsId) 
            : await IMData.getWorkstationById(wsId);
            
        if (!ws) return

        // Update title using the IM-specific IDs
        const wsTitle = document.getElementById('ws-code')
        const wsSubtitle = document.getElementById('ws-name')
        const statusBadge = document.getElementById('ws-status')

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

        // Update progress ring using the IM-specific CSS variables
        const progressRing = document.getElementById('ws-progress-ring')
        const progressText = document.getElementById('ws-progress-val')

        if (progressRing) {
            // Convert percentage to degrees (100% = 360deg)
            const progressDeg = (ws.progress / 100) * 360;
            progressRing.style.setProperty('--progress', `${progressDeg}deg`);
        }
        if (progressText) {
            progressText.textContent = ws.progress
        }
        // Wire up the Direct Allot button
        // Wire up the Direct Allot button
        const allotBtn = document.getElementById('btn-direct-allot');
        if (allotBtn) {
            allotBtn.style.display = 'block';
            allotBtn.onclick = () => {
                // CHANGED: Now goes to direct-scan.html first!
                window.location.href = `direct-scan.html?targetId=${wsId}&type=${type}&name=${encodeURIComponent(ws.code)}`;
            };
        }
    } catch (err) {
        console.error('[WS Detail] Failed to load detail:', err)
    }
}

async function loadWorkstationTasks(wsId, type) {
    try {
        // 4. Filter tasks based on whether it's an assembly line or workstation
        const filter = type === 'assembly' ? { assembly_line_id: wsId } : { workstation_id: wsId };
        const tasks = await IMData.getTasks(filter);
        
        const taskList = document.getElementById('ws-tasks-list')
        if (!taskList) return

        taskList.innerHTML = ''

        if (tasks.length === 0) {
            taskList.innerHTML = `<p style="text-align: center; padding: 20px; color: #999;">No tasks assigned to this ${type}.</p>`
            return
        }

        tasks.forEach(task => {
            const time = task.scheduled_time
                ? new Date(task.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                : '--:--'

            const avatarHTML = task.assignee
                ? `<img src="assets/lisa.svg" class="task-avatar-small" alt="${task.assignee.display_name}">`
                : ''

            // IM doesn't need edit/delete buttons, just view access
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