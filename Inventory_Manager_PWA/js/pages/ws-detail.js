IMAuth.requireAuth(['inventory_manager'], '../index.html');

document.addEventListener("DOMContentLoaded", async () => {
    // Wait for Supabase to confirm the session is active to avoid "Not Found" errors on refresh
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return; 

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        window.location.href = 'im-dashboard.html';
        return;
    }

    // Attempt to find the ID in either Workstations OR Assembly Lines
    let unitData = await IMData.getWorkstationById(id);
    
    if (!unitData) {
        // If not a workstation, check assembly lines
        const { data: alData } = await _supabase.from('assembly_lines').select('*').eq('id', id).single();
        unitData = alData;
    }

    if (!unitData) {
        alert("Unit not found in database.");
        window.location.href = 'im-dashboard.html';
        return;
    }

    // Inject UI Data
    document.getElementById('ws-code').textContent = unitData.code;
    document.getElementById('ws-name').textContent = unitData.name || "Production Line";
    document.getElementById('ws-progress-val').textContent = unitData.progress;

    const progressDeg = (unitData.progress / 100) * 360;
    document.getElementById('ws-progress-ring').style.setProperty('--progress', `${progressDeg}deg`);

    // Status Badge Logic
    const statusEl = document.getElementById('ws-status');
    const statusMap = {
        'active': { class: 'status-active', text: 'Active' },
        'issue': { class: 'status-issue', text: 'Issue Raised' },
        'hold': { class: 'status-hold', text: 'Hold' }
    };
    const status = statusMap[unitData.status] || statusMap['active'];
    statusEl.className = `status-badge ${status.class}`;
    statusEl.textContent = status.text;

    // Load Tasks (Tasks linked to this ID)
    await loadTasksForUnit(id);
});

async function loadTasksForUnit(unitId) {
    const tasks = await IMData.getTasks({ workstation_id: unitId });
    const tasksListEl = document.getElementById('ws-tasks-list');
    tasksListEl.innerHTML = '';

    if (!tasks.length) {
        tasksListEl.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">No recent allotments found.</p>';
        return;
    }

    tasks.forEach(task => {
        const time = new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const avatar = task.assignee?.avatar_url || 'assets/operator-avatar.svg';
        
        tasksListEl.insertAdjacentHTML('beforeend', `
            <div class="task-card">
                <div class="task-info">
                    <h4 class="task-name">${task.name}</h4>
                    <p class="task-desc">${task.description}</p>
                    <div class="task-avatars">
                        <img src="${avatar}" alt="Op" class="avatar-img" title="${task.assignee?.display_name}">
                        <span style="font-size: 12px; color: #666; margin-left: 8px;">${task.assignee?.display_name || 'Unassigned'}</span>
                    </div>
                </div>
                <div class="task-meta">
                    <span class="task-time">${time}</span>
                    <button class="btn-allot" onclick="window.location.href='quick-allot.html?target=${unitId}'">Allot Material</button>
                </div>
            </div>
        `);
    });
}