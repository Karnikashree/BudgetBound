// Initialize Supabase - using a simplified approach with window.sb
// accessible via window.sb from supabase-config.js
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

            toastContainer.appendChild(toast);

            // Close button
            const closeBtn = toast.querySelector('.btn-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function () {
                    if (toast.parentNode) toast.remove();
                });
            }

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

    // SIMPLIFIED: Check if email belongs to individual account
    async function isEmailIndividualAccount(email) {
        try {
            const emailLower = email.toLowerCase();

            // First check users collection for individual type
            // First check users collection for individual type
            const supabaseClient = getSupabase();
            const { data: users, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('email', emailLower)
                .limit(1);

            if (error) throw error;

            if (users && users.length > 0) {
                const userData = users[0];
                if (userData.userType === 'individual') {
                    return {
                        isIndividual: true,
                        message: `This email is registered as an Individual Account. Please use the Individual Login page.`
                    };
                }
            }

            return {
                isIndividual: false,
                message: null
            };

        } catch (error) {
            console.error("Error checking individual email:", error);
            return {
                isIndividual: false,
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

    // Form submission - SIMPLIFIED VERSION
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
                loginBtn.innerHTML = 'Checking...';
            }

            try {
                const supabaseClient = getSupabase();
                if (!supabaseClient) throw new Error("Supabase not initialized");

                // FIRST: Check if this is an individual account BEFORE attempting login
                if (loginBtn) loginBtn.innerHTML = 'Checking account type...';

                const individualCheck = await isEmailIndividualAccount(email);
                if (individualCheck.isIndividual) {
                    // This is an individual account - don't allow family login
                    if (loader) loader.style.display = 'none';
                    if (loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.innerHTML = '<i class="fa fa-sign-in"></i> Login';
                    }

                    const errorMsg = individualCheck.message;
                    if (emailErrorEl) {
                        emailErrorEl.textContent = errorMsg;
                        emailErrorEl.style.display = 'block';
                    }
                    showToast('error', errorMsg);
                    return;
                }

                // SECOND: Try to login with Supabase Auth
                if (loginBtn) loginBtn.innerHTML = 'Signing in...';

                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // Check if session exists (Email Confirmation might be ON)
                if (!data.session) {
                    showToast('warning', 'Please verify your email address before logging in.');
                    if (loader) loader.style.display = 'none';
                    if (loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.innerHTML = '<i class="fa fa-sign-in"></i> Login';
                    }
                    return;
                }

                if (data.user) {
                    // Ensure family profile exists (in case it wasn't created during signup due to verification)
                    await ensureFamilyProfileExists(data.user);
                }

                // Login successful
                if (loginBtn) loginBtn.innerHTML = '<i class="fa fa-check"></i> Success!';
                showToast('success', 'Login successful! Redirecting...', 2000);

                // Redirect to family dashboard after 1.5 seconds
                setTimeout(() => {
                    window.location.href = 'family-dashboard.html';
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
                let errorMessage = '';
                let fieldError = '';

                // Supabase error handling
                if (error.message && error.message.includes('Invalid login credentials')) {
                    errorMessage = 'Incorrect email or password. Please try again.';
                    fieldError = 'password';
                } else if (error.message && error.message.includes('Email not confirmed')) {
                    errorMessage = 'Please verify your email address before logging in.';
                    fieldError = 'email';
                } else {
                    errorMessage = error.message || 'Login failed. Please try again.';
                    fieldError = 'email';
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

    // Ensure family profile exists
    async function ensureFamilyProfileExists(user) {
        try {
            const supabaseClient = getSupabase();
            if (!supabaseClient) return;

            // Check if family record exists
            const { data: family, error } = await supabaseClient
                .from('families')
                .select('uid')
                .eq('uid', user.id)
                .maybeSingle();

            // If family record exists, nothing to do
            if (family) return;

            console.log("Family profile missing. Creating now...");

            const metadata = user.user_metadata || {};
            const familyName = metadata.familyName || metadata.displayName || 'My Family';
            const phone = metadata.phone || '';
            const uid = user.id;
            const email = user.email;

            // Create document in 'families' collection
            const familyDocData = {
                uid: uid,
                family_id: uid,
                family_name: familyName,
                email: email,
                phone: phone,
                family_head: familyName,
                total_members: 1,
                userType: 'family',
                createdAt: new Date().toISOString(),
                emailVerified: true, // They are logged in, so verified
                lastLogin: new Date().toISOString(),
                status: 'active',
                subscription: 'free',
                settings: {
                    currency: 'INR',
                    language: 'en',
                    notifications: true,
                    theme: 'light'
                }
            };

            const { error: familyError } = await supabaseClient.from('families').insert(familyDocData);
            if (familyError) throw familyError;

            // Create user document in users collection for the family head
            // Check if user exists first to avoid duplicate key error
            const { data: userDoc } = await supabaseClient.from('users').select('uid').eq('uid', uid).maybeSingle();

            if (!userDoc) {
                const userData = {
                    uid: uid,
                    email: email,
                    name: familyName,
                    role: 'head',
                    familyId: uid,
                    familyName: familyName,
                    userType: 'family',
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    emailVerified: true
                };

                const { error: userError } = await supabaseClient.from('users').insert(userData);
                if (userError) throw userError;
            }

            // Create default sectors for family
            // Check if sectors exist
            const { count } = await supabaseClient.from('family_sectors').select('*', { count: 'exact', head: true }).eq('familyId', uid);

            if (count === 0) {
                const defaultSectors = [
                    { name: "Agriculture", icon: "fa-leaf", type: "both", color: "#4CAF50", createdAt: new Date().toISOString() },
                    { name: "Private Job", icon: "fa-briefcase", type: "both", color: "#2196F3", createdAt: new Date().toISOString() },
                    { name: "Government Job", icon: "fa-university", type: "both", color: "#FF9800", createdAt: new Date().toISOString() },
                    { name: "Business / Self-Employed", icon: "fa-industry", type: "both", color: "#9C27B0", createdAt: new Date().toISOString() },
                    { name: "Industrial", icon: "fa-cogs", type: "both", color: "#00BCD4", createdAt: new Date().toISOString() },
                    { name: "IT Sector", icon: "fa-laptop", type: "both", color: "#E91E63", createdAt: new Date().toISOString() },
                    { name: "Banking & Finance", icon: "fa-money", type: "both", color: "#795548", createdAt: new Date().toISOString() },
                    { name: "Education", icon: "fa-graduation-cap", type: "both", color: "#F44336", createdAt: new Date().toISOString() },
                    { name: "Healthcare", icon: "fa-heartbeat", type: "both", color: "#673AB7", createdAt: new Date().toISOString() },
                    { name: "Transport", icon: "fa-truck", type: "both", color: "#FF5722", createdAt: new Date().toISOString() },
                    { name: "Retail / E-commerce", icon: "fa-shopping-cart", type: "both", color: "#009688", createdAt: new Date().toISOString() },
                    { name: "Real Estate / Rental", icon: "fa-home", type: "both", color: "#3F51B5", createdAt: new Date().toISOString() },
                    { name: "Investments", icon: "fa-line-chart", type: "both", color: "#FF9800", createdAt: new Date().toISOString() },
                    { name: "Freelancing", icon: "fa-user-md", type: "both", color: "#4CAF50", createdAt: new Date().toISOString() },
                    { name: "Overseas Income", icon: "fa-plane", type: "both", color: "#9C27B0", createdAt: new Date().toISOString() },
                    { name: "Others", icon: "fa-ellipsis-h", type: "both", color: "#607D8B", createdAt: new Date().toISOString() }
                ];

                const sectorsToInsert = defaultSectors.map((sector, index) => ({
                    ...sector,
                    order: index + 1,
                    family_id: uid,
                    createdAt: new Date().toISOString()
                }));
                const { error: sectorsError } = await supabaseClient.from('family_sectors').insert(sectorsToInsert);
                if (sectorsError) console.error("Error creating sectors:", sectorsError);
            }

        } catch (error) {
            console.error("Error ensuring family profile:", error);
            // We log but don't block login, though dashboard might be empty
        }
    }

    // Set focus on email field
    const emailField = document.getElementById('email');
    if (emailField) emailField.focus();

    // Check URL for messages
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const type = urlParams.get('type');

    if (message) {
        showToast(type || 'info', decodeURIComponent(message), 5000);
    }

    // Expose helpers globally if needed (for onclick placeholders)
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
                            placeholder="family@example.com" 
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

        // Focus on input field
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
        const supabaseClient = getSupabase();
        if (!supabaseClient) {
            alert("Database not initialized");
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

        // Show loading in modal
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

        if (window.location.protocol === 'file:') {
            alert("⚠️ SECURITY RESTRICTION: Password reset emails cannot be sent when running from the file system (file://).\n\nPlease run your project using a local server (e.g., Live Server in VS Code) or deploy it to a host like Vercel/Netlify.");

            if (modalContent) {
                modalContent.innerHTML = `
                    <h3 style="margin-top:0;color:#ff9800;">Local File Error</h3>
                    <p>Password resets require a valid HTTP(S) URL.</p>
                    <p>Please open this project via a local server (http://localhost...).</p>
                    <button onclick="closeResetModal()" style="padding:10px 20px;background:#ccc;border:none;border-radius:5px;cursor:pointer;">Close</button>
                `;
            }
            return;
        }

        const redirectUrl = window.location.origin + '/update-password.html';
        console.log("Attempting to send reset email with redirect:", redirectUrl);

        try {
            // Send password reset email
            const { error } = await supabaseClient.auth.resetPasswordForEmail(userEmail, {
                redirectTo: redirectUrl
            });

            if (error) throw error;

            // Update modal with success message
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
            }

            // Update modal with error
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
