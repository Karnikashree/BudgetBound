// Initialize Supabase
const getSupabase = () => window.sb;

// Toast notification function
function showToast(type, message, duration = 5000) {
    const toastContainer = document.getElementById('toastContainer');
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
    closeBtn.addEventListener('click', () => {
        toast.remove();
    });

    setTimeout(() => {
        toast.remove();
    }, duration);
}

// Show/Hide Password
document.getElementById('togglePassword').addEventListener('click', function () {
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

document.getElementById('toggleConfirmPassword').addEventListener('click', function () {
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

// Password Strength Checker
document.getElementById('password').addEventListener('input', function () {
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

// Email validation
document.getElementById('email').addEventListener('blur', function () {
    const email = this.value;
    const emailError = document.getElementById('emailError');
    const emailSuccess = document.getElementById('emailSuccess');

    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        emailError.textContent = 'Please enter a valid email address';
        emailError.style.display = 'block';
        emailSuccess.style.display = 'none';
    } else {
        emailError.style.display = 'none';
        emailSuccess.textContent = 'Valid email format';
        emailSuccess.style.display = 'block';
    }
});

// Phone validation
document.getElementById('phone').addEventListener('input', function () {
    const phone = this.value;
    const phoneError = document.getElementById('phoneError');

    // Only allow numbers
    this.value = phone.replace(/\D/g, '');

    if (phone.length < 10 && phone.length > 0) {
        phoneError.textContent = 'Phone number must be 10 digits';
        phoneError.style.display = 'block';
    } else {
        phoneError.style.display = 'none';
    }
});

// Confirm password validation
document.getElementById('confirmPassword').addEventListener('input', function () {
    const password = document.getElementById('password').value;
    const confirm = this.value;
    const confirmError = document.getElementById('confirmPasswordError');

    if (confirm && password !== confirm) {
        confirmError.textContent = 'Passwords do not match';
        confirmError.style.display = 'block';
    } else {
        confirmError.style.display = 'none';
    }
});

// Terms modal functions
function showTerms() {
    document.getElementById('termsModal').style.display = 'block';
}

function hideTerms() {
    document.getElementById('termsModal').style.display = 'none';
}

function acceptTerms() {
    document.getElementById('termsCheckbox').checked = true;
    hideTerms();
    showToast('success', 'Terms accepted successfully');
}

// Close modal when clicking outside
window.addEventListener('click', function (event) {
    const modal = document.getElementById('termsModal');
    if (event.target === modal) {
        hideTerms();
    }
});

// Create individual user document in separate 'individuals' collection
// Create individual user document in separate 'individuals' or 'users' table
async function createIndividualDocument(uid, userData) {
    try {
        const supabase = getSupabase();
        // Create document in 'users' table (assuming shared table or individuals table)
        // Adapting to Supabase: usually we put user profile in 'users' or 'profiles' table
        const individualData = {
            uid: uid,
            email: userData.email,
            name: userData.name,
            phone: userData.phone,
            userType: 'individual',
            // displayName: userData.name, // Removed to avoid schema mismatch
            createdAt: new Date().toISOString(),
            status: 'active'
            // emailVerified, profileComplete, lastLogin removed as they likely don't exist in table
        };

        const { error: userError } = await supabase
            .from('users') // or individuals
            .insert([individualData]);

        if (userError) throw userError;

        // ========== FIXED: Use 16 Family Sectors ==========
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
            individualId: uid, // Matches schema column "individualId"
            order: index + 1
        }));

        const { error: sectorsError } = await supabase
            .from('individual_sectors')
            .insert(sectorsToInsert);

        if (sectorsError) throw sectorsError;

        return true;

    } catch (error) {
        console.error("❌ Error creating individual document:", error);
        throw error;
    }
}

// Form submission
document.getElementById('individualForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset all error messages
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
    });

    // Get form values
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsAccepted = document.getElementById('termsCheckbox').checked;

    // Validation flags
    let isValid = true;

    // Validate Name
    if (!name) {
        document.getElementById('nameError').textContent = 'Full name is required';
        document.getElementById('nameError').style.display = 'block';
        isValid = false;
    } else if (name.length < 2) {
        document.getElementById('nameError').textContent = 'Name must be at least 2 characters';
        document.getElementById('nameError').style.display = 'block';
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

    // Show loader and disable button
    const loader = document.getElementById('formLoader');
    const registerBtn = document.getElementById('registerBtn');
    loader.style.display = 'block';
    registerBtn.disabled = true;
    registerBtn.innerHTML = 'Please wait...';

    try {
        const supabase = getSupabase();
        // Create user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    phone: phone,
                    userType: 'individual'
                }
            }
        });

        if (authError) throw authError;

        if (authData.user) {
            // Check if session exists (Email Confirmation might be ON)
            if (!authData.session) {
                // Session is null -> Email confirmation likely required
                // In this case, we cannot insert into 'users' table due to RLS policies relying on auth.uid()
                // We must inform the user.

                showToast('warning', 'Registration successful! Please verify your email before logging in.');
                registerBtn.innerHTML = '<i class="fa fa-envelope"></i> Check Email';

                // We cannot create the profile document yet because we are not authenticated.
                // It will be created on first login or via trigger (if configured).
                // Or you must disable Email Confirmations in Supabase.

                setTimeout(() => {
                    window.location.href = 'individual-login.html?message=' +
                        encodeURIComponent('Please verify your email address to complete registration.');
                }, 4000);

                return;
            }

            // If session exists, we can proceed to creating the profile
            await createIndividualDocument(authData.user.id, {
                email: email,
                name: name,
                phone: phone
            });

            // Success message
            showToast('success', 'Registration successful! Redirecting to dashboard...');

            // Update button text
            registerBtn.innerHTML = '<i class="fa fa-check"></i> Success!';

            // Redirect to dashboard immediately since we are logged in
            setTimeout(() => {
                window.location.href = 'individual-dashboard.html';
            }, 2000);
        }

    } catch (error) {
        console.error("❌ Registration error:", error);

        // Hide loader and re-enable button
        loader.style.display = 'none';
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<i class="fa fa-user-plus"></i> Create Individual Account';

        // Show appropriate error message
        let errorMessage = 'Registration failed: ' + error.message;

        if (error.message.includes('already registered') || error.message.includes('User already exists')) {
            errorMessage = 'This email is already registered. Please login instead.';
            document.getElementById('emailError').textContent = errorMessage;
            document.getElementById('emailError').style.display = 'block';
        } else if (error.message.includes('weak password')) {
            errorMessage = 'Password is too weak.';
            document.getElementById('passwordError').textContent = errorMessage;
            document.getElementById('passwordError').style.display = 'block';
        }

        showToast('error', errorMessage);
    }
});

// Initialize page
document.addEventListener('DOMContentLoaded', function () {

    // Set focus on first input
    document.getElementById('name').focus();
});
