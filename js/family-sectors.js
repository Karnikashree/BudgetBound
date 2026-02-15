document.addEventListener('DOMContentLoaded', async function () {

    // --- Mock Client ---
    // If Supabase not configured, fall back to localStorage
    const createMockClient = () => {
        const STORAGE_KEY = 'family_sectors';
        const DEFAULT_SECTORS = [
            { id: 1, name: 'Agriculture', icon: 'leaf' },
            { id: 2, name: 'Private Job', icon: 'briefcase' },
            { id: 3, name: 'Government Job', icon: 'university' },
            { id: 4, name: 'Business / Self-Employed', icon: 'industry' },
            { id: 5, name: 'Industrial / Manufacturing', icon: 'cogs' },
            { id: 6, name: 'IT Sector', icon: 'desktop' },
            { id: 7, name: 'Banking & Finance', icon: 'credit-card' },
            { id: 8, name: 'Education', icon: 'graduation-cap' },
            { id: 9, name: 'Healthcare', icon: 'medkit' },
            { id: 10, name: 'Transport', icon: 'bus' },
            { id: 11, name: 'Retail / E-commerce', icon: 'shopping-cart' },
            { id: 12, name: 'Real Estate / Rental', icon: 'building' },
            { id: 13, name: 'Stock Market / Trading', icon: 'line-chart' },
            { id: 14, name: 'Freelance / Other', icon: 'user' },
            { id: 15, name: 'Travel / Tourism', icon: 'plane' },
            { id: 16, name: 'More...', icon: 'ellipsis-h' }
        ];

        return {
            from: () => ({
                select: () => ({
                    order: () => ({
                        data: JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(DEFAULT_SECTORS)),
                        error: null
                    })
                }),
                insert: (rows) => { /* ... simplified ... */ return { data: [], error: null }; }
            }),
            auth: {
                signOut: async () => { window.location.href = 'family-login.html'; },
                getUser: async () => ({ data: { user: { id: 'mock-id' } } })
            }
        };
    };

    let supabase = window.sb || createMockClient();

    // Check if we really have data in DB, if not use the rich DEFAULT list from mock above for visual fidelity
    // Since we want to match the screenshot, we force the list if local storage or db is empty/different.
    // For this specific 'Design Match' task, let's prioritize the list.

    // We will hardcode the list for display to match the requirement exactly unless overridden.
    const DISPLAY_SECTORS = [
        { name: 'Agriculture', icon: 'leaf' },
        { name: 'Private Job', icon: 'briefcase' },
        { name: 'Government Job', icon: 'university' },
        { name: 'Business / Self-Employed', icon: 'industry' }, // FontAwesome 4.7 doesn't have 'factory' but 'industry' is close
        { name: 'Industrial / Manufacturing', icon: 'cogs' },
        { name: 'IT Sector', icon: 'desktop' },
        { name: 'Banking & Finance', icon: 'credit-card' },
        { name: 'Education', icon: 'graduation-cap' },
        { name: 'Healthcare', icon: 'medkit' }, // 'plus-square' or 'medkit'
        { name: 'Transport', icon: 'bus' },
        { name: 'Retail / E-commerce', icon: 'shopping-cart' },
        { name: 'Real Estate / Rental', icon: 'building-o' },
        { name: 'Stock Market / Trading', icon: 'line-chart' },
        { name: 'Freelance / Other', icon: 'user-circle-o' },
        { name: 'Travel / Tourism', icon: 'plane' },
        { name: 'More...', icon: 'ellipsis-h' }
    ];

    const gridEl = document.getElementById('sectorGrid');

    // Load Real Sectors from DB
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: dbSectors } = await supabase
            .from('family_sectors')
            .select('*')
            .eq('family_id', user.id)
            .order('order');

        if (dbSectors && dbSectors.length > 0) {
            renderGrid(dbSectors);
        } else {
            renderGrid(DISPLAY_SECTORS);
        }
    } else {
        renderGrid(DISPLAY_SECTORS);
    }

    function renderGrid(sectors) {
        gridEl.innerHTML = '';

        sectors.forEach(s => {
            const col = document.createElement('div');
            col.className = 'col-md-3 col-sm-4 col-xs-6';

            // Handle different casing/naming conventions just in case
            const name = s.name || s.sector_name || s.Category || 'Unknown';
            // Escape name for onclick
            const safeName = name.replace(/'/g, "\\'");

            // Determine type if available, else guess
            const type = s.type || 'expense';

            // Robust Icon Handling
            let iconClass = '';
            const rawIcon = s.icon || 'folder-o';

            if (rawIcon.includes('fa ')) {
                // If stored as full class string (e.g. "fa fa-home")
                iconClass = rawIcon;
            } else {
                // If stored as name (e.g. "home" or "fa-home")
                const iconName = rawIcon.startsWith('fa-') ? rawIcon : `fa-${rawIcon}`;
                iconClass = `fa ${iconName}`;
            }

            col.innerHTML = `
                <div class="sector-card-new" onclick="selectSector('${safeName}', '${type}')">
                    <div class="icon-circle">
                        <i class="${iconClass} sector-icon-i"></i>
                    </div>
                    <p class="sector-name-new">${name}</p>
                </div>
            `;
            gridEl.appendChild(col);
        });
    }

    // Expose to window so onclick works
    window.selectSector = function (name, dbType) {

        if (!name || name === 'Unknown') {
            alert("Error: Sector name is missing.");
            return;
        }

        let type = dbType || 'expense';
        // Fallback guess if type is 'both' or undefined
        if (!dbType || dbType === 'both') {
            const lower = name.toLowerCase();
            if (lower.includes('job') || lower.includes('business') || lower.includes('agriculture') ||
                lower.includes('industrial') || lower.includes('it sector') || lower.includes('banking') ||
                lower.includes('stock') || lower.includes('freelance')) {
                type = 'income';
            }
        }

        // Use relative path to support subdirectories and file protocol
        // Removing query params to avoid ERR_FILE_NOT_FOUND on some browsers/OS when using file://
        const finalUrl = 'family-budget.html';

        // Backup: Save to localStorage in case URL params get stripped
        localStorage.setItem('selectedSector', name);
        localStorage.setItem('selectedType', type);

        console.log("Navigating to Absolute URL:", finalUrl);
        window.location.assign(finalUrl);
    };

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = 'family-login.html';
    });
});
