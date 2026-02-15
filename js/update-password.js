document.addEventListener('DOMContentLoaded', async function () {
    const getSupabase = () => window.sb;

    // Toast function (reusing simplified version)
    function showToast(type, message, duration = 5000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        // Basic styles if css/individual-login.css is missing specific toast classes
        toast.style.background = 'white';
        toast.style.padding = '15px';
        toast.style.borderRadius = '8px';
        toast.style.marginTop = '10px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.minWidth = '300px';

        let iconEl = '';
        if (type === 'success') iconEl = '<span style="color:green;margin-right:10px;">✓</span>';
        else if (type === 'error') iconEl = '<span style="color:red;margin-right:10px;">✗</span>';

        toast.innerHTML = `
            ${iconEl}
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }

    // Toggle Password Visibility
    function setupToggle(btnId, inputId) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', function () {
                const input = document.getElementById(inputId);
                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fa fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fa fa-eye';
                }
            });
        }
    }
    setupToggle('toggleNewPassword', 'newPassword');
    setupToggle('toggleConfirmPassword', 'confirmPassword');

    // Handle Password Update
    const form = document.getElementById('updatePasswordForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newPwd = document.getElementById('newPassword').value;
            const confirmPwd = document.getElementById('confirmPassword').value;

            // Validation
            if (newPwd.length < 6) {
                showToast('error', 'Password must be at least 6 characters long');
                return;
            }
            if (newPwd !== confirmPwd) {
                showToast('error', 'Passwords do not match');
                return;
            }

            const loader = document.getElementById('formLoader');
            const btn = document.getElementById('updateBtn');
            loader.style.display = 'block';
            btn.disabled = true;

            try {
                const supabase = getSupabase();
                const { data: { user }, error: updateError } = await supabase.auth.updateUser({ password: newPwd });

                if (updateError) throw updateError;

                showToast('success', 'Password updated successfully!');

                // Determine Redirect
                let redirectUrl = 'family-login.html'; // Default
                if (user) {
                    let type = user.user_metadata ? user.user_metadata.userType : null;

                    if (!type) {
                        try {
                            const { data: profile } = await supabase.from('users').select('userType').eq('uid', user.id).single();
                            if (profile) type = profile.userType;
                        } catch (err) { console.error("Profile check failed", err); }
                    }

                    if (type === 'individual') redirectUrl = 'individual-login.html';
                }

                // Redirect to login after delay
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 2000);

            } catch (error) {
                console.error("Error updating password:", error);
                showToast('error', error.message || "Failed to update password");
                loader.style.display = 'none';
                btn.disabled = false;
            }
        });
    }

    // Check if user is actually authenticated (Supabase sets session from URL hash automatically)
    // If arriving from "Reset Password" email, the URL will have #access_token=...
    // Supabase JS client handles this automatically on init/page load.
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    // Slight delay to allow Supabase to process URL fragment
    if (!session) {
        // We might be waiting for the auto-refresh from hash
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // User is signed in with temporary session, good to go
                console.log("Recovery session active");
            }
        });
    }
});
