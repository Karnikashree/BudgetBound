document.addEventListener('DOMContentLoaded', async function () {

    // Check if Supabase is defined
    if (typeof window.sb === 'undefined') {
        console.error('Supabase client not initialized. Check supabase-config.js');
        showToast('System Error: Database connection failed.', 'error');
        return;
    }

    const supabase = window.sb;
    let currentUser = null;

    // Elements
    const elements = {
        userName: document.getElementById('userName'),
        userEmail: document.getElementById('userEmail'),
        userInitial: document.getElementById('userInitial'),
        userId: document.getElementById('userId'),
        userNameInput: document.getElementById('userNameInput'),
        userEmailDisplay: document.getElementById('userEmailDisplay'),
        phoneNumber: document.getElementById('phoneNumber'),
        currentPassword: document.getElementById('currentPassword'),
        newPassword: document.getElementById('newPassword'),
        confirmPassword: document.getElementById('confirmPassword'),
        profileForm: document.getElementById('profileForm'),
        logoutBtn: document.getElementById('logoutBtn'),
        deleteAccountBtn: document.getElementById('deleteAccountBtn'),
        saveBtn: document.getElementById('saveBtn')
    };

    // --- Init ---
    await loadUserProfile();

    // --- Logout ---
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // --- Load Profile ---
    async function loadUserProfile() {
        // 1. Get Auth User
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            // Check for mock user or redirect
            if (window.sb.isMock) {
                currentUser = { id: 'mock-id', email: 'mock@example.com', user_metadata: { full_name: 'Mock User' } };
            } else {
                window.location.href = 'individual-login.html';
                return;
            }
        } else {
            currentUser = user;
        }

        // 2. Populate Header
        const email = currentUser.email || 'No Email';
        const name = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || 'User';

        elements.userName.textContent = name;
        elements.userEmail.textContent = email;
        elements.userInitial.textContent = name.charAt(0).toUpperCase();

        // 3. Populate Form
        elements.userId.value = currentUser.id;
        elements.userNameInput.value = name;
        elements.userEmailDisplay.textContent = email;
        elements.phoneNumber.value = currentUser.user_metadata?.phone || ''; // Assuming phone stored in metadata
    }

    // --- Save Logic ---
    if (elements.profileForm) {
        elements.profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newName = elements.userNameInput.value.trim();
            const newPhone = elements.phoneNumber.value.trim();
            const newPass = elements.newPassword.value;
            const confirmPass = elements.confirmPassword.value;

            if (!nms(newName)) {
                showToast('Name is required.', 'error');
                return;
            }

            setLoading(true);

            // 1. Update Profile (Metadata)
            const updates = {
                data: {
                    full_name: newName,
                    phone: newPhone
                }
            };

            // 2. Password Change (if provided)
            if (newPass) {
                if (newPass.length < 8) {
                    showToast('Password must be at least 8 characters.', 'error');
                    setLoading(false);
                    return;
                }
                if (newPass !== confirmPass) {
                    showToast('Passwords do not match.', 'error');
                    setLoading(false);
                    return;
                }
                updates.password = newPass;
            }

            const { error } = await supabase.auth.updateUser(updates);

            if (error) {
                showToast(error.message, 'error');
            } else {
                showToast('Profile updated successfully!', 'success');
                // Refresh local display
                elements.userName.textContent = newName;
                elements.userInitial.textContent = newName.charAt(0).toUpperCase();

                // Clear password fields
                elements.currentPassword.value = '';
                elements.newPassword.value = '';
                elements.confirmPassword.value = '';
            }

            setLoading(false);
        });
    }

    // --- Delete Account ---
    if (elements.deleteAccountBtn) {
        elements.deleteAccountBtn.addEventListener('click', async () => {
            if (confirm("Are you SURE you want to delete your account? This cannot be undone.")) {
                // In Supabase client side, deleting own user requires admin/service role usually.
                // Or calling an RPC/Edge function.
                // For this demo, we'll try standard call if enabled, or show message.

                showToast('Requesting account deletion...', 'info');

                // Note: Standard client often cannot delete self. Assuming backend handles or this is placeholder.
                // We will sign out and pretend for safety in this frontend-only context unless configured.
                // Real impl: Call to backend API is best.

                setTimeout(async () => {
                    await supabase.auth.signOut();
                    alert("Account deleted (simulated). Goodbye!");
                    window.location.href = 'index.html';
                }, 1500);
            }
        });
    }

    // --- Helpers ---
    function nms(str) { return str && str.length > 0; }

    function setLoading(isLoading) {
        if (elements.saveBtn) {
            elements.saveBtn.disabled = isLoading;
            elements.saveBtn.innerHTML = isLoading ? '<i class="fa fa-spinner fa-spin"></i> Saving...' : '<i class="fa fa-save"></i> Save Changes';
        }
    }

    function showToast(message, type = 'success') {
        const container = document.querySelector('.toast-container');
        const template = document.getElementById('toast-template').innerHTML; // Inner content of template div

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.innerHTML = template;
        const toast = wrapper.firstElementChild; // .toast element

        if (type === 'error') {
            toast.classList.add('error');
            toast.classList.remove('success');
        } else {
            toast.classList.add('success');
            toast.classList.remove('error');
        }

        toast.querySelector('.toast-body').textContent = message;

        // Close btn
        toast.querySelector('.btn-close').onclick = () => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        };

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

});
