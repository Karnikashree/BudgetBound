document.addEventListener('DOMContentLoaded', async function () {

    // --- DOM Elements ---
    const mainContent = document.getElementById('mainContent');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');

    // Info Fields
    const currentFamilyName = document.getElementById('currentFamilyName');
    const currentFamilyHead = document.getElementById('currentFamilyHead');
    const currentFamilyEmail = document.getElementById('currentFamilyEmail');
    const currentFamilyMembers = document.getElementById('currentFamilyMembers');

    // Head Info
    const headAvatar = document.getElementById('headAvatar');
    const headName = document.getElementById('headName');
    const headEmail = document.getElementById('headEmail');

    // Inputs
    const newFamilyNameInput = document.getElementById('newFamilyName');
    const newHeadSelect = document.getElementById('newHeadSelect');

    // Mock for handling everything
    const createMockClient = () => {
        const STORAGE_KEY_FAM = 'families_table_v3';
        return {
            auth: {
                getUser: async () => ({
                    data: { user: { id: 'mock-fam-id', email: 'fam@mock.com' } }
                }),
                updateUser: async () => ({ error: null }),
                signOut: async () => { window.location.href = 'family-login.html'; }
            },
            from: (table) => {
                if (table === 'families') {
                    return {
                        select: () => ({
                            eq: () => ({
                                single: async () => {
                                    const data = JSON.parse(localStorage.getItem(STORAGE_KEY_FAM) || 'null');
                                    // Default mock if null
                                    if (!data) return {
                                        data: {
                                            familyName: 'The Mockers',
                                            familyHead: 'Dad',
                                            totalMembers: 1,
                                            email: 'fam@mock.com',
                                            settings: { members: [] }
                                        },
                                        error: null
                                    };
                                    return { data, error: null };
                                }
                            })
                        }),
                        update: (updates) => ({
                            eq: () => ({
                                select: () => {
                                    let current = JSON.parse(localStorage.getItem(STORAGE_KEY_FAM) || '{}');
                                    let merged = { ...current, ...updates };
                                    localStorage.setItem(STORAGE_KEY_FAM, JSON.stringify(merged));
                                    return { data: [merged], error: null };
                                }
                            })
                        })
                    };
                }
                return { select: () => ({ eq: () => ({ single: async () => ({ data: {}, error: null }) }) }) };
            }
        };
    };

    let supabase = window.sb || createMockClient();
    let currentFamily = null;
    let familyId = null;

    init();

    async function init() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'family-login.html';
            return;
        }
        familyId = user.id;
        loadData(user.id);
    }

    async function loadData(uid) {
        // STATE 1: LOADING (Hide others)
        if (loadingState) loadingState.style.display = 'flex'; // Flex for centering
        if (mainContent) mainContent.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';

        const { data, error } = await supabase.from('families').select('*').eq('uid', uid).single();

        // STATE 2: EMPTY / ERROR
        if (error || !data) {
            if (loadingState) loadingState.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex'; // Flex for centering
            if (mainContent) mainContent.style.display = 'none';
            return;
        }
        currentFamily = data;

        // Check for both camelCase (DB schema) and snake_case (Postgres standard)
        const fName = data.familyName || data.family_name || 'Family';
        const fHead = data.familyHead || data.family_head || 'Admin';
        const fEmail = data.email || 'No Email';
        const fMembers = data.totalMembers || data.total_members || 0;
        const fSettings = data.settings || {};

        // Render Info
        if (currentFamilyName) currentFamilyName.textContent = fName;
        if (currentFamilyHead) currentFamilyHead.textContent = fHead;
        if (currentFamilyEmail) currentFamilyEmail.textContent = fEmail;
        if (currentFamilyMembers) currentFamilyMembers.textContent = fMembers;
        if (newFamilyNameInput) newFamilyNameInput.value = fName === 'Family' ? '' : fName;

        // Render Head Section
        if (headName) headName.textContent = fHead;
        if (headEmail) headEmail.textContent = fEmail;
        if (headAvatar) headAvatar.innerHTML = `<span>${(fHead.charAt(0) || 'A').toUpperCase()}</span>`;

        // Populate Transfer Dropdown from Settings.Members
        if (newHeadSelect) {
            newHeadSelect.innerHTML = '<option value="">-- Select a member --</option>';
            const members = fSettings.members || [];
            if (Array.isArray(members)) {
                members.forEach(m => {
                    // Handle obj vs string
                    const mName = typeof m === 'object' ? m.name : m;
                    const opt = document.createElement('option');
                    opt.value = mName;
                    opt.textContent = mName;
                    newHeadSelect.appendChild(opt);
                });
            }
        }

        // STATE 3: CONTENT
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
    }

    // 1. Update Family Name
    const formName = document.getElementById('updateFamilyNameForm');
    if (formName) {
        formName.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = newFamilyNameInput.value.trim();
            if (!newName) return;

            const { error } = await supabase.from('families').update({ familyName: newName }).eq('uid', familyId);

            if (!error) {
                alert('Family Name Updated!');
                if (currentFamilyName) currentFamilyName.textContent = newName;
            } else {
                alert('Error updating name');
            }
        });
    }

    // 2. Transfer Role (Modal Trigger)
    const btnTransfer = document.getElementById('btnOpenTransferModal');
    if (btnTransfer) {
        btnTransfer.addEventListener('click', () => {
            const selectedHead = newHeadSelect.value;
            const pass = document.getElementById('transferPassword').value;

            if (!selectedHead) {
                alert("Please select a member first");
                return;
            }
            if (!pass) {
                alert("Please enter password");
                return;
            }
            $('#transferModal').modal('show');
        });
    }

    const btnConfirmTransfer = document.getElementById('confirmTransferBtn');
    if (btnConfirmTransfer) {
        btnConfirmTransfer.addEventListener('click', async () => {
            const newHead = newHeadSelect.value;

            // In real app, this changes UID reference or adds 'Head' role.
            const { error } = await supabase.from('families').update({ familyHead: newHead }).eq('uid', familyId);

            if (!error) {
                alert(`Role Transferred to ${newHead}. You are no longer admin.`);
                location.reload();
            }
            $('#transferModal').modal('hide');
        });
    }

    // 3. Update Email
    const formEmail = document.getElementById('updateEmailForm');
    if (formEmail) {
        formEmail.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('newEmail').value.trim();
            if (!email) return;

            // Update 'email' in families table directly (no auth confirmation)
            const { error } = await supabase.from('families').update({ email: email }).eq('uid', familyId);

            if (!error) {
                alert("Family Email Updated!");
                if (currentFamilyEmail) currentFamilyEmail.textContent = email;
            } else {
                alert(error.message);
            }
        });
    }

    // 4. Update Password
    const formPass = document.getElementById('updatePasswordForm');
    if (formPass) {
        formPass.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPass = document.getElementById('newPassword').value;
            const confPass = document.getElementById('confirmPassword').value;

            if (newPass !== confPass) {
                alert("Passwords do not match");
                return;
            }
            if (newPass.length < 6) {
                alert("Password too short");
                return;
            }

            const { error } = await supabase.auth.updateUser({ password: newPass });
            if (!error) {
                alert("Password Updated!");
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            } else {
                alert(error.message);
            }
        });
    }


    // 5. Delete Account
    const btnDelete = document.getElementById('btnOpenDeleteModal');
    if (btnDelete) {
        btnDelete.addEventListener('click', () => {
            $('#deleteModal').modal('show');
        });
    }

    const btnConfirmDelete = document.getElementById('confirmDeleteBtn');
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async () => {
            const txt = document.getElementById('confirmText').value;
            if (txt !== 'DELETE MY ACCOUNT') {
                alert("Please type the confirmation text exactly.");
                return;
            }

            // Delete logic
            await supabase.auth.signOut();
            window.location.href = 'family-login.html';
        });
    }

});
