document.addEventListener('DOMContentLoaded', async function () {

    // --- Mock Client ---
    const createMockClient = () => {
        console.warn("Using Mock Client (LocalStorage)");
        const STORAGE_KEY = 'individual_expenses';
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
                    const newRows = rows.map(r => ({ ...r, id: Date.now(), created_at: new Date().toISOString() }));
                    localStorage.setItem(STORAGE_KEY, JSON.stringify([...newRows, ...current]));
                    return { data: newRows, error: null };
                },
                delete: ({ eq }) => { /* simplified delete support mock */
                    // This is complex to mock perfectly with the chain syntax but let's assume valid calls
                }
            }),
            auth: {
                signOut: async () => { window.location.href = 'individual-login.html'; },
                getUser: async () => ({ data: { user: { id: 'mock-user-id' } } })
            }
        };
    };

    let supabase = window.sb || createMockClient();
    let allTransactions = [];

    // --- References ---
    const tbody = document.getElementById('transactionsList');
    const filterType = document.getElementById('filterType');
    const filterCategory = document.getElementById('filterCategory');
    const sortBy = document.getElementById('sortBy');

    // --- Load Data ---
    async function loadData() {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false });

        if (error) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading data</td></tr>';
            return;
        }

        allTransactions = data || [];
        renderTable();
    }

    // --- Render ---
    function renderTable() {
        let filtered = [...allTransactions];

        // Filter Type
        if (filterType.value !== 'all') {
            filtered = filtered.filter(t => t.type === filterType.value);
        }

        // Filter Category
        if (filterCategory.value !== 'all') {
            filtered = filtered.filter(t => t.category === filterCategory.value);
        }

        // Sort
        const sortVal = sortBy.value;
        filtered.sort((a, b) => {
            if (sortVal === 'date-desc') return new Date(b.date) - new Date(a.date);
            if (sortVal === 'date-asc') return new Date(a.date) - new Date(b.date);
            if (sortVal === 'amount-desc') return b.amount - a.amount;
            if (sortVal === 'amount-asc') return a.amount - b.amount;
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No transactions match your filters.</td></tr>';
            return;
        }

        filtered.forEach(txn => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(txn.date).toLocaleDateString()}</td>
                <td><span class="label label-default">${txn.category}</span></td>
                <td>${txn.description || '-'}</td>
                <td><span class="label ${txn.type === 'income' ? 'label-success' : 'label-danger'}">${txn.type}</span></td>
                <td class="${txn.type === 'income' ? 'text-success' : 'text-danger'} text-right">₹${parseFloat(txn.amount).toFixed(2)}</td>
                <td><button class="btn btn-xs btn-default disabled"><i class="fa fa-pencil"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- Event Listeners ---
    filterType.addEventListener('change', renderTable);
    filterCategory.addEventListener('change', renderTable);
    sortBy.addEventListener('change', renderTable);

    // --- Save Transaction (Copy from dashboard) ---
    document.getElementById('saveTransactionBtn').addEventListener('click', async () => {
        // ... simplistic save logic same as dashboard ...
        // For brevity in this multi-file generation, assuming user knows they can add.
        // We will just reload data.
        const type = document.querySelector('input[name="type"]:checked').value;
        const amount = document.getElementById('amount').value;
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const description = document.getElementById('description').value;

        if (!amount || !category || !date) return alert("Fill required fields");

        const { data: { user } } = await supabase.auth.getUser();

        await supabase.from('expenses').insert([{
            user_id: user ? user.id : 'anon',
            type, amount, category, date, description
        }]);

        $('#addTransactionModal').modal('hide');
        document.getElementById('addTransactionForm').reset();
        loadData();
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
    });

    document.getElementById('date').valueAsDate = new Date();

    loadData();
});
