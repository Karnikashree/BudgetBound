// Initialize Supabase from global config
// Wrap all logic in DOMContentLoaded to ensure elements match
document.addEventListener('DOMContentLoaded', function () {
    const getSupabase = () => window.sb;

    // Toast function
    function showToast(type, message, duration = 5000) {
        const toastContainer = document.querySelector('.toast-container');
        const toastTemplate = document.getElementById('toast-template');

        if (toastTemplate && toastContainer) {
            const toast = toastTemplate.cloneNode(true);
            toast.style.display = 'block';
            toast.querySelector('.toast-body').textContent = message;
            toast.querySelector('.toast').classList.add(type);

            // Set icon
            const icon = toast.querySelector('.toast-icon');
            if (icon) {
                if (type === 'success') {
                    icon.innerHTML = '✓';
                    icon.style.color = '#4CAF50';
                } else if (type === 'error') {
                    icon.innerHTML = '✗';
                    icon.style.color = '#f44336';
                } else if (type === 'warning') {
                    icon.innerHTML = '⚠';
                    icon.style.color = '#ff9800';
                }
            }

            // Close button
            const closeBtn = toast.querySelector('.btn-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function () {
                    if (toast.parentNode) toast.remove();
                });
            }

            toastContainer.appendChild(toast);

            // Remove after duration
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.animation = 'slideIn 0.3s ease reverse';
                    setTimeout(() => {
                        if (toast.parentNode) toast.remove();
                    }, 300);
                }
            }, duration);
        }
    }

    // Checking if email belongs to family account
    async function isEmailUsedInFamily(email) {
        try {
            const emailLower = email.toLowerCase();
            const supabase = getSupabase();
            if (!supabase) return { isFamilyAccount: false, message: 'Database error' };

            // 1. Check users table for family type
            const { data: users, error } = await supabase
                .from('users')
                .select('userType, familyId')
                .eq('email', emailLower)
                .eq('userType', 'family')
                .maybeSingle();

            if (users) {
                return {
                    isFamilyAccount: true,
                    familyName: 'Family Account',
                    message: `This email is registered as a Family Account. Please use the Family Login page.`
                };
            }

            return {
                isFamilyAccount: false,
                message: null
            };

        } catch (error) {
            console.error("Error checking family email:", error);
            return {
                isFamilyAccount: false,
                message: null,
                error: error.message
            };
        }
    }

    // Show/Hide Password
    const togglePasswordBtn = document.getElementById('togglePassword');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function () {
            const passwordInput = document.getElementById('password');
            const icon = this.querySelector('i');

            if (passwordInput && passwordInput.type === 'password') {
                passwordInput.type = 'text';
                if (icon) icon.className = 'fa fa-eye-slash';
            } else if (passwordInput) {
                passwordInput.type = 'password';
                if (icon) icon.className = 'fa fa-eye';
            }
        });
    }

    // Form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Reset error messages
            const emailErrorEl = document.getElementById('emailError');
            const passwordErrorEl = document.getElementById('passwordError');
            if (emailErrorEl) emailErrorEl.style.display = 'none';
            if (passwordErrorEl) passwordErrorEl.style.display = 'none';

            // Get form values
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            // Validation flags
            let isValid = true;

            // Validate Email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email) {
                if (emailErrorEl) {
                    emailErrorEl.textContent = 'Email is required';
                    emailErrorEl.style.display = 'block';
                }
                isValid = false;
            } else if (!emailRegex.test(email)) {
                if (emailErrorEl) {
                    emailErrorEl.textContent = 'Please enter a valid email';
                    emailErrorEl.style.display = 'block';
                }
                isValid = false;
            }

            // Validate Password
            if (!password) {
                if (passwordErrorEl) {
                    passwordErrorEl.textContent = 'Password is required';
                    passwordErrorEl.style.display = 'block';
                }
                isValid = false;
            }

            if (!isValid) return;

            // Show loader and disable button
            const loader = document.getElementById('formLoader');
            const loginBtn = document.getElementById('loginBtn');
            if (loader) loader.style.display = 'block';
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerHTML = 'Signing in...';
            }

            try {
                const supabase = getSupabase();
                if (!supabase) throw new Error("Supabase not initialized");

                // FIRST: Try to login with Supabase Auth
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (authError) throw authError;

                if (!authData.session) {
                    showToast('warning', 'Please verify your email address before logging in.');
                    if (loader) loader.style.display = 'none';
                    if (loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.innerHTML = '<i class="fa fa-sign-in"></i> Login';
                    }
                    return;
                }

                const user = authData.user;

                // SECOND: After successful login, check if this is actually a family account
                if (loginBtn) loginBtn.innerHTML = 'Verifying account type...';

                // Check if this email is used in family accounts
                const familyCheck = await isEmailUsedInFamily(user.email);

                if (familyCheck.isFamilyAccount) {
                    // This is a family account! Log them out immediately
                    await supabase.auth.signOut();

                    // Show error message
                    if (loader) loader.style.display = 'none';
                    if (loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.innerHTML = '<i class="fa fa-sign-in"></i> Login';
                    }

                    const errorMsg = familyCheck.message || 'This is a Family Account. Please use the Family Login page.';
                    if (emailErrorEl) {
                        emailErrorEl.textContent = errorMsg;
                        emailErrorEl.style.display = 'block';
                    }
                    showToast('error', errorMsg);
                    return;
                }

                // Update backend stats
                if (loginBtn) loginBtn.innerHTML = 'Setting up your account...';
                try {
                    await supabase
                        .from('users')
                        .update({ lastLogin: new Date().toISOString() })
                        .eq('uid', user.id);
                } catch (dbError) {
                    console.error("Error updating DB:", dbError);
                }

                // Ensure individual profile exists (in case it wasn't created during signup)
                await ensureIndividualProfileExists(user);

                // Login successful
                if (loginBtn) loginBtn.innerHTML = '<i class="fa fa-check"></i> Success!';
                showToast('success', 'Login successful! Redirecting...', 2000);

                // Redirect to individual dashboard after 1.5 seconds
                setTimeout(() => {
                    window.location.href = 'individual-dashboard.html';
                }, 1500);

            } catch (error) {
                console.error("Login error:", error);

                // Hide loader and re-enable button
                if (loader) loader.style.display = 'none';
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<i class="fa fa-sign-in"></i> Login';
                }

                // Show appropriate error message
                let errorMessage = 'Login failed. Please try again.';
                let fieldError = '';

                switch (error.code) {
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address format.';
                        fieldError = 'email';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'This account has been disabled.';
                        break;
                    case 'auth/user-not-found':
                    case 'auth/invalid-login-credentials': // More common now
                        // Check if this might be a family account
                        try {
                            const familyCheck = await isEmailUsedInFamily(email);
                            if (familyCheck.isFamilyAccount) {
                                errorMessage = familyCheck.message;
                                fieldError = 'email';
                            } else {
                                errorMessage = 'Incorrect email or password, or no account found.';
                                fieldError = 'email';
                            }
                        } catch (checkError) {
                            errorMessage = 'Incorrect email or password.';
                            fieldError = 'email';
                        }
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Incorrect password. Please try again.';
                        fieldError = 'password';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Too many failed attempts. Please try again later.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Network error. Please check your internet connection.';
                        break;
                    default:
                        errorMessage = error.message || 'Login failed. Please try again.';
                }

                if (fieldError === 'email' && emailErrorEl) {
                    emailErrorEl.textContent = errorMessage;
                    emailErrorEl.style.display = 'block';
                    if (emailInput) emailInput.focus();
                } else if (fieldError === 'password' && passwordErrorEl) {
                    passwordErrorEl.textContent = errorMessage;
                    passwordErrorEl.style.display = 'block';
                    if (passwordInput) passwordInput.focus();
                } else {
                    showToast('error', errorMessage);
                }
            }
        });
    }

    // Ensure individual profile exists
    async function ensureIndividualProfileExists(user) {
        try {
            const supabase = getSupabase();
            if (!supabase) return;

            // Check if user record exists
            const { data: profile, error } = await supabase
                .from('users')
                .select('uid')
                .eq('uid', user.id)
                .maybeSingle();

            // If profile exists, nothing to do
            if (profile) return;

            console.log("Individual profile missing. Creating now...");

            const metadata = user.user_metadata || {};
            const fullName = metadata.full_name || metadata.name || 'Individual User';
            const phone = metadata.phone || '';
            const uid = user.id;
            const email = user.email;

            const individualData = {
                uid: uid,
                email: email,
                name: fullName,
                phone: phone,
                userType: 'individual',
                displayName: fullName,
                emailVerified: true, // Logged in
                profileComplete: false,
                lastLogin: new Date().toISOString(),
                status: 'active'
            };

            const { error: userError } = await supabase
                .from('users')
                .insert(individualData);

            if (userError) throw userError;

            // Create default sectors
            const { count } = await supabase.from('individual_sectors').select('*', { count: 'exact', head: true }).eq('individualId', uid);

            if (count === 0) {
                const defaultSectors = [
                    { name: "Agriculture", icon: "fa-leaf", type: "both", color: "#4CAF50" },
                    { name: "Private Job", icon: "fa-briefcase", type: "both", color: "#2196F3" },
                    { name: "Government Job", icon: "fa-university", type: "both", color: "#FF9800" },
                    { name: "Business / Self-Employed", icon: "fa-industry", type: "both", color: "#9C27B0" },
                    { name: "Industrial", icon: "fa-cogs", type: "both", color: "#00BCD4" },
                    { name: "IT Sector", icon: "fa-laptop", type: "both", color: "#E91E63" },
                    { name: "Banking & Finance", icon: "fa-money", type: "both", color: "#795548" },
                    { name: "Education", icon: "fa-graduation-cap", type: "both", color: "#F44336" },
                    { name: "Healthcare", icon: "fa-heartbeat", type: "both", color: "#673AB7" },
                    { name: "Transport", icon: "fa-truck", type: "both", color: "#FF5722" },
                    { name: "Retail / E-commerce", icon: "fa-shopping-cart", type: "both", color: "#009688" },
                    { name: "Real Estate / Rental", icon: "fa-home", type: "both", color: "#3F51B5" },
                    { name: "Investments", icon: "fa-line-chart", type: "both", color: "#FF9800" },
                    { name: "Freelancing", icon: "fa-user-md", type: "both", color: "#4CAF50" },
                    { name: "Overseas Income", icon: "fa-plane", type: "both", color: "#9C27B0" },
                    { name: "Others", icon: "fa-ellipsis-h", type: "both", color: "#607D8B" }
                ];

                const sectorsToInsert = defaultSectors.map((sector, index) => ({
                    ...sector,
                    individualId: uid,
                    order: index + 1,
                    isIndividualSector: true
                }));

                const { error: sectorsError } = await supabase
                    .from('individual_sectors')
                    .insert(sectorsToInsert);

                if (sectorsError) console.error("Error creating individual sectors:", sectorsError);
            }

        } catch (error) {
            console.error("Error ensuring individual profile:", error);
        }
    }

    // Set focus on email
    const emailField = document.getElementById('email');
    if (emailField) emailField.focus();

    // Check URL messages
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const type = urlParams.get('type');

    if (message) {
        showToast(type || 'info', decodeURIComponent(message), 5000);
    }

    // Expose helpers globally for onclick attributes
    window.showForgotPassword = function () {
        const emailInput = document.getElementById('email');
        const email = emailInput ? emailInput.value.trim() : '';

        // Create custom modal prompt
        const modalHtml = `
            <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;">
                <div style="background:white;border-radius:10px;padding:30px;max-width:400px;width:90%;">
                    <h3 style="margin-top:0;color:#2E8B57;">Reset Password</h3>
                    <p>Enter your email address to receive a password reset link:</p>
                    <input type="email" id="resetEmail" 
                        placeholder="your@email.com" 
                        style="width:100%;padding:12px;border:2px solid #e0f2e0;border-radius:8px;margin-bottom:15px;"
                        value="${email || ''}">
                    <div style="display:flex;gap:10px;justify-content:flex-end;">
                        <button onclick="closeResetModal()" style="padding:10px 20px;background:#ccc;border:none;border-radius:5px;cursor:pointer;">
                            Cancel
                        </button>
                        <button onclick="sendResetEmail()" style="padding:10px 20px;background:#2E8B57;color:white;border:none;border-radius:5px;cursor:pointer;">
                            Send Reset Link
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.innerHTML = modalHtml;
        modal.id = 'resetPasswordModal';
        document.body.appendChild(modal);

        setTimeout(() => {
            const input = document.getElementById('resetEmail');
            if (input) input.focus();
        }, 100);
    };

    window.closeResetModal = function () {
        const modal = document.getElementById('resetPasswordModal');
        if (modal) modal.remove();
    };

    window.sendResetEmail = async function () {
        const supabase = getSupabase();
        if (!supabase) {
            alert('Database not initialized');
            return;
        }

        const emailInput = document.getElementById('resetEmail');
        if (!emailInput) return;

        const userEmail = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(userEmail)) {
            alert('Please enter a valid email address');
            return;
        }

        const modalContent = document.querySelector('#resetPasswordModal > div > div');
        if (modalContent) {
            modalContent.innerHTML = `
                <h3 style="margin-top:0;color:#2E8B57;">Sending Email...</h3>
                <p>Please wait while we send the reset link to ${userEmail}</p>
                <div style="text-align:center;">
                    <div style="border:3px solid #f3f3f3;border-top:3px solid #4CAF50;border-radius:50%;width:30px;height:30px;animation:spin 1s linear infinite;margin:0 auto;"></div>
                </div>
            `;
        }

        try {
            // Updated to point to the dedicated update-password page
            const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
                redirectTo: window.location.origin + '/update-password.html'
            });

            if (error) throw error;

            if (modalContent) {
                modalContent.innerHTML = `
                    <h3 style="margin-top:0;color:#4CAF50;">Email Sent!</h3>
                    <p>Password reset link has been sent to:</p>
                    <p><strong>${userEmail}</strong></p>
                    <p>Check your inbox and follow the instructions to reset your password.</p>
                    <button onclick="closeResetModal()" style="padding:10px 20px;background:#2E8B57;color:white;border:none;border-radius:5px;cursor:pointer;width:100%;">
                        OK
                    </button>
                `;
            }
        } catch (error) {
            console.error("Password reset error:", error);
            let errorMessage = 'Failed to send reset email. Please try again.';

            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            }

            if (modalContent) {
                modalContent.innerHTML = `
                    <h3 style="margin-top:0;color:#f44336;">Error</h3>
                    <p>${errorMessage}</p>
                    <div style="display:flex;gap:10px;justify-content:flex-end;">
                        <button onclick="closeResetModal()" style="padding:10px 20px;background:#ccc;border:none;border-radius:5px;cursor:pointer;">
                            Cancel
                        </button>
                        <button onclick="showForgotPassword()" style="padding:10px 20px;background:#2E8B57;color:white;border:none;border-radius:5px;cursor:pointer;">
                            Try Again
                        </button>
                    </div>
                `;
            }
        }
    };

});
