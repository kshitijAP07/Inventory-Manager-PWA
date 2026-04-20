// 1. Protect the Route: Kick to login if not an inventory manager
IMAuth.requireAuth(['inventory_manager'], '../index.html');

document.addEventListener('DOMContentLoaded', () => {
    
    // 2. Wire up the Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await IMAuth.logout('../index.html');
        });
    }

    // 3. Fetch and Render Live Data from Supabase
    loadLiveDashboardData();
});

/**
 * Fetches data from Supabase and populates the UI
 */
/**
 * Fetches data from Supabase and populates the UI
 */
async function loadLiveDashboardData() {
    try {
        console.log("📡 Fetching live dashboard data...");

        // Fetch Workstations
        const { data: workstations, error: wsError } = await _supabase
            .from('workstations')
            .select('*')
            .order('code', { ascending: true });

        console.log("✅ Workstations returned:", workstations);
        if (wsError) console.error("❌ Workstations Error:", wsError);

        if (workstations && workstations.length > 0) {
            renderCards(workstations, 'workstations');
        }

        // Fetch Assembly Lines
        const { data: assemblyLines, error: alError } = await _supabase
            .from('assembly_lines')
            .select('*')
            .order('code', { ascending: true });

        console.log("✅ Assembly Lines returned:", assemblyLines);
        if (alError) console.error("❌ Assembly Lines Error:", alError);

        if (assemblyLines && assemblyLines.length > 0) {
            renderCards(assemblyLines, 'assembly line');
        }

        // Fetch Today's Efficiency
        const { data: efficiency, error: effError } = await _supabase
            .from('efficiency_stats')
            .select('value')
            .eq('period', 'today')
            .single();

        if (efficiency) {
            const effValueEl = document.querySelector('.eff-value');
            const effBarEl = document.querySelector('.efficiency-bar');
            if (effValueEl) effValueEl.textContent = `${efficiency.value}%`;
            if (effBarEl) effBarEl.style.width = `${efficiency.value}%`;
        }

    } catch (err) {
        console.error("❌ Failed to load dashboard data:", err);
    }
}

/**
 * Generates the HTML cards dynamically and injects them into the grid
 */
function renderCards(data, sectionTitleText) {
    const sections = document.querySelectorAll('.section-block');
    let targetGrid = null;
    
    sections.forEach(sec => {
        const title = sec.querySelector('.section-title');
        // Added .trim() and .toLowerCase() to make matching foolproof against hidden spaces!
        if (title && title.textContent.trim().toLowerCase() === sectionTitleText.toLowerCase()) {
            targetGrid = sec.querySelector('.cards-grid');
        }
    });

    if (!targetGrid) {
        console.warn(`⚠️ Could not find the HTML grid for section: ${sectionTitleText}`);
        return;
    }

    // Clear the grid
    targetGrid.innerHTML = '';

    // Loop through the live database records
    data.forEach(item => {
        let statusClass = 'status-active';
        let statusLabel = 'Active';
        
        if (item.status === 'issue') {
            statusClass = 'status-issue';
            statusLabel = 'Issue Raised';
        } else if (item.status === 'hold') {
            statusClass = 'status-hold';
            statusLabel = 'Hold';
        }

        // Calculate progress ring degrees (100% = 360deg)
        const progressDeg = (item.progress / 100) * 360;

        const cardHTML = `
            <div class="ws-card" onclick="window.location.href='ws-detail.html?id=${item.id}'" style="cursor: pointer;">
                <div class="card-header">
                    <span class="card-id">${item.code}</span>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </div>
                <div class="css-progress-ring" style="--progress: ${progressDeg}deg;">
                    <span class="progress-value">${item.progress}.</span>
                </div>
                <div class="card-footer">
                    <span class="card-desc">${item.name}</span>
                    <img src="assets/bell-icon.svg" alt="Alert" class="card-icon">
                </div>
            </div>
        `;
        
        targetGrid.insertAdjacentHTML('beforeend', cardHTML);
    });
}
