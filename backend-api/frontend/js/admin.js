// admin.js
// Hiển thị thông báo toast
function showToast(message = '✅ Thao tác thành công!', type = "success") {
  const toast = document.querySelector('.toast');
  const toastBody = document.getElementById('toastMessage');
  if (toast && toastBody) {
    toastBody.textContent = message;
    toast.classList.remove('bg-success', 'bg-danger');
    toast.classList.add(`bg-${type}`);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
  } else {
    console.error('Toast elements not found');
    // Dùng toast mặc định từ indexxx.js nếu có
    if (window.showToast) {
      window.showToast(message);
    }
  }
}

// Hàm thực hiện logout
function performLogout() {
  // Xóa dữ liệu đăng nhập
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("adminData");

  // Hiển thị thông báo và chuyển trang sau 1.5s
  showToast("✅ Logged out successfully!");
  setTimeout(() => {
    window.location.href = "introduction.html"; // Chuyển hướng về trang đăng nhập
  }, 1500);
}

// Khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', () => {
  console.log('Admin.js loaded successfully');

  // Kiểm tra trạng thái đăng nhập
  const adminData = localStorage.getItem('adminData');
  if (!adminData) {
    console.log('No admin data found, redirecting to login page');
    window.location.href = 'introduction.html'; // Chuyển hướng về trang đăng nhập
    return;
  }

  // Gắn sự kiện mở modal xác nhận logout
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      const logoutModalEl = document.getElementById('logoutModal');
      if (logoutModalEl) {
        const logoutModal = new bootstrap.Modal(logoutModalEl);
        logoutModal.show();
      } else {
        console.error('Logout modal not found');
        // Đăng xuất trực tiếp nếu không có modal
        performLogout();
      }
    });
  } else {
    console.error('Logout link not found');
  }

  // Gắn sự kiện cho nút xác nhận trong modal
  const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', () => {
      const logoutModalEl = document.getElementById('logoutModal');
      if (logoutModalEl) {
        const modalInstance = bootstrap.Modal.getInstance(logoutModalEl);
        modalInstance.hide();
      }
      performLogout();
    });
  } else {
    console.error('Confirm logout button not found');
  }
});