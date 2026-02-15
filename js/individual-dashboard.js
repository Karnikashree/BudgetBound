// Initialize Supabase
const getSupabase = () => window.sb;

document.addEventListener('DOMContentLoaded', async function () {
    const supabase = getSupabase();
    let allTransactions = [];

    // --- Stats Elements ---
    const dispBalance = document.getElementById('dispBalance');
    const dispIncome = document.getElementById('dispIncome');
    const dispExpense = document.getElementById('dispExpense');
    const dispSavings = document.getElementById('dispSavings');
    const dispSavingsRate = document.getElementById('dispSavingsRate');
    const dispTxnCount = document.getElementById('dispTxnCount');
    const sectorBody = document.getElementById('sectorSummaryBody');
    const noSectorData = document.getElementById('noSectorData');
    const sectorTable = document.getElementById('sectorSummaryTable');
    const activityContainer = document.getElementById('recentActivityContainer');
    const userNameEl = document.getElementById('userName');

    // Check Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && !window.sb.isMock) {
        window.location.href = 'individual-login.html';
        return;
    }

    // Set User Name
    if (user && user.user_metadata && user.user_metadata.full_name) {
        userNameEl.textContent = user.user_metadata.full_name;
    }

    loadDashboard();

    async function loadDashboard() {
        const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
        if (error) console.error(error);

        allTransactions = data || [];
        calculateStats(allTransactions);
        renderSectorSummary(allTransactions);
        renderRecentActivity(allTransactions);
    }

    function calculateStats(txns) {
        dispTxnCount.textContent = txns.length;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let monthIncome = 0;
        let monthExpense = 0;
        let totalIncome = 0;
        let totalExpense = 0;

        txns.forEach(t => {
            const d = new Date(t.date);
            const amt = parseFloat(t.amount);

            if (t.type === 'income') totalIncome += amt;
            else totalExpense += amt;

            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                if (t.type === 'income') monthIncome += amt;
                else monthExpense += amt;
            }
        });

        // Balance & Savings
        const balance = totalIncome - totalExpense;
        dispBalance.textContent = balance.toLocaleString('en-IN');
        dispSavings.textContent = balance.toLocaleString('en-IN'); // Using balance as 'savings'/net worth

        // Monthly
        dispIncome.textContent = monthIncome.toLocaleString('en-IN');
        dispExpense.textContent = monthExpense.toLocaleString('en-IN');

        // Savings Rate (Monthly based? Or Total? Family dash used monthly. Let's use monthly for consistency if valid, else 0)
        // Wait, family dash logic: if(totalIncome > 0) ... wait, family dash used MONTHLY stats for rate.
        // Let's use MONTHLY income/expense for rate calculation to be useful.
        const monthlyNet = monthIncome - monthExpense;
        let rate = 0;
        if (monthIncome > 0) {
            rate = (monthlyNet / monthIncome) * 100;
        }
        dispSavingsRate.textContent = rate.toFixed(1);

        // Color Savings
        dispSavings.style.color = balance >= 0 ? '#2E8B57' : '#e74c3c';
    }

    function renderSectorSummary(txns) {
        const sectors = {};

        txns.forEach(t => {
            const cat = t.category || 'General';
            if (!sectors[cat]) sectors[cat] = { name: cat, income: 0, expense: 0, icon: 'fa-folder' };

            if (t.type === 'income') sectors[cat].income += parseFloat(t.amount);
            else sectors[cat].expense += parseFloat(t.amount);
        });

        const keys = Object.keys(sectors);
        if (keys.length === 0) {
            if (sectorTable) sectorTable.style.display = 'none';
            if (noSectorData) noSectorData.style.display = 'block';
            return;
        }

        if (sectorTable) sectorTable.style.display = 'table';
        if (noSectorData) noSectorData.style.display = 'none';

        // Sort by activity
        const sectorArray = Object.values(sectors).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));

        let html = '';
        sectorArray.forEach(sector => {
            const net = sector.income - sector.expense;
            const netClass = net >= 0 ? 'text-success' : 'text-danger';
            const netSign = net >= 0 ? '+' : '';

            html += `
                <tr>
                    <td><i class="fa ${sector.icon}"></i> ${sector.name}</td>
                    <td class="text-success">₹${sector.income.toFixed(2)}</td>
                    <td class="text-danger">₹${sector.expense.toFixed(2)}</td>
                    <td class="${netClass}"><strong>${netSign}₹${net.toFixed(2)}</strong></td>
                    <td>
                        <a href="individual-budget.html?category=${encodeURIComponent(sector.name)}&type=expense" 
                           class="btn btn-xs btn-success">
                            <i class="fa fa-eye"></i> View Details
                        </a>
                    </td>
                </tr>
            `;
        });

        if (sectorBody) sectorBody.innerHTML = html;
    }

    function renderRecentActivity(txns) {
        activityContainer.innerHTML = '';
        if (txns.length === 0) {
            activityContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa fa-inbox"></i>
                    <h4>No recent activity</h4>
                    <p>Start by adding your first transaction</p>
                </div>`;
            return;
        }

        const recent = txns.slice(0, 10);
        recent.forEach(t => {
            const amt = parseFloat(t.amount);
            const isInc = t.type === 'income';

            const row = document.createElement('div');
            row.className = 'sector-row';
            row.innerHTML = `
                <div style="width: 50%;">
                   <strong style="display:block; font-size:14px;">${t.category}</strong>
                   <span class="text-muted" style="font-size:11px;">
                        ${new Date(t.date).toLocaleDateString()} • ${t.description || ''}
                   </span>
                </div>
                <div style="width: 30%; text-align:right;">
                    <span class="${isInc ? 'text-success' : 'text-danger'}" style="font-weight:bold; font-size:14px;">
                        ${isInc ? '+' : '-'}₹${amt.toFixed(2)}
                    </span>
                </div>
                <div style="width: 20%; text-align:right;">
                     <span class="label ${isInc ? 'label-success' : 'label-danger'}">${t.type}</span>
                </div>
            `;
            activityContainer.appendChild(row);
        });
    }

    // Export Logic
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            let csv = 'Date,Type,Category,Amount,Description\n';
            allTransactions.forEach(t => {
                const desc = (t.description || '').replace(/"/g, '""');
                csv += `${t.date},${t.type},${t.category},${t.amount},"${desc}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'personal_finances.csv';
            a.click();
        });
    }

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = 'individual-login.html';
    });
});
