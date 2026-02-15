// Initialize Supabase - using a simplified approach with window.sb
// We wrap in IIFE to avoid global scope pollution
(function () {
    // Initialize Supabase from global config
    // Use a unique local variable name to strictly avoid conflicts
    const localSupabase = window.sb;


    // Toast notification function
    function showToast(type, message, duration = 5000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return; // safety check

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">
                ${type === 'success' ? '✓' :
                type === 'error' ? '✗' :
                    type === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <span class="toast-body">${message}</span>
            <button class="btn-close">&times;</button>
        `;

        toastContainer.appendChild(toast);

        const closeBtn = toast.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                toast.remove();
            });
        }

        setTimeout(() => {
            toast.remove();
        }, duration);
    }

    // Show/Hide Password
    const togglePwd = document.getElementById('togglePassword');
    if (togglePwd) {
        togglePwd.addEventListener('click', function () {
            const passwordInput = document.getElementById('password');
            const icon = this.querySelector('i');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.className = 'fa fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                icon.className = 'fa fa-eye';
            }
        });
    }

    const toggleConfirmPwd = document.getElementById('toggleConfirmPassword');
    if (toggleConfirmPwd) {
        toggleConfirmPwd.addEventListener('click', function () {
            const confirmInput = document.getElementById('confirmPassword');
            const icon = this.querySelector('i');

            if (confirmInput.type === 'password') {
                confirmInput.type = 'text';
                icon.className = 'fa fa-eye-slash';
            } else {
                confirmInput.type = 'password';
                icon.className = 'fa fa-eye';
            }
        });
    }

    // Password Strength Checker
    const pwdInput = document.getElementById('password');
    if (pwdInput) {
        pwdInput.addEventListener('input', function () {
            const password = this.value;
            const strengthDiv = document.getElementById('passwordStrength');

            if (password.length === 0) {
                strengthDiv.style.display = 'none';
                return;
            }

            let strength = 0;
            let message = '';
            let className = '';

            // Length check
            if (password.length >= 8) strength++;

            // Contains lowercase
            if (/[a-z]/.test(password)) strength++;

            // Contains uppercase
            if (/[A-Z]/.test(password)) strength++;

            // Contains numbers
            if (/[0-9]/.test(password)) strength++;

            // Contains special characters
            if (/[^A-Za-z0-9]/.test(password)) strength++;

            // Determine strength level
            if (strength <= 2) {
                message = 'Weak password';
                className = 'strength-weak';
            } else if (strength <= 4) {
                message = 'Medium password';
                className = 'strength-medium';
            } else {
                message = 'Strong password';
                className = 'strength-strong';
            }

            strengthDiv.textContent = message;
            strengthDiv.className = `password-strength ${className}`;
            strengthDiv.style.display = 'block';
        });
    }

    // Email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function () {
            const email = this.value;
            const emailError = document.getElementById('emailError');
            const emailSuccess = document.getElementById('emailSuccess');

            if (!email) return;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                if (emailError) {
                    emailError.textContent = 'Please enter a valid email address';
                    emailError.style.display = 'block';
                }
                if (emailSuccess) emailSuccess.style.display = 'none';
            } else {
                if (emailError) emailError.style.display = 'none';
                if (emailSuccess) {
                    emailSuccess.textContent = 'Valid email format';
                    emailSuccess.style.display = 'block';
                }
            }
        });
    }

    // Phone validation
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function () {
            const phone = this.value;
            const phoneError = document.getElementById('phoneError');

            // Only allow numbers
            this.value = phone.replace(/\D/g, '');

            if (phone.length < 10 && phone.length > 0) {
                if (phoneError) {
                    phoneError.textContent = 'Phone number must be 10 digits';
                    phoneError.style.display = 'block';
                }
            } else {
                if (phoneError) phoneError.style.display = 'none';
            }
        });
    }

    // Confirm password validation
    const confirmPwdInput = document.getElementById('confirmPassword');
    if (confirmPwdInput) {
        confirmPwdInput.addEventListener('input', function () {
            const password = document.getElementById('password').value;
            const confirm = this.value;
            const confirmError = document.getElementById('confirmPasswordError');

            if (confirm && password !== confirm) {
                if (confirmError) {
                    confirmError.textContent = 'Passwords do not match';
                    confirmError.style.display = 'block';
                }
            } else {
                if (confirmError) confirmError.style.display = 'none';
            }
        });
    }

    // Terms modal functions - expose to window since they are called by onclick attributes
    window.showTerms = function () {
        document.getElementById('termsModal').style.display = 'block';
    }

    window.hideTerms = function () {
        document.getElementById('termsModal').style.display = 'none';
    }

    window.acceptTerms = function () {
        document.getElementById('termsCheckbox').checked = true;
        window.hideTerms();
        showToast('success', 'Terms accepted successfully');
    }

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        const modal = document.getElementById('termsModal');
        if (event.target === modal) {
            window.hideTerms();
        }
    });

    // Create family document
    async function createFamilyDocument(uid, familyData) {
        try {
            // Create document in 'families' collection
            const familyDocData = {
                uid: uid,
                family_id: uid,
                family_name: familyData.familyName,
                email: familyData.email,
                phone: familyData.phone,
                family_head: familyData.familyHead,
                total_members: familyData.totalMembers,
                // userType, emailVerified, lastLogin moved/removed as they are not in 'families' table
                createdAt: new Date().toISOString(),
                status: 'active',
                subscription: 'free',
                settings: {
                    currency: 'INR',
                    language: 'en',
                    notifications: true,
                    theme: 'light'
                }
            };

            const { error: familyError } = await localSupabase.from('families').insert(familyDocData);
            if (familyError) {
                console.error("Error inserting family:", familyError);
                throw new Error("Family creation failed: " + familyError.message);
            }

            // Create default sectors for family
            // ... (defaultSectors definition is fine) ...
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
            const { error: sectorsError } = await localSupabase.from('family_sectors').insert(sectorsToInsert);
            if (sectorsError) {
                console.error("Error inserting sectors:", sectorsError);
                // Don't block whole signup if sectors fail, just log it? Or robustly try to continue.
                // Usually better to fail loudly in dev.
                throw new Error("Sector creation failed: " + sectorsError.message);
            }

            // Create user document in users collection
            const userData = {
                uid: uid,
                email: familyData.email,
                name: familyData.familyHead,
                role: 'head',
                familyId: uid, // Keeping camelCase here as per users table schema
                familyName: familyData.familyName,
                userType: 'family',
                createdAt: new Date().toISOString(),
                status: 'active'
            };

            const { error: userError } = await localSupabase.from('users').insert(userData);
            if (userError) {
                console.error("Error inserting user:", userError);
                throw new Error("User profile creation failed: " + userError.message);
            }

            return true;

        } catch (error) {
            console.error("DETAILS: Error creating family document:", error);
            if (error.details) console.error("DB Details:", error.details);
            if (error.hint) console.error("DB Hint:", error.hint);
            throw error;
        }
    }

    // Form submission
    const form = document.getElementById('familyForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Reset all error messages
            document.querySelectorAll('.error-message').forEach(el => {
                el.style.display = 'none';
            });

            // Get form values
            const familyName = document.getElementById('familyName').value.trim();
            const familyHeadName = document.getElementById('familyHeadName').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            let totalMembers = document.getElementById('totalMembers').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const termsCheckbox = document.getElementById('termsCheckbox');
            const termsAccepted = termsCheckbox ? termsCheckbox.checked : false;

            // Validation flags
            let isValid = true;

            // Validate Family Name
            if (!familyName) {
                document.getElementById('nameError').textContent = 'Family name is required';
                document.getElementById('nameError').style.display = 'block';
                isValid = false;
            } else if (familyName.length < 2) {
                document.getElementById('nameError').textContent = 'Family name must be at least 2 characters';
                document.getElementById('nameError').style.display = 'block';
                isValid = false;
            }

            // Validate Family Head Name
            if (!familyHeadName) {
                document.getElementById('headNameError').textContent = 'Family Head Name is required';
                document.getElementById('headNameError').style.display = 'block';
                isValid = false;
            } else if (familyHeadName.length < 2) {
                document.getElementById('headNameError').textContent = 'Name must be at least 2 characters';
                document.getElementById('headNameError').style.display = 'block';
                isValid = false;
            }

            // Validate Email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email) {
                document.getElementById('emailError').textContent = 'Email is required';
                document.getElementById('emailError').style.display = 'block';
                isValid = false;
            } else if (!emailRegex.test(email)) {
                document.getElementById('emailError').textContent = 'Please enter a valid email';
                document.getElementById('emailError').style.display = 'block';
                isValid = false;
            }

            // Validate Phone
            if (!phone) {
                document.getElementById('phoneError').textContent = 'Phone number is required';
                document.getElementById('phoneError').style.display = 'block';
                isValid = false;
            } else if (phone.length !== 10) {
                document.getElementById('phoneError').textContent = 'Phone number must be 10 digits';
                document.getElementById('phoneError').style.display = 'block';
                isValid = false;
            }

            // Validate Total Members
            if (!totalMembers || totalMembers < 1) {
                document.getElementById('membersError').textContent = 'Please enter valid number of members';
                document.getElementById('membersError').style.display = 'block';
                isValid = false;
            }

            // Validate Password
            if (!password) {
                document.getElementById('passwordError').textContent = 'Password is required';
                document.getElementById('passwordError').style.display = 'block';
                isValid = false;
            } else if (password.length < 8) {
                document.getElementById('passwordError').textContent = 'Password must be at least 8 characters';
                document.getElementById('passwordError').style.display = 'block';
                isValid = false;
            }

            // Validate Confirm Password
            if (password !== confirmPassword) {
                document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
                document.getElementById('confirmPasswordError').style.display = 'block';
                isValid = false;
            }

            // Validate Terms
            if (!termsAccepted) {
                document.getElementById('termsError').textContent = 'You must accept the terms & conditions';
                document.getElementById('termsError').style.display = 'block';
                isValid = false;
            }

            if (!isValid) {
                showToast('error', 'Please fix the errors in the form');
                return;
            }

            // parse members as int
            totalMembers = parseInt(totalMembers) || 1;

            // Show loader and disable button
            const loader = document.getElementById('formLoader');
            const registerBtn = document.getElementById('registerBtn');
            loader.style.display = 'block';
            registerBtn.disabled = true;
            registerBtn.innerHTML = 'Please wait...';

            try {
                // Create user in Supabase Auth
                const { data, error } = await localSupabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            displayName: familyHeadName, // Head name is better display name for user
                            phone: phone,
                            familyName: familyName,
                            userType: 'family'
                        }
                    }
                });

                if (error) throw error;

                if (data.user) {
                    const uid = data.user.id;

                    if (!data.session) {
                        showToast('warning', 'Registration successful! Please verify your email before logging in.');
                        registerBtn.innerHTML = '<i class="fa fa-envelope"></i> Check Email';
                        setTimeout(() => {
                            window.location.href = 'family-login.html?message=' +
                                encodeURIComponent('Please verify your email address to complete registration.');
                        }, 4000);
                        return;
                    }

                    // Create family document
                    await createFamilyDocument(uid, {
                        familyName: familyName,
                        familyHead: familyHeadName,
                        totalMembers: totalMembers,
                        email: email,
                        phone: phone
                    });

                    // Show success message
                    showToast('success', 'Family account created successfully!');

                    // Update button text
                    registerBtn.innerHTML = '<i class="fa fa-check"></i> Success!';

                    // Redirect to login page after 3 seconds
                    setTimeout(() => {
                        window.location.href = 'family-dashboard.html';
                    }, 2000);
                } else {
                    throw new Error("User creation failed");
                }

            } catch (error) {
                console.error("❌ Registration error:", error);

                // Hide loader and re-enable button
                loader.style.display = 'none';
                registerBtn.disabled = false;
                registerBtn.innerHTML = '<i class="fa fa-user-plus"></i> Create Family Account';

                // Show appropriate error message
                let errorMessage = error.message || 'Registration failed. Please try again.';

                if (errorMessage.includes('already registered') || errorMessage.includes('unique constraint')) {
                    errorMessage = 'This email is already registered. Please login instead.';
                    document.getElementById('emailError').textContent = errorMessage;
                    document.getElementById('emailError').style.display = 'block';
                } else if (errorMessage.includes('valid email')) {
                    errorMessage = 'Invalid email address format.';
                    document.getElementById('emailError').textContent = errorMessage;
                    document.getElementById('emailError').style.display = 'block';
                } else if (errorMessage.includes('password') && errorMessage.includes('characters')) {
                    errorMessage = 'Password is too weak. Please use a stronger password.';
                    document.getElementById('passwordError').textContent = errorMessage;
                    document.getElementById('passwordError').style.display = 'block';
                }

                showToast('error', errorMessage);
            }
        });
    }

    // Initialize page
    document.addEventListener('DOMContentLoaded', function () {
        // Set focus on first input
        const fnInput = document.getElementById('familyName');
        if (fnInput) fnInput.focus();
    });
})();
