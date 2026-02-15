// Initialize Supabase - simplified access via window.sb
const getSupabase = () => window.sb;

// Global variables
let currentUser = null;
let currentFamilyId = null;
let familyData = null;

// Toast notification function
function showToast(type, message, duration = 5000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">
            ${type === 'success' ? '✓' :
            type === 'error' ? '✗' :
                type === 'warning' ? '⚠' : 'ℹ'}
        </span>
        <span class="toast-body">${message}</span>
        <button class="btn-close">&times;</button>
    `;

    toastContainer.appendChild(toast);

    const closeBtn = toast.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });
    }

    setTimeout(() => {
        toast.remove();
    }, duration);
}

// Calculate time ago for recent activity
function getTimeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;

    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

// Update recent activity list
function updateRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    if (!container) return;

    if (activities.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa fa-inbox"></i>
                <h4>No recent activity</h4>
                <p>Start by adding your first transaction</p>
            </div>
        `;
        return;
    }

    let html = '';

    activities.forEach(activity => {
        const iconClass = activity.type === 'income' ? 'text-success' : 'text-danger';
        const amountSign = activity.type === 'income' ? '+' : '-';
        const person = activity.receivedBy || activity.paidBy; // Use the parsed property

        // Format time
        const timeAgo = getTimeAgo(activity.time);

        html += `
            <div class="sector-row">
                <div style="width: 50%;">
                   <strong style="display:block; font-size:14px;">${activity.title}</strong>
                   <span class="text-muted" style="font-size:11px;">
                        ${activity.type === 'income' ? 'Received by: ' : 'Paid by: '} <strong>${person}</strong> • ${activity.sector}
                   </span>
                </div>
                <div style="width: 30%; text-align:right;">
                    <span class="${iconClass}" style="font-weight:bold; font-size:14px;">
                        ${amountSign}₹${activity.amount.toFixed(2)}
                    </span>
                    <div style="font-size:11px; color:#aaa;">${timeAgo}</div>
                </div>
                <div style="width: 20%; text-align:right;">
                     <span class="label ${activity.type === 'income' ? 'label-success' : 'label-danger'}">${activity.type}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Load sector-wise summary for dashboard
async function loadSectorSummary() {
    if (!currentFamilyId && !window.sb.isMock) return; // Allow mock
    const supabase = getSupabase();

    try {
        // Mock fallback if user is null in mock mode
        const fid = currentFamilyId || 'mock-fam-id';

        // Get all sectors
        const { data: sectors, error: sectorsError } = await supabase
            .from('family_sectors')
            .select('*')
            .eq('family_id', fid)
            .order('name');

        // ... Existing Logic but simplified for 'family_expenses' table ...
        // Note: The previous logic separate filtered from 'family_expenses' and 'family_incomes'
        // But our schema seems to be 'family_expenses' with 'type' column
        // I will adapt the logic to use 'family_expenses' for BOTH income and expense if that's the schema.
        // Step 315 showed 'family_expenses' usage for all.

        // Re-implementing with 'family_expenses' single table strategy
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const { data: txns } = await supabase
            .from('family_expenses')
            .select('*')
            .eq('family_id', fid); // Check filtering by ID

        const sectorData = {};

        // Initialize with defined sectors
        if (sectors) {
            sectors.forEach(s => {
                // Ban List: Ignore "salary" pseudo-sectors
                const lower = s.name.toLowerCase();
                if (lower === 'salary' || lower === 'sslary' || lower === 'income') return;

                sectorData[s.name] = {
                    name: s.name,
                    income: 0,
                    expense: 0,
                    icon: s.icon || 'fa-folder', // Use DB icon
                    type: s.type || 'expense'
                };
            });
        }

        if ((!txns || txns.length === 0) && (!sectors || sectors.length === 0)) {
            const summaryTable = document.getElementById('sectorSummaryTable');
            const noData = document.getElementById('noSectorData');
            if (summaryTable) summaryTable.style.display = 'none';
            if (noData) noData.style.display = 'block';
            return;
        }

        if (txns) {
            txns.forEach(t => {
                const cat = t.category || 'Uncategorized';

                // STRICT MODE: Only show defined Sectors (User Request)
                // Ignore ad-hoc categories like 'salary' that are not in family_sectors table
                if (sectorData[cat]) {
                    if (t.type === 'income') sectorData[cat].income += parseFloat(t.amount);
                    else sectorData[cat].expense += parseFloat(t.amount);
                }
            });
        }

        // Prepare table rows
        const tableBody = document.getElementById('sectorSummaryBody');
        if (!tableBody) return;

        let html = '';
        const sectorArray = Object.values(sectorData).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));

        // Filter out empty sectors
        const usedSectors = sectorArray.filter(s => s.income > 0 || s.expense > 0);

        if (usedSectors.length === 0) {
            document.getElementById('sectorSummaryTable').style.display = 'none';
            document.getElementById('noSectorData').style.display = 'block';
            return;
        }

        usedSectors.forEach(sector => {
            const net = sector.income - sector.expense;
            const netClass = net >= 0 ? 'text-success' : 'text-danger';
            const netSign = net >= 0 ? '+' : '';

            html += `
                <tr>
                    <td>
                        <i class="fa ${sector.icon}"></i> ${sector.name}
                    </td>
                    <td class="text-success">
                        <i class="fa fa-money"></i> ₹${sector.income.toFixed(2)}
                    </td>
                    <td class="text-danger">
                        <i class="fa fa-shopping-cart"></i> ₹${sector.expense.toFixed(2)}
                    </td>
                    <td class="${netClass}">
                        <strong>${netSign}₹${net.toFixed(2)}</strong>
                    </td>
                    <td>
                        <button onclick="viewSectorDetails('${sector.name.replace(/'/g, "\\'")}')" 
                           class="btn btn-default btn-xs" style="border: 1px solid #4CAF50; color: #4CAF50;">
                            <i class="fa fa-eye"></i> View Details
                        </button>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
        document.getElementById('sectorSummaryTable').style.display = 'table';
        document.getElementById('noSectorData').style.display = 'none';

    } catch (error) {
        console.error("Error loading sector summary:", error);
    }
}

