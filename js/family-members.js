document.addEventListener('DOMContentLoaded', async function () {

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
    let allTxns = [];
    let uniqueMembers = new Set(); // Global set of member names

    init();

    async function init() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'family-login.html';
            return;
        }

        // Fetch Family Details for Member List
        const { data: familyData, error: famError } = await supabase
            .from('families')
            .select('*')
            .eq('uid', user.id)
            .single();

        // Handle family data
        if (familyData) {
            // Head
            if (familyData.family_head) uniqueMembers.add(familyData.family_head);
            // Members
            if (familyData.settings && familyData.settings.members) {
                familyData.settings.members.forEach(m => {
                    if (typeof m === 'string') uniqueMembers.add(m);
                    else if (m.name) uniqueMembers.add(m.name);
                });
            }
        }

        // Fetch Transactions
        const { data, error } = await supabase
            .from('family_expenses')
            .select('*')
            .eq('family_id', user.id)
            .order('date', { ascending: false });

        if (error) console.error(error);
        allTxns = data || [];

        // Pass members context
        populateMonths(allTxns);
    }

    function populateMonths(data) {
        const select = document.getElementById('monthSelect');
        select.innerHTML = '';

        const months = new Set();
        data.forEach(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months.add(key);
        });

        // Add current month if no data, to ensure blank tables for known members
        if (months.size === 0) {
            const d = new Date();
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months.add(key);
        }

        const sorted = Array.from(months).sort().reverse();
        if (sorted.length === 0) {
            const opt = document.createElement('option');
            opt.text = "No Data";
            select.add(opt);
            return;
        }

        sorted.forEach(m => {
            const [y, mo] = m.split('-');
            const dateObj = new Date(parseInt(y), parseInt(mo) - 1, 1);
            const label = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

            const opt = document.createElement('option');
            opt.value = m;
            opt.text = label;
            select.add(opt);
        });

        // Trigger load for first
        if (sorted.length > 0) loadData(sorted[0]);
    }

    // Load Button functionality
    const loadBtn = document.getElementById('loadBtn');
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            const val = document.getElementById('monthSelect').value;
            if (val) loadData(val);
        });
    }

    function loadData(monthKey) {
        const [y, m] = monthKey.split('-');
        const year = parseInt(y);
        const month = parseInt(m) - 1;

        const filtered = allTxns.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        const members = {};

        // Initialize for ALL known members (from settings)
        uniqueMembers.forEach(name => {
            members[name] = { inc: 0, exp: 0 };
        });

        let grandInc = 0;
        let grandExp = 0;

        filtered.forEach(t => {
            const mem = t.member_name || 'Unknown';
            const amt = parseFloat(t.amount);

            if (!members[mem]) members[mem] = { inc: 0, exp: 0 }; // In case a transaction has a member not in uniqueMembers

            if (t.type === 'income') {
                members[mem].inc += amt;
                grandInc += amt;
            } else {
                members[mem].exp += amt;
                grandExp += amt;
            }
        });

        // Update Top Cards
        document.getElementById('totInc').textContent = '₹' + grandInc.toLocaleString('en-IN');
        document.getElementById('totExp').textContent = '₹' + grandExp.toLocaleString('en-IN');

        const net = grandInc - grandExp;
        const netColor = net >= 0 ? '#2E8B57' : '#e74c3c';
        const netEl = document.getElementById('netBal');
        netEl.textContent = '₹' + net.toLocaleString('en-IN');
        netEl.style.color = netColor;

        document.getElementById('ftTotInc').textContent = '₹' + grandInc.toLocaleString('en-IN');
        document.getElementById('ftTotExp').textContent = '₹' + grandExp.toLocaleString('en-IN');

        // Income Table
        renderTable('incTable', members, grandInc, 'inc');
        renderTable('expTable', members, grandExp, 'exp');

        // Mem Comparison
        renderComparison(members);
    }

    function renderTable(id, mems, grandTotal, prop) {
        const tbody = document.querySelector(`#${id} tbody`);
        tbody.innerHTML = '';

        const list = Object.entries(mems)
            .filter(x => x[1][prop] > 0)
            .sort((a, b) => b[1][prop] - a[1][prop]);

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No data</td></tr>';
            return;
        }

        list.forEach((entry, idx) => {
            const name = entry[0];
            const val = entry[1][prop];
            const pct = grandTotal > 0 ? ((val / grandTotal) * 100).toFixed(1) : 0;
            const colorClass = prop === 'inc' ? 'text-success' : 'text-danger';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${name}</td>
                <td class="text-right ${colorClass}">₹${val.toLocaleString('en-IN')}</td>
                <td class="text-right"><span class="badge" style="background:${prop === 'inc' ? '#4CAF50' : '#e74c3c'}">${pct}%</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderComparison(mems) {
        const tbody = document.querySelector('#compTable tbody');
        tbody.innerHTML = '';

        const list = Object.entries(mems).sort((a, b) => b[0].localeCompare(a[0])); // Alpha sort

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No data</td></tr>';
            return;
        }

        list.forEach(entry => {
            const name = entry[0];
            const i = entry[1].inc;
            const e = entry[1].exp;
            const bal = i - e;

            const isSurplus = bal >= 0;
            const statusBadge = isSurplus
                ? '<span class="badge-surplus"><i class="fa fa-arrow-up"></i> Surplus</span>'
                : '<span class="badge-deficit"><i class="fa fa-arrow-down"></i> Deficit</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${name}</b></td>
                <td class="text-right text-success">₹${i.toLocaleString('en-IN')}</td>
                <td class="text-right text-danger">₹${e.toLocaleString('en-IN')}</td>
                <td class="text-right" style="font-weight:700; color:${isSurplus ? '#2E8B57' : '#e74c3c'}">₹${bal.toLocaleString('en-IN')}</td>
                <td class="text-center">${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
    });
});
