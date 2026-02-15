document.addEventListener('DOMContentLoaded', async function () {

    // --- DOM Elements ---
    const mainContent = document.getElementById('mainContent');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');

    const pfFamilyName = document.getElementById('pfFamilyName');
    const pfHeadName = document.getElementById('pfHeadName');

    const statHeadName = document.getElementById('statHeadName');
    const statFamilyName = document.getElementById('statFamilyName');
    const pfTotalMembers = document.getElementById('pfTotalMembers');

    const membersListEl = document.getElementById('membersList');
    const emptyMembers = document.getElementById('emptyMembers');

    // Form Inputs
    const newMemberName = document.getElementById('newMemberName');
    const newMemberRelation = document.getElementById('newMemberRelation');
    const newMemberOccupation = document.getElementById('newMemberOccupation');
    const newMemberAge = document.getElementById('newMemberAge');
    const btnSaveMember = document.getElementById('btnSaveMember');

    // Top Buttons
    const btnDeleteAccount = document.getElementById('btnDeleteAccount');
    const logoutBtn = document.getElementById('logoutBtn');

    // --- Mock Client Setup ---
    const createMockClient = () => {
        // Changed key to v3 to ensure fresh start (empty list)
        const STORAGE_KEY_FAM = 'families_table_v3';
        const STORAGE_KEY_TRANS = 'family_expenses';
        return {
            auth: {
                getUser: async () => ({
                    data: { user: { id: 'mock-fam-id', email: 'fam@mock.com', user_metadata: { full_name: 'Daddy' } } }
                }),
                signOut: async () => { window.location.href = 'family-login.html'; }
            },
            from: (table) => {
                if (table === 'families') {
                    return {
                        select: () => ({
                            eq: () => ({
                                single: async () => {
                                    const data = JSON.parse(localStorage.getItem(STORAGE_KEY_FAM) || 'null');
                                    // Default mock if null - NOW DEFAULTING TO EMPTY MEMBERS
                                    if (!data) return {
                                        data: {
                                            familyName: 'The Mockers',
                                            familyHead: 'Dad',
                                            totalMembers: 1,
                                            settings: {
                                                members: [] // Start Empty!
                                            }
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
                                    current = { ...current, ...updates };
                                    localStorage.setItem(STORAGE_KEY_FAM, JSON.stringify(current));
                                    return { data: [current], error: null };
                                }
                            })
                        })
                    };
                }
                if (table === 'family_expenses') {
                    return {
                        select: () => ({
                            order: () => ({ data: JSON.parse(localStorage.getItem(STORAGE_KEY_TRANS) || '[]'), error: null })
                        })
                    }
                }
                return { select: () => ({ eq: () => ({ single: async () => ({ data: {}, error: null }) }) }) };
            }
        };
    };

    // --- State & Init ---
    let supabase = window.sb || createMockClient();
    let currentFamily = null;
    let familyId = null;

    init();

    async function init() {
        // Check Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'family-login.html';
            return;
        }
        familyId = user.id;
        loadFamilyData(user.id);
    }

    // --- Loading Logic ---
    async function loadFamilyData(uid) {
        // Show Loading
        if (loadingState) loadingState.style.display = 'block';
        if (mainContent) mainContent.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';

        let { data, error } = await supabase.from('families').select('*').eq('uid', uid);

        // Handle .single() manually to avoid potential strictness issues
        if (data && data.length > 0) {
            data = data[0];
        } else {
            data = null;
        }

        // Handle No Data / Error (or Mock fallback)
        if (error || !data) {
            if (!data && uid.startsWith('mock')) {
                // Mock fallback
                data = { familyName: 'My Family', familyHead: 'Admin', settings: { members: [] } };
            } else if (!data) {
                // Real empty state
                if (loadingState) loadingState.style.display = 'none';
                if (emptyState) emptyState.style.display = 'block';
                return;
            }
        }
        currentFamily = data;

        // Render Stats
        const fName = data.family_name || 'My Family';
        const hName = data.family_head || 'Me';

        if (pfFamilyName) pfFamilyName.textContent = fName;
        if (pfHeadName) pfHeadName.textContent = hName;
        if (statFamilyName) statFamilyName.textContent = fName;
        if (statHeadName) statHeadName.textContent = hName;

        // Members Logic
        let members = data.settings && data.settings.members ? data.settings.members : [];

        // DISABLE AUTO-POPULATION
        /*
        if (members.length === 0) {
            const { data: expenses } = await supabase.from('family_expenses').select('member_name');
            if (expenses && expenses.length > 0) {
                 // Logic removed to ensure list is strictly user-managed
            }
        }
        */

        if (pfTotalMembers) pfTotalMembers.textContent = members.length;
        renderMembers(members);

        // Show Content
        if (loadingState) loadingState.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
    }

    function renderMembers(list) {
        if (!membersListEl) return;

        membersListEl.innerHTML = '';
        if (list.length === 0) {
            membersListEl.style.display = 'none';
            if (emptyMembers) emptyMembers.style.display = 'block';
            return;
        } else {
            membersListEl.style.display = 'grid';
            if (emptyMembers) emptyMembers.style.display = 'none';
        }

        list.forEach(m => {
            const isObj = typeof m === 'object';
            const name = isObj ? m.name : m;
            const relation = (isObj && m.relation) ? m.relation : 'Member';

            let detailsParts = [];
            if (isObj && m.age) detailsParts.push(`${m.age} yrs`);
            if (isObj && m.occupation) detailsParts.push(m.occupation);
            const detailsStr = detailsParts.length > 0 ? detailsParts.join(' &bull; ') : '';

            const relationClass = relation === 'Head' ? 'label-primary' : 'label-success';

            const div = document.createElement('div');
            div.className = 'member-item';
            div.innerHTML = `
                <div class="member-avatar">${name.charAt(0).toUpperCase()}</div>
                <div class="member-info">
                    <div class="member-name">${name}</div>
                    <div class="member-tags">
                        <span class="label ${relationClass}">${relation}</span>
                    </div>
                    ${detailsStr ? `<div style="font-size:12px; color:#888; margin-top:4px;">${detailsStr}</div>` : ''}
                </div>
            `;
            membersListEl.appendChild(div);
        });
    }

    // --- Actions ---

    // Save New Member
    if (btnSaveMember) {
        btnSaveMember.addEventListener('click', async () => {
            const name = newMemberName.value.trim();
            const relation = newMemberRelation.value;
            const occupation = newMemberOccupation.value.trim();
            const age = newMemberAge.value.trim();

            if (!name) {
                alert('Please enter a Name');
                return;
            }

            // Current Members
            let members = currentFamily.settings && currentFamily.settings.members ? [...currentFamily.settings.members] : [];

            // Check Duplicate
            const exists = members.some(m => {
                const mName = typeof m === 'string' ? m : m.name;
                return mName.toLowerCase() === name.toLowerCase();
            });

            if (exists) {
                alert('Member already exists');
                return;
            }

            const newMember = {
                name,
                relation,
                occupation,
                age
            };
            members.push(newMember);

            // Optimistic Update
            renderMembers(members);
            if (pfTotalMembers) pfTotalMembers.textContent = members.length;

            // Clear Form
            newMemberName.value = '';
            newMemberOccupation.value = '';
            newMemberAge.value = '';
            newMemberRelation.value = '';

            // Persist
            await updateFamilySettings({ members });
        });
    }

    // Update Settings Helper
    async function updateFamilySettings(newSettingsPart) {
        if (!currentFamily) return;

        const oldSettings = currentFamily.settings || {};
        const mergedSettings = { ...oldSettings, ...newSettingsPart };

        currentFamily.settings = mergedSettings;

        const { error } = await supabase.from('families').update({
            settings: mergedSettings,
            total_members: (mergedSettings.members ? mergedSettings.members.length : 1)
        }).eq('uid', familyId);

        if (error) console.error("Failed to save settings:", error);
    }

    // Delete Account
    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener('click', async () => {
            if (confirm('ARE YOU SURE? This will delete all your family data. This action CANNOT be undone.')) {
                alert('Deleting account...');
                await supabase.auth.signOut();
                window.location.href = 'family-login.html';
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'family-login.html';
        });
    }

});
