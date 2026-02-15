document.addEventListener('DOMContentLoaded', async function () {

    // Same list for individual as family for consistent UI request
    const DISPLAY_SECTORS = [
        { name: 'Agriculture', icon: 'leaf' },
        { name: 'Private Job', icon: 'briefcase' },
        { name: 'Government Job', icon: 'university' },
        { name: 'Business / Self-Employed', icon: 'industry' },
        { name: 'Industrial / Manufacturing', icon: 'cogs' },
        { name: 'IT Sector', icon: 'desktop' },
        { name: 'Banking & Finance', icon: 'credit-card' },
        { name: 'Education', icon: 'graduation-cap' },
        { name: 'Healthcare', icon: 'medkit' },
        { name: 'Transport', icon: 'bus' },
        { name: 'Retail / E-commerce', icon: 'shopping-cart' },
        { name: 'Real Estate / Rental', icon: 'building-o' },
        { name: 'Stock Market / Trading', icon: 'line-chart' },
        { name: 'Freelance / Other', icon: 'user-circle-o' },
        { name: 'Travel / Tourism', icon: 'plane' },
        { name: 'More...', icon: 'ellipsis-h' }
    ];

    const gridEl = document.getElementById('sectorGrid');

    // Minimal Mock Client for Logout
    const createMockClient = () => {
        return {
            auth: {
                signOut: async () => { window.location.href = 'individual-login.html'; }
            }
        };
    };
    let supabase = window.sb || createMockClient();

    renderGrid(DISPLAY_SECTORS);

    function renderGrid(sectors) {
        gridEl.innerHTML = '';
        sectors.forEach(s => {
            const col = document.createElement('div');
            col.className = 'col-md-3 col-sm-4 col-xs-6';

            col.innerHTML = `
                <div class="sector-card-new" onclick="selectSector('${s.name}')">
                    <div class="icon-circle">
                        <i class="fa fa-${s.icon} sector-icon-i"></i>
                    </div>
                    <p class="sector-name-new">${s.name}</p>
                </div>
            `;
            gridEl.appendChild(col);
        });
    }

    window.selectSector = function (name) {
        const lower = name.toLowerCase();
        let type = 'expense';
        if (lower.includes('job') || lower.includes('business') || lower.includes('agriculture') ||
            lower.includes('industrial') || lower.includes('it sector') || lower.includes('banking') ||
            lower.includes('stock') || lower.includes('freelance')) {
            type = 'income';
        }
        // Save to localStorage for file protocol compatibility
        localStorage.setItem('selectedSector', name);
        localStorage.setItem('selectedType', type);

        // Navigate without query params
        window.location.href = 'individual-budget.html';
    };

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
    });
});
