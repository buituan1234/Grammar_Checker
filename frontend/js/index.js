// Handle modal open/close
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    if (modalId === 'loginModal') {
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').textContent = '';
    } else if (modalId === 'registerModal') {
        document.getElementById('registerForm').reset();
        document.getElementById('passwordError').textContent = '';
        document.getElementById('phoneError').textContent = '';
    }
}

function switchModal(closeId, openId) {
    const closeModalEl = document.getElementById(closeId);
    const openModalEl = document.getElementById(openId);

    closeModal(closeId); // đóng modal cũ

    // Xóa class animation cũ nếu có
    openModalEl.querySelector('.modal-content').classList.remove('slide-left', 'slide-right');

    // Thêm class animation mới
    if (openId === 'registerModal') {
        openModalEl.querySelector('.modal-content').classList.add('slide-left');
    } else if (openId === 'loginModal') {
        openModalEl.querySelector('.modal-content').classList.add('slide-right');
    }

    openModal(openId); // mở modal mới
}


function togglePassword(element) {
    const passwordInput = element.previousElementSibling;
    const toggleIcon = element;
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleIcon.textContent = '👁️';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
}

function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const loginError = document.getElementById('loginError');

  // Lấy adminData, nếu không có thì tạo mặc định
  let adminData = JSON.parse(localStorage.getItem('adminData'));
  if (!adminData) {
    adminData = { username: 'admin', password: 'admin123' };
    localStorage.setItem('adminData', JSON.stringify(adminData));
  }

  const users = JSON.parse(localStorage.getItem('users')) || [];

  // Đăng nhập Admin
  if (username === adminData.username && password === adminData.password) {
    localStorage.setItem('loggedInUser', JSON.stringify({ username, role: 'admin' }));
    showToast("✅ Admin login successful!");
    setTimeout(() => {
      window.location.href = 'admin.html';
    }, 1500);
    return;
  }

  // Đăng nhập User
  const matchedUser = users.find(user => user.username === username && user.password === password);
  if (matchedUser) {
    localStorage.setItem('loggedInUser', JSON.stringify({ username, role: 'user' }));
    showToast("✅ User login successful!");
    setTimeout(() => {
      window.location.href = 'Grammar-Checker.html';
    }, 1500);
    return;
  }

  // Sai thông tin
  loginError.textContent = 'Invalid username or password.';
}



// Handle register
function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const passwordError = document.getElementById('passwordError');
    const phoneError = document.getElementById('phoneError');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (!emailRegex.test(email)) {
        passwordError.textContent = '';
        phoneError.textContent = 'Invalid email format';
        return;
    }
    if (!phoneRegex.test(phone)) {
        passwordError.textContent = '';
        phoneError.textContent = 'Phone number must be 10 digits';
        return;
    }
    if (password.length < 6) {
        passwordError.textContent = 'Password must be at least 6 characters';
        phoneError.textContent = '';
        return;
    }

    const newUser = { username, password, phone, email };
    let users = JSON.parse(localStorage.getItem('users')) || [];

    if (users.find(u => u.username === username)) {
        phoneError.textContent = '';
        passwordError.textContent = 'Username already exists';
        return;
    }

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('userData', JSON.stringify(newUser));

    passwordError.textContent = '';
    phoneError.textContent = '';
    openModal('notificationModal');
}

function goToLogin() {
    closeModal('notificationModal');
    switchModal('registerModal', 'loginModal');
}

// Animation on page load
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('animate') === 'left') {
        document.body.classList.add('slide-in-left');
    }
});

// Smooth link navigation
document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', e => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#')) return;
        e.preventDefault();
        document.body.style.opacity = 0;
        setTimeout(() => window.location.href = href, 300);
    });
});

//thông báo đăng nhập thành công 
function showLoginSuccessToast() {
  const toast = document.getElementById("loginSuccessToast");
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000); // Tự động ẩn sau 2 giây
}

function showToast(message) {
  const toast = document.getElementById("loginSuccessToast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
