// Logout function with event parameter
function logout(event) {
  event.preventDefault(); // Ngăn hành vi mặc định của thẻ <a>
  if (confirm('Are you sure you want to logout?')) {
    console.log('Logging out, removing adminData and redirecting to index.html');
    localStorage.removeItem('adminData');
    try {
      window.location.href = 'index.html'; // Đường dẫn tương đối, kiểm tra cấu trúc thư mục
    } catch (error) {
      console.error('Error during redirect:', error);
    }
  }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('Admin.js loaded successfully');

  // Kiểm tra đăng nhập khi tải trang
  const adminData = localStorage.getItem('adminData');
  if (!adminData) {
    console.log('No admin data found, redirecting to login page');
    window.location.href = 'index.html';
  }

  // Add event listeners for edit/delete icons if needed
  const editIcons = document.querySelectorAll('.bi-pencil-square, .bi-trash');
  editIcons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      alert(`Action ${icon.classList.contains('bi-pencil-square') ? 'Edit' : 'Delete'} clicked!`);
    });
  });

  // Attach logout event directly to ensure it works
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', logout);
  }
});