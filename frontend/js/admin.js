// Hiển thị thông báo toast
function showToast(message, type = "success") {
  const toast = document.querySelector('.toast');
  const toastBody = document.getElementById('toastMessage');
  toastBody.textContent = message;

  toast.classList.remove('bg-success', 'bg-danger');
  toast.classList.add(`bg-${type}`);

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

// Hàm thực hiện logout
function performLogout() {
  // Xóa dữ liệu đăng nhập
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("adminData");

  // Hiển thị thông báo và chuyển trang sau 1.5s
  showToast("Logged out successfully!");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1500);
}

// Khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', () => {
  console.log('Admin.js loaded successfully');

  // Kiểm tra trạng thái đăng nhập
  const adminData = localStorage.getItem('adminData');
  if (!adminData) {
    console.log('No admin data found, redirecting to login page');
    window.location.href = 'index.html';
  }

  // Gắn sự kiện mở modal xác nhận logout
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      const logoutModal = new bootstrap.Modal(document.getElementById('logoutModal'));
      logoutModal.show();
    });
  }

  // Gắn sự kiện cho nút xác nhận trong modal
  const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', () => {
      const logoutModalEl = document.getElementById('logoutModal');
      const modalInstance = bootstrap.Modal.getInstance(logoutModalEl);
      modalInstance.hide();
      performLogout();
    });
  }
});
