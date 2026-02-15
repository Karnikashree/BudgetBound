document.addEventListener('DOMContentLoaded', async function () {

    // --- Mock Client ---
    const createMockClient = () => {
        const STORAGE_KEY = 'individual_expenses';
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
                signOut: async () => { window.location.href = 'individual-login.html'; },
                getUser: async () => ({ data: { user: { id: 'mock-user-id' } } })
            }
        };
    };

    let supabase = window.sb || createMockClient();
    let allData = [];

    // Init
    init();

    async function init() {
        const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
        if (error) { console.error(error); return; }
        allData = data || [];
        populateMonthDropdown(allData);
    }

    function populateMonthDropdown(data) {
        const select = document.getElementById('monthSelect');
        const months = new Set();

        data.forEach(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months.add(key);
        });

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

        select.selectedIndex = 0; // Select first available
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
        const month = parseInt(monthStr) - 1;

        const monthData = allData.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        // Sort Data by Date Descending
        monthData.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Render Transaction Table
        const tbody = document.querySelector('#transactionTable tbody');
        if (tbody) {
            tbody.innerHTML = '';

            if (monthData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted"><br>No transactions found<br><br></td></tr>';
            } else {
                monthData.forEach(t => {
                    const typeBadge = t.type === 'income'
                        ? '<span class="label label-success">income</span>'
                        : '<span class="label label-danger">expense</span>';

                    const amtClass = t.type === 'income' ? 'text-success' : 'text-danger';

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${new Date(t.date).toLocaleDateString()}</td>
                        <td>${t.category}</td>
                        <td>${t.description || '-'}</td>
                        <td>${typeBadge}</td>
                        <td class="text-right ${amtClass}"><strong>₹${parseFloat(t.amount).toLocaleString('en-IN')}</strong></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }

        document.getElementById('reportContent').style.display = 'block';
        document.getElementById('reportContent').scrollIntoView({ behavior: 'smooth' });
    }

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = 'individual-login.html';
    });

});
