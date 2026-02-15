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
                }),
                insert: (rows) => {
                    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                    const newRows = rows.map(r => ({ ...r, id: Date.now(), member_name: r.member_name || 'Me' }));
                    localStorage.setItem(STORAGE_KEY, JSON.stringify([...newRows, ...current]));
                    return { data: newRows, error: null };
                }
            }),
            auth: {
                signOut: async () => { window.location.href = 'family-login.html'; },
                getUser: async () => ({ data: { user: { id: 'mock-fam-id', email: 'fam@ex.com', user_metadata: { full_name: 'Dad' } } } })
            }
        };
    };

    let supabase = window.sb || createMockClient();
    let allTransactions = [];

    // --- References ---
    const tbody = document.getElementById('transactionsList');
    const filterMember = document.getElementById('filterMember');
    const filterType = document.getElementById('filterType');

    // --- Load Data ---
    async function loadData() {
        const { data } = await supabase.from('family_expenses').select('*').order('date', { ascending: false });
        allTransactions = data || [];

        // 1. Get Unique Members
        const uniqueMembers = [...new Set(allTransactions.map(t => t.member_name || 'Me'))].sort();
        // Ensure 'Me' is always present if not in list (though Set handles duplicates, manual check if empty)
        if (!uniqueMembers.includes('Me')) uniqueMembers.unshift('Me');

        // 2. Populate Filter Dropdown
        filterMember.innerHTML = '<option value="all">All Members</option>';
        uniqueMembers.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            filterMember.appendChild(opt);
        });

        // 3. Populate Modal Dropdown
        const modalSelect = document.getElementById('txnMemberSelect');
        // Save current selection if re-loading (though usually modal closed on reload)
        modalSelect.innerHTML = '';

        uniqueMembers.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            modalSelect.appendChild(opt);
        });
        // Add Create New option
        const newOpt = document.createElement('option');
        newOpt.value = 'new';
        newOpt.textContent = '+ Add New Member';
        modalSelect.appendChild(newOpt);

        renderTable();
    }

    // --- Render ---
    function renderTable() {
        let filtered = [...allTransactions];
        if (filterMember.value !== 'all') filtered = filtered.filter(t => (t.member_name || 'Me') === filterMember.value);
        if (filterType.value !== 'all') filtered = filtered.filter(t => t.type === filterType.value);

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No transactions found.</td></tr>';
            return;
        }

        filtered.forEach(txn => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(txn.date).toLocaleDateString()}</td>
                <td><span class="label label-info">${txn.member_name || 'Me'}</span></td>
                <td>${txn.category}</td>
                <td>${txn.description || '-'}</td>
                <td>${txn.type}</td>
                <td class="${txn.type === 'income' ? 'text-success' : 'text-danger'} text-right">₹${parseFloat(txn.amount).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- Modal Member Select Logic ---
    const txnMemberSelect = document.getElementById('txnMemberSelect');
    const txnMemberInput = document.getElementById('txnMemberInput');

    txnMemberSelect.addEventListener('change', function () {
        if (this.value === 'new') {
            txnMemberInput.style.display = 'block';
            txnMemberInput.focus();
        } else {
            txnMemberInput.style.display = 'none';
        }
    });

    // Toggle Label based on Type
    const txnMemberLabel = document.getElementById('txnMemberLabel');
    document.querySelectorAll('input[name="type"]').forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.value === 'income') {
                if (txnMemberLabel) txnMemberLabel.textContent = 'Received By';
            } else {
                if (txnMemberLabel) txnMemberLabel.textContent = 'Paid By';
            }
        });
    });

    // Listeners
    filterMember.addEventListener('change', renderTable);
    filterType.addEventListener('change', renderTable);

    // Save
    document.getElementById('saveTransactionBtn').addEventListener('click', async () => {
        const type = document.querySelector('input[name="type"]:checked').value;
        const amount = document.getElementById('amount').value;
        const date = document.getElementById('date').value;
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;

        // Determine Member Name
        let finalMemberName = 'Me';
        if (txnMemberSelect.value === 'new') {
            finalMemberName = txnMemberInput.value.trim();
            if (!finalMemberName) return alert("Please enter the new member's name");
        } else {
            finalMemberName = txnMemberSelect.value;
        }

        if (!amount || !date) return alert("Required fields missing");

        const { data: { user } } = await supabase.auth.getUser();
        // Fallback if 'Me' is selected logic is handled by just using the string "Me" 
        // OR we can map "Me" to the actual user name if desired. 
        // For consistency with filter, let's keep it as the string utilized in the dropdown.

        await supabase.from('family_expenses').insert([{
            family_id: user ? user.id : 'anon',
            member_name: finalMemberName,
            type, amount, category, date, description
        }]);

        $('#addTransactionModal').modal('hide');

        // Reset Custom Input
        txnMemberInput.style.display = 'none';
        txnMemberInput.value = '';

        loadData();
    });

    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
    });

    document.getElementById('date').valueAsDate = new Date();
    loadData();
});
