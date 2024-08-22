document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function () {
            const input = this.closest('.input-group').querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);

            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    });

    const form = document.getElementById('signupForm');
    const fname = document.getElementById('register-fname');
    const lname = document.getElementById('register-lname');
    const age = document.getElementById('register-age');
    const phone = document.getElementById('register-phone');
    const email = document.getElementById('register-email');
    const pass = document.getElementById('register-password');
    const cpass = document.getElementById('register-cpassword');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        validateSignup();

        if (isSignupValid()) {
            form.submit();
        }
    });

    const isSignupValid = () => {
        return fname.classList.contains('success') &&
            lname.classList.contains('success') &&
            age.classList.contains('success') &&
            phone.classList.contains('success') &&
            email.classList.contains('success') &&
            pass.classList.contains('success') &&
            cpass.classList.contains('success');
    };

    const setError = (element, message) => {
        const formGroup = element.closest('.form-group');
        const errorDisplay = formGroup.querySelector('.errorMsg');

        errorDisplay.innerText = message;
        element.classList.add('error');
        errorDisplay.classList.add('error');
        element.classList.remove('success');
        errorDisplay.classList.remove('success');
    };

    const setSuccess = (element, message) => {
        const formGroup = element.closest('.form-group');
        const errorDisplay = formGroup.querySelector('.errorMsg');

        errorDisplay.innerText = message;
        element.classList.add('success');
        errorDisplay.classList.add('success');
        element.classList.remove('error');
        errorDisplay.classList.remove('error');
    };

    const isValidEmail = email => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };

    const isValidName = name => {
        var regex = /^[a-zA-Z ]{1,30}$/;
        return regex.test(name);
    };

    const isValidPhone = phone => {
        const re = /^\d{10}$/;
        return re.test(phone);
    }

    const validateSignup = () => {
        const fnameValue = fname.value.trim();
        const lnameValue = lname.value.trim();
        const ageValue = age.value.trim();
        const phoneValue = phone.value.trim();
        const emailValue = email.value.trim();
        const passValue = pass.value.trim();
        const cpassValue = cpass.value.trim();

        if (fnameValue === '') {
            setError(fname, 'Please enter your first name');
        } else if (!isValidName(fnameValue)) {
            setError(fname, 'Please enter a valid name');
        } else {
            setSuccess(fname, "First Name");
        }

        if (lnameValue === '') {
            setError(lname, 'Please enter your last name');
        } else if (!isValidName(lnameValue)) {
            setError(lname, 'Please enter a valid name');
        } else {
            setSuccess(lname, "Last Name");
        }

        if (ageValue === '') {
            setError(age, 'Please enter your age');
        } else if (isNaN(ageValue) || ageValue <= 15 || ageValue > 100) {
            setError(age, 'Please enter a valid age');
        } else {
            setSuccess(age, "Age");
        }

        if (phoneValue === '') {
            setError(phone, 'Please enter your phone number');
        } else if (!isValidPhone(phoneValue)) {
            setError(phone, 'Please enter a valid phone number');
        } else {
            setSuccess(phone, "Phone");
        }

        if (emailValue === '') {
            setError(email, 'Please enter your email');
        } else if (!isValidEmail(emailValue)) {
            setError(email, 'Please enter a valid email');
        } else {
            setSuccess(email, "Email");
        }

        if (passValue === '') {
            setError(pass, 'Please enter your password');
        } else if (passValue.length < 8) {
            setError(pass, 'Password should have at least 8 characters');
        } else {
            setSuccess(pass, "Password");
        }

        if (cpassValue === '') {
            setError(cpass, 'Please confirm your password');
        } else if (cpassValue !== passValue) {
            setError(cpass, 'Passwords do not match');
        } else {
            setSuccess(cpass, "Confirm Password");
        }
    };
});