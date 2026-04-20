// Mock-main/gateway.js

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const errorMessage = document.getElementById('errorMessage');
const loginBtn = document.getElementById('loginBtn');

// OUR MOCK DATABASE
const mockUsers = {
    "manager@test.com": { uid: "m1", name: "Lisa", role: "manager" },
    "im@test.com": { uid: "i1", name: "John", role: "inventory_manager" },
    "operator@test.com": { uid: "o1", name: "Mike", role: "operator" }
};

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    errorMessage.style.display = 'none';
    loginBtn.textContent = 'Authenticating...';

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    setTimeout(() => {
        if (mockUsers[email] && password === "123456") {
            const user = mockUsers[email];
            localStorage.setItem('currentUser', JSON.stringify(user));

            // ROUTE TO THE SPECIFIC FOLDERS
            if (user.role === 'manager') {
                window.location.href = './MANAGER_PWA/manager-dashboard.html';
            } else if (user.role === 'inventory_manager') {
                window.location.href = './Inventory_Manager_PWA/im-dashboard.html';
            } else if (user.role === 'operator') {
                window.location.href = './Operator_PWA/home.html';
            }
        } else {
            errorMessage.textContent = "Invalid credentials. Try manager@test.com, im@test.com, or operator@test.com (Password: 123456)";
            errorMessage.style.display = 'block';
            loginBtn.textContent = 'Login';
        }
    }, 800); 
});