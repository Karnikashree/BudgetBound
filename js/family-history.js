document.addEventListener('DOMContentLoaded', async function () {

    // --- Mock Client ---
    const createMockClient = () => {
        const STORAGE_KEY = 'family_expenses';
        return {
            from: () => ({
                select: () => ({
                    order: () => ({
                        data: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
                        error: null
                    })
                })
            }),
            auth: {
                signOut: async () => { window.location.href = 'family-login.html'; },
                getUser: async () => ({ data: { user: { id: 'mock-fam-id' } } })
            }
        };
    };

    let supabase = window.sb || createMockClient();
    let allData = [];

    // Init
    init();

    async function init() {
        const { data, error } = await supabase.from('family_expenses').select('*').order('date', { ascending: false });
        if (error) { console.error(error); return; }
        allData = data || [];

        populateMonthDropdown(allData);
    }

    function populateMonthDropdown(data) {
        const select = document.getElementById('monthSelect');
        const months = new Set();

        data.forEach(t => {
            const d = new Date(t.date);
            // Format: YYYY-MM
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months.add(key);
        });

        // Convert to array and sort desc
        const sortedMonths = Array.from(months).sort().reverse();

        if (sortedMonths.length === 0) {
            const opt = document.createElement('option');
            opt.text = "No data available";
            select.add(opt);
            return;
        }

        sortedMonths.forEach(m => {
            const [y, mo] = m.split('-');
            const dateObj = new Date(parseInt(y), parseInt(mo) - 1, 1);
            const label = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

            const opt = document.createElement('option');
            opt.value = m;
            opt.text = label;
            select.add(opt);
        });

        // Auto select first
        select.selectedIndex = 1; // 0 is placeholder
    }

    document.getElementById('loadReportBtn').addEventListener('click', () => {
        const selected = document.getElementById('monthSelect').value;
        if (!selected) {
            alert('Please select a month');
            return;
        }
        loadMonthDetails(selected);
    });

    function loadMonthDetails(monthKey) {
        const [yearStr, monthStr] = monthKey.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1; // 0-indexed

        const monthData = allData.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });

        // --- 1. Header & Summary Cards (Removed) ---
        // document.getElementById('reportMonthLabel').textContent = monthName;

        let totalInc = 0;
        let totalExp = 0;
        let incCount = 0;
        let expCount = 0;

        monthData.forEach(t => {
            const amt = parseFloat(t.amount);
            if (t.type === 'income') {
                totalInc += amt;
                incCount++;
            } else {
                totalExp += amt;
                expCount++;
            }
        });

        // const savings = totalInc - totalExp;
        // const savingsRate = totalInc > 0 ? (savings / totalInc) * 100 : 0;

        // document.getElementById('repIncome').textContent = '₹' + totalInc.toLocaleString('en-IN');
        // document.getElementById('repIncCount').textContent = `${incCount} transactions`;

        // document.getElementById('repExpense').textContent = '₹' + totalExp.toLocaleString('en-IN');
        // document.getElementById('repExpCount').textContent = `${expCount} transactions`;

        // document.getElementById('repSavings').textContent = '₹' + savings.toLocaleString('en-IN');
        // document.getElementById('repSavRate').textContent = `${savingsRate.toFixed(1)}% savings rate`;

        // --- 2. Breakdowns (Income/Expense Tables) ---
        // Group by Member for these tables based on screenshot? 
        // Screenshot "Income Breakdown": # Member Amount Share. 
        // So it lists MEMBERS not Categories.

        const memberStats = {};

        monthData.forEach(t => {
            const m = t.member_name || 'Unknown';
            if (!memberStats[m]) memberStats[m] = { inc: 0, exp: 0 };

            if (t.type === 'income') memberStats[m].inc += parseFloat(t.amount);
            else memberStats[m].exp += parseFloat(t.amount);
        });

        // Sort Data
        monthData.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Render Transaction Table
        const tbody = document.querySelector('#transactionTable tbody');
        if (tbody) {
            tbody.innerHTML = '';

            if (monthData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted"><br>No transactions found<br><br></td></tr>';
            } else {
                monthData.forEach(t => {
                    const typeBadge = t.type === 'income'
                        ? '<span class="label label-success">income</span>'
                        : '<span class="label label-danger">expense</span>';

                    const amtClass = t.type === 'income' ? 'text-success' : 'text-danger';
                    const memberBadge = t.member_name || 'Unknown';

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${new Date(t.date).toLocaleDateString()}</td>
                        <td style="font-weight:600;">${memberBadge}</td>
                        <td>${t.category}</td>
                        <td>${t.description || '-'}</td>
                        <td>${typeBadge}</td>
                        <td class="text-right ${amtClass}"><strong>₹${parseFloat(t.amount).toLocaleString('en-IN')}</strong></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }

        // Hide Member Performance
        const memPerfRow = document.getElementById('memberTable').closest('.row');
        if (memPerfRow) memPerfRow.style.display = 'none';

        // Show Content
        document.getElementById('reportContent').style.display = 'block';
        document.getElementById('reportContent').scrollIntoView({ behavior: 'smooth' });
    }

    function renderTransactionList(tableId, transactions, colorClass) {
        const table = document.getElementById(tableId);
        // Update Panel Title if possible (optional but nice)
        const panel = table.closest('.panel');
        if (panel) {
            const head = panel.querySelector('.panel-heading');
            if (head) head.innerHTML = `<i class="fa fa-list"></i> ${colorClass === 'success' ? 'Income' : 'Expense'} List`;
        }

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Member</th>
                    <th>Category</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted"><br>No transactions found<br><br></td></tr>';
            return;
        }

        transactions.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.member_name || 'Unknown'}</td>
                <td>${t.category}</td>
                <td class="text-right text-${colorClass}"><strong>₹${parseFloat(t.amount).toLocaleString('en-IN')}</strong></td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = 'family-login.html';
    });

});
