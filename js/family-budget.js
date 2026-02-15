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
    let currentUser = null;

    // --- References ---
    const totalIncomeEl = document.getElementById('budgetTotalIncome');
    const totalExpenseEl = document.getElementById('budgetTotalExpense');
    const balanceEl = document.getElementById('budgetBalance');
    const listEl = document.getElementById('budgetTransactionsList');

    const incomeForm = document.getElementById('budgetIncomeForm');
    const expenseForm = document.getElementById('budgetExpenseForm');

    // --- Initialize ---
    // Set dates
    document.getElementById('incomeDate').valueAsDate = new Date();
    document.getElementById('expenseDate').valueAsDate = new Date();

    // Load User & Data
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    if (!currentUser && !window.sb) {
        // Mock mode handled
    } else if (!currentUser) {
        window.location.href = 'family-login.html';
    }

    // --- Check URL Params (Sector Redirect) ---
    const urlParams = new URLSearchParams(window.location.search);
    let paramCategory = urlParams.get('category');
    let paramType = urlParams.get('type');

    console.log("Budget Page Loaded");
    console.log("Full URL:", window.location.href);

    // Fallback: Check LocalStorage if URL params missing (fix for stubborn redirect stripping)
    if (!paramCategory) {
        const storedSector = localStorage.getItem('selectedSector');
        if (storedSector) {
            console.log("Recovered sector from localStorage:", storedSector);
            paramCategory = storedSector;
            paramType = localStorage.getItem('selectedType') || 'expense';

            // DO NOT clear it, so it persists on reload
            // localStorage.removeItem('selectedSector');
        }
    } else {
        // If present in URL, ensure it's saved in LocalStorage for future reloads (Sync)
        localStorage.setItem('selectedSector', paramCategory);
        if (paramType) localStorage.setItem('selectedType', paramType);
    }

    console.log("Final Category:", paramCategory);

    // Strict Sector Check
    if (!paramCategory) {
        console.warn("Missing category param, redirecting...");
        alert("Please select a specific sector from the Dashboard to view its budget.\n(Debug: No category in URL or LocalStorage)");
        window.location.href = 'family-dashboard.html';
        return; // Stop execution
    }

    // Update Title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.innerHTML = `<i class="fa fa-tag"></i> Sector: ${paramCategory}`;

    // Load Page Data
    setupForms();

    // Run data/members loading in parallel for speed
    // This fixes "Long loading time" issue
    loadMembers(); // Don't await this, let it populate when ready
    loadData();    // Run this immediately so user sees data fast

    function setupForms() {
        // Set the SECTOR text boxes (Fixed)
        const incSector = document.getElementById('incomeSectorFixed');
        const expSector = document.getElementById('expenseSectorFixed');

        if (incSector) incSector.value = paramCategory;
        if (expSector) expSector.value = paramCategory;

        // Scroll to target form
        const targetFormId = (paramType === 'income') ? 'budgetIncomeForm' : 'budgetExpenseForm';
        const formEl = document.getElementById(targetFormId);

        if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const panel = formEl.closest('.form-card');
            if (panel) {
                panel.style.transition = 'box-shadow 0.5s';
                panel.style.boxShadow = '0 0 20px rgba(46, 139, 87, 0.5)';
                setTimeout(() => { panel.style.boxShadow = ''; }, 2000);
            }
        }
    }

    async function loadMembers() {
        const uniqueMembers = new Set();

        // 1. Fetch Configured Members (Head + Settings)
        try {
            const { data: familyData } = await supabase
                .from('families')
                .select('family_head, settings')
                .eq('uid', currentUser.id)
                .single();

            if (familyData) {
                if (familyData.family_head) uniqueMembers.add(familyData.family_head);
                if (familyData.settings && Array.isArray(familyData.settings.members)) {
                    familyData.settings.members.forEach(m => {
                        const name = (typeof m === 'object' && m.name) ? m.name : m;
                        if (name && name !== 'Me') uniqueMembers.add(name);
                    });
                }
            }
        } catch (err) {
            console.error("Error fetching settings members:", err);
        }

        // 2. Fetch Historical Members - OPTIMIZED
        // Limit to last 100 transactions to prevent massive lag
        try {
            const { data: txns } = await supabase
                .from('family_expenses')
                .select('member_name')
                .eq('family_id', currentUser.id)
                .order('date', { ascending: false })
                .limit(100);

            if (txns) {
                txns.forEach(t => {
                    if (t.member_name && t.member_name !== 'Me') uniqueMembers.add(t.member_name);
                });
            }
        } catch (err) {
            console.warn("Error fetching historical members:", err);
        }

        const populate = (selectId) => {
            const sel = document.getElementById(selectId);
            if (!sel) return;

            sel.innerHTML = '';

            // Add known members
            if (uniqueMembers.size === 0) {
                sel.add(new Option("No Members Found", ""));
            } else {
                uniqueMembers.forEach(m => {
                    sel.add(new Option(m, m));
                });
            }
        };

        populate('incomeMemberSelect');
        populate('expenseMemberSelect');
    }

    // --- Load Data ---
    async function loadData() {
        listEl.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

        // Build Query
        let query = supabase
            .from('family_expenses')
            .select('*')
            .eq('family_id', currentUser.id);

        // Filter by Sector (Category)
        if (paramCategory) {
            query = query.eq('category', paramCategory);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) {
            console.error("Error loading data:", error);
            listEl.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            return;
        }

        const allTransactions = data || [];
        updateUI(allTransactions);
    }


    // --- Update UI ---
    function updateUI(transactions) {
        listEl.innerHTML = '';
        let income = 0;
        let expense = 0;

        if (transactions.length === 0) {
            listEl.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No entries yet.</td></tr>';
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
                <td><span class="label label-info">${t.member_name || 'Unknown'}</span></td>
                <td>${t.category}</td>
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

        let amount, sector, sourceItem, date, description;
        if (type === 'income') {
            amount = document.getElementById('incomeAmount').value;
            sector = document.getElementById('incomeSectorFixed').value; // from hidden/fixed input
            sourceItem = document.getElementById('incomeSourceInput').value;
            date = document.getElementById('incomeDate').value;
            description = document.getElementById('incomeDescription').value;
        } else {
            amount = document.getElementById('expenseAmount').value;
            sector = document.getElementById('expenseSectorFixed').value;
            sourceItem = document.getElementById('expenseSourceInput').value;
            date = document.getElementById('expenseDate').value;
            description = document.getElementById('expenseDescription').value;
        }

        if (!amount || !date) return alert("Please fill amount and date");

        // Determine Member Name
        const memberSelect = document.getElementById(`${type}MemberSelect`);
        const memberName = memberSelect ? memberSelect.value : '';

        if (!memberName) {
            return alert("Please select a family member. Ensure members are added in Settings.");
        }

        // Combine Source/Item with Description
        // This preserves the specific details while keeping the Category as the Sector
        let finalDesc = sourceItem;
        if (description) finalDesc += " - " + description;

        const newRow = {
            family_id: currentUser ? currentUser.id : 'anon',
            member_name: memberName,
            type: type,
            amount: amount,
            category: sector, // CRITICAL: This ensures Dashboard groups by SECTOR
            date: date,
            description: finalDesc
        };

        const { error } = await supabase.from('family_expenses').insert([newRow]);

        if (error) {
            alert('Error: ' + error.message);
        } else {
            // Reset and reload
            if (type === 'income') incomeForm.reset();
            else expenseForm.reset();

            // Restore date defaults
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