// Helper for sector navigation
window.viewSectorDetails = function (name) {
    const url = `family-budget.html?category=${encodeURIComponent(name)}&type=expense`;

    // Backup for fallback
    localStorage.setItem('selectedSector', name);
    localStorage.setItem('selectedType', 'expense');

    console.log("Navigating to sector:", name, "URL:", url);
    window.location.assign(url);
};


// Load dashboard data
async function loadDashboardData() {
    const supabase = getSupabase();

    // Mock user check
    const { data: { user } } = await supabase.auth.getUser();
    currentFamilyId = user ? user.id : 'mock-fam-id';

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    try {
        if (!currentFamilyId) return;

        // Verify family profile exists first
        const { data: familyProfile, error: famError } = await supabase
            .from('families')
            .select('*')
            .eq('uid', currentFamilyId);

        if (famError || !familyProfile || familyProfile.length === 0) {
            console.warn("No family profile found for user:", currentFamilyId);
            // Optionally redirect or show setup modal
            return;
        }

        // Set Family Head Name in Header
        const headName = familyProfile[0].family_head || familyProfile[0].familyHead || 'User';
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = headName;

        // Fetch valid sectors to filter stats (Strict Mode)
        const { data: sectors } = await supabase
            .from('family_sectors')
            .select('name')
            .eq('family_id', currentFamilyId);

        // Initialize set with defined sectors
        const validSectors = new Set();
        (sectors || []).forEach(s => {
            // Ban List: Filter out user-created sectors that are actually descriptions/sources
            // This fixes the issue where "salary" appears as a sector
            const lower = s.name.toLowerCase();
            if (lower !== 'salary' && lower !== 'sslary' && lower !== 'income') {
                validSectors.add(s.name);
            }
        });

        const { data: txns } = await supabase
            .from('family_expenses')
            .select('*')
            .eq('family_id', currentFamilyId)
            .order('date', { ascending: false });

        if (!txns) return;

        let totalIncome = 0;
        let totalExpense = 0;
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        let totalTransactions = 0;
        let recentActivities = [];

        txns.forEach(t => {
            // STRICT FILTER: Only process if category is a valid sector
            if (!validSectors.has(t.category)) return;

            totalTransactions++;
            const amt = parseFloat(t.amount);
            const d = new Date(t.date);

            // Total Stats
            if (t.type === 'income') totalIncome += amt;
            else totalExpense += amt;

            // Monthly Stats
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                if (t.type === 'income') monthlyIncome += amt;
                else monthlyExpense += amt;
            }

            // Recent Activity Object
            recentActivities.push({
                type: t.type,
                title: t.category, // Using category as title
                amount: amt,
                paidBy: t.member_name || 'Me', // Assuming member_name column
                receivedBy: t.member_name || 'Me',
                date: t.date,
                time: new Date(t.date), // Approximate time
                sector: t.category
            });
        });

        // Calculate savings
        const monthlySavings = monthlyIncome - monthlyExpense;
        let savingsRate = 0;
        if (monthlyIncome > 0) {
            savingsRate = ((monthlySavings) / monthlyIncome * 100);
        }

        // Update UI
        const elTotalMembers = document.getElementById('totalMembers');
        const elMonthlyIncome = document.getElementById('monthlyIncome');
        const elMonthlyExpense = document.getElementById('monthlyExpense');
        const elMonthlySavings = document.getElementById('monthlySavings');
        const elSavingsRate = document.getElementById('savingsRate');
        const elTotalTransactions = document.getElementById('totalTransactions');

        // Members Count (Total Configured Members)
        let memberCount = 1; // Default to Head only
        if (familyProfile && familyProfile[0]) {
            // Prefer explicit count if available, else calculate from settings array
            if (familyProfile[0].total_members) {
                memberCount = familyProfile[0].total_members;
            } else if (familyProfile[0].settings && Array.isArray(familyProfile[0].settings.members)) {
                memberCount = familyProfile[0].settings.members.length + 1; // +1 for Head
            }
        }
        if (elTotalMembers) elTotalMembers.textContent = memberCount;

        if (elMonthlyIncome) elMonthlyIncome.textContent = `₹${monthlyIncome.toLocaleString('en-IN')}`;
        if (elMonthlyExpense) elMonthlyExpense.textContent = `₹${monthlyExpense.toLocaleString('en-IN')}`;
        if (elMonthlySavings) elMonthlySavings.textContent = `₹${monthlySavings.toLocaleString('en-IN')}`;
        if (elSavingsRate) elSavingsRate.textContent = `${savingsRate.toFixed(1)}%`;
        if (elTotalTransactions) elTotalTransactions.textContent = totalTransactions;

        // Color savings
        if (elMonthlySavings) {
            elMonthlySavings.style.color = monthlySavings >= 0 ? '#2E8B57' : '#e74c3c';
        }

        // Update recent activity (Top 10)
        updateRecentActivity(recentActivities.slice(0, 10));

        // Load sector summary
        await loadSectorSummary();

    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}

// Export all data as CSV
window.exportAllData = async function () {
    const supabase = getSupabase();
    alert("Exporting data...");

    const { data: txns } = await supabase.from('family_expenses').select('*');
    if (!txns || txns.length === 0) {
        alert("No data to export");
        return;
    }

    let csv = 'Date,Member,Type,Category,Amount,Description\n';
    txns.forEach(t => {
        csv += `${t.date},${t.member_name || 'Me'},${t.type},${t.category},${t.amount},"${t.description || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Family_Finances_Export.csv`;
    a.click();
}

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    loadDashboardData();

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            const supabase = getSupabase();
            await supabase.auth.signOut();
            window.location.href = 'family-login.html';
        });
    }
});
