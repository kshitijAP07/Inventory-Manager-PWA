// /**
//  * manager-dashboard.js
//  * * Future Integration Guide:
//  * When you connect your backend (e.g., via fetch API or WebSockets for the Digital Twin),
//  * you will receive JSON data. You can pass that data into a function like `updateDashboardUI()`
//  * to dynamically change the graphs without reloading the page.
//  */

// // Simulated data fetching function (Replace this with actual fetch/axios later)
// async function fetchDashboardData() {
//     // Simulating network delay
//     return new Promise(resolve => {
//         setTimeout(() => {
//             resolve({
//                 efficiency: 85, // Changed from 98 to 85 to see it update
//                 workstations: {
//                     "WS-01": { progress: 75, status: "active" },
//                     "WS-02": { progress: 40, status: "issue" }
//                 }
//             });
//         }, 1000); // Updates 1 second after page load
//     });
// }

// // Function to update the UI elements
// function updateDashboardUI(data) {
//     // 1. Update Efficiency Card
//     const efficiencyRatio = data.efficiency / 100;
//     const efficiencyCard = document.querySelector('.efficiency-card');
//     const efficiencyText = document.getElementById('overall-efficiency');
    
//     // Updates the visual bar width
//     efficiencyCard.style.setProperty('--efficiency-ratio', efficiencyRatio);
//     // Updates the text
//     efficiencyText.innerText = `${data.efficiency}%`;

//     // 2. Update Workstation Mini Rings
//     // Here you would typically loop through your workstation elements, 
//     // find the corresponding ID, and update its --progress variable.
//     // Example for a single ring:
//     // const ringElement = document.getElementById('ring-ws-01');
//     // ringElement.style.setProperty('--progress', `${data.workstations['WS-01'].progress}%`);
// }

// // Initialization function
// async function initDashboard() {
//     // In the future, this might be a WebSocket listener instead of a one-time fetch
//     const data = await fetchDashboardData();
//     updateDashboardUI(data);
// }

// // Run when the DOM is fully loaded
// document.addEventListener('DOMContentLoaded', () => {
//     initDashboard();
// });

// =========================================
// Custom Dropdown Logic
// =========================================
// =========================================
// SECURITY & AUTHENTICATION
// =========================================
// 1. Protect the Route: Kick to login if not a manager
IMAuth.requireAuth(['manager'], '../index.html');

// 2. Wire up the Logout Button
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            // Calls the logout function in auth.js and redirects to root index
            await IMAuth.logout('../index.html');
        });
    }
});

// ... (Keep all your existing dropdown and time filter code below here) ...

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const valueEl = dropdown.querySelector('.dropdown-value');
        const items = dropdown.querySelectorAll('.dropdown-item');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close all other dropdowns first
            document.querySelectorAll('.custom-dropdown.open').forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        });

        items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                // Update active state
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                // Update displayed value
                valueEl.textContent = item.textContent;
                // Close dropdown
                dropdown.classList.remove('open');
            });
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown.open').forEach(d => {
            d.classList.remove('open');
        });
    });

    // =========================================
    // Time Filter (Today / Weekly / Yearly)
    // =========================================
    const efficiencyData = {
        today:  85,
        weekly: 72,
        yearly: 91
    };

    const filterPills = document.querySelectorAll('.filter-pill');
    const efficiencyCard = document.querySelector('.efficiency-card');
    const efficiencyText = document.getElementById('overall-efficiency');

    filterPills.forEach(pill => {
        pill.addEventListener('click', async () => {
            // Update active pill
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            // Get the filter type and fetch from Supabase
            const filter = pill.getAttribute('data-filter');
            const effData = await IMData.getEfficiencyData(filter);
            const efficiency = effData?.value || efficiencyData[filter] || 85;
            const ratio = efficiency / 100;

            // Update the efficiency text and bar
            efficiencyText.textContent = efficiency + '%';
            efficiencyCard.style.setProperty('--efficiency-ratio', ratio);
        });
    });
});

// =========================================
// LIVE DATA FROM SUPABASE
// =========================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadManagerDashboardData();
});

async function loadManagerDashboardData() {
    try {
        // Fetch workstations
        const workstations = await IMData.getWorkstations();
        renderManagerCards(workstations, 'Workstations', 'orange-ring');

        // Fetch assembly lines
        const assemblyLines = await IMData.getAssemblyLines();
        renderManagerCards(assemblyLines, 'Assembly Line', 'dark-ring');

        // Fetch today's efficiency
        const effData = await IMData.getEfficiencyData('today');
        if (effData) {
            const effText = document.getElementById('overall-efficiency');
            const effCard = document.querySelector('.efficiency-card');
            if (effText) effText.textContent = effData.value + '%';
            if (effCard) effCard.style.setProperty('--efficiency-ratio', effData.value / 100);
        }
    } catch (err) {
        console.error('[Manager Dashboard] Failed to load live data:', err);
    }
}

function renderManagerCards(items, sectionTitle, ringClass) {
    // Find the grid that follows the matching section title
    const titles = document.querySelectorAll('.section-title');
    let targetGrid = null;

    titles.forEach(titleEl => {
        if (titleEl.textContent.trim().toLowerCase() === sectionTitle.toLowerCase()) {
            let sibling = titleEl.nextElementSibling;
            if (sibling && sibling.classList.contains('cards-grid')) {
                targetGrid = sibling;
            }
        }
    });

    if (!targetGrid || !items || items.length === 0) return;

    targetGrid.innerHTML = '';

    items.forEach(item => {
        let statusClass = 'status-active';
        let statusLabel = 'Active';
        if (item.status === 'issue') {
            statusClass = 'status-issue';
            statusLabel = 'Issue Raised';
        } else if (item.status === 'hold') {
            statusClass = 'status-hold';
            statusLabel = 'Hold';
        }

        const isAssembly = ringClass === 'dark-ring';
        const wsIdStyle = isAssembly ? ' style="color: var(--color-text-main);"' : '';
        // 1. Define the type string for the URL
        const typeParam = isAssembly ? 'assembly' : 'workstation';

        // 2. Add &type=${typeParam} to the URL
        const cardHTML = `
            <div class="ws-card" onclick="window.location.href='ws-detail.html?id=${item.id}&type=${typeParam}'" style="cursor: pointer;">
                <div class="ws-card-header">
                    <span class="ws-id"${wsIdStyle}>${item.code}</span>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </div>
                <div class="mini-ring-container">
                    <svg viewBox="0 0 36 36" class="circular-chart">
                        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                        <path class="circle ${ringClass}" stroke-dasharray="${item.progress}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                        <text x="18" y="20.35" class="percentage">${item.progress}<tspan class="percentage-small">%</tspan></text>
                    </svg>
                </div>
                <div class="ws-card-footer">${item.name}</div>
                <img src="assets/bell-icon.svg" class="card-bell" alt="Alert">
            </div>
        `;
        targetGrid.insertAdjacentHTML('beforeend', cardHTML);
    });
}