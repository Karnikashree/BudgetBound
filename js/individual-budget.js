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
                }),
                insert: (rows) => {
                    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                    const newRows = rows.map(r => ({ ...r, id: Date.now(), created_at: new Date().toISOString() }));
                    localStorage.setItem(STORAGE_KEY, JSON.stringify([...newRows, ...current]));
                    return { data: newRows, error: null };
                }
            }),
            auth: {
                signOut: async () => { window.location.href = 'individual-login.html'; },
                getUser: async () => ({ data: { user: { id: 'mock-user-id' } } })
            }
        };
    };

    let supabase = window.sb || createMockClient();
    let currentUser = null;

    // --- References ---
    const totalIncomeEl = document.getElementById('budgetTotalIncome');
    const totalExpenseEl = document.getElementById('budgetTotalExpense');
    const balanceEl = document.getElementById('budgetBalance');
    const listEl = document.getElementById('budgetTransactionsList');

    const incomeForm = document.getElementById('budgetIncomeForm');
    const expenseForm = document.getElementById('budgetExpenseForm');

    // --- Initialize ---
    document.getElementById('incomeDate').valueAsDate = new Date();
    document.getElementById('expenseDate').valueAsDate = new Date();

    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;

    // --- Check URL Params ---
    const urlParams = new URLSearchParams(window.location.search);
    let paramCategory = urlParams.get('category');
    let paramType = urlParams.get('type');

    // Fallback: Check LocalStorage if URL params missing (for file protocol support)
    if (!paramCategory) {
        const storedSector = localStorage.getItem('selectedSector');
        if (storedSector) {
            paramCategory = storedSector;
            paramType = localStorage.getItem('selectedType') || 'expense';
            // Clean up
            localStorage.removeItem('selectedSector');
            localStorage.removeItem('selectedType');
        }
    }

    if (!paramCategory) {
        alert("Please select a specific sector from the Dashboard to view its budget.");
        window.location.href = 'individual-dashboard.html';
        return;
    }

    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.innerHTML = `<i class=\"fa fa-tag\"></i> Sector: ${paramCategory}`;

    if (paramCategory) {
        const targetFormId = (paramType === 'income') ? 'budgetIncomeForm' : 'budgetExpenseForm';

        // Set fixed sector inputs
        const incFixed = document.getElementById('incomeSectorFixed');
        const expFixed = document.getElementById('expenseSectorFixed');

        if (incFixed) incFixed.value = paramCategory;
        if (expFixed) expFixed.value = paramCategory;

        const formEl = document.getElementById(targetFormId);
        if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // FIXED: matched .form-card instead of .panel
            const panel = formEl.closest('.form-card');
            if (panel) {
                panel.style.transition = 'box-shadow 0.5s';
                panel.style.boxShadow = '0 0 20px rgba(46, 139, 87, 0.5)';
                setTimeout(() => { panel.style.boxShadow = ''; }, 2000);
            }
        }
    }

    loadData();

    // --- Load Data ---
    async function loadData() {
        listEl.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

        let query = supabase.from('expenses').select('*').order('date', { ascending: false });
        if (currentUser && currentUser.id !== 'mock-user-id') {
            query = query.eq('user_id', currentUser.id);
        }

        // Filter by Sector (Category) if present
        if (paramCategory) {
            query = query.eq('category', paramCategory);
        }

        const { data } = await query;
        const allTransactions = data || [];
        updateUI(allTransactions);
    }

    // --- Update UI ---
    function updateUI(transactions) {
        listEl.innerHTML = '';
        let income = 0;
        let expense = 0;

        if (transactions.length === 0) {
            listEl.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No entries yet.</td></tr>';
            totalIncomeEl.textContent = '0.00';
            totalExpenseEl.textContent = '0.00';
            balanceEl.textContent = '0.00';
            return;
        }

        transactions.forEach(t => {
            const amt = parseFloat(t.amount);
            if (t.type === 'income') income += amt;
            else expense += amt;

            // Render Row
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td><span class="label label-default">${t.category}</span></td>
                <td>${t.description || '-'}</td>
                <td><span class="label ${t.type === 'income' ? 'label-success' : 'label-danger'}">${t.type}</span></td>
                <td class="${t.type === 'income' ? 'text-success' : 'text-danger'} text-right">₹${amt.toFixed(2)}</td>
            `;
            listEl.appendChild(tr);
        });

        totalIncomeEl.textContent = income.toFixed(2);
        totalExpenseEl.textContent = expense.toFixed(2);
        const bal = income - expense;
        balanceEl.textContent = bal.toFixed(2);
    }

    // --- Handle Form Submits ---
    async function handleAdd(e, type) {
        e.preventDefault();

        let amount, category, date, description, sourceItem;
        if (type === 'income') {
            amount = document.getElementById('incomeAmount').value;
            category = document.getElementById('incomeSectorFixed').value;
            sourceItem = document.getElementById('incomeSourceInput').value;
            date = document.getElementById('incomeDate').value;
            description = document.getElementById('incomeDescription').value;
        } else {
            amount = document.getElementById('expenseAmount').value;
            category = document.getElementById('expenseSectorFixed').value;
            sourceItem = document.getElementById('expenseSourceInput').value;
            date = document.getElementById('expenseDate').value;
            description = document.getElementById('expenseDescription').value;
        }

        if (!amount || !date) return alert("Please fill amount and date");

        // Combine Source/Item with Description
        let finalDesc = sourceItem;
        if (description) finalDesc += " - " + description;

        const newRow = {
            user_id: currentUser ? currentUser.id : 'anon',
            type: type,
            amount: amount,
            category: category,
            date: date,
            description: finalDesc
        };

        const { error } = await supabase.from('expenses').insert([newRow]);

        if (error) {
            alert('Error: ' + error.message);
        } else {
            if (type === 'income') incomeForm.reset();
            else expenseForm.reset();

            // Re-populate fixed sector
            if (type === 'income') document.getElementById('incomeSectorFixed').value = paramCategory;
            else document.getElementById('expenseSectorFixed').value = paramCategory;

            document.getElementById('incomeDate').valueAsDate = new Date();
            document.getElementById('expenseDate').valueAsDate = new Date();

            loadData();
        }
    }

    incomeForm.addEventListener('submit', (e) => handleAdd(e, 'income'));
    expenseForm.addEventListener('submit', (e) => handleAdd(e, 'expense'));

    // --- Logout ---
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
    });

});
