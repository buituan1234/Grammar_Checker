// Toggle hiển thị mật khẩu
    function togglePassword(icon) {
      const passwordInput = icon.previousElementSibling;
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        icon.textContent = "🙈";
      } else {
        passwordInput.type = "password";
        icon.textContent = "👁️";
      }
    }

    // Tạo tài khoản admin mặc định nếu chưa có
    if (!localStorage.getItem("adminData")) {
      const adminData = {
        username: "admin",
        password: "admin123",
        role: "admin"
      };
      localStorage.setItem("adminData", JSON.stringify(adminData));
    }

    document.getElementById("loginForm").addEventListener("submit", function(e) {
      e.preventDefault();

      const username = document.getElementById("loginUsername").value.trim();
      const password = document.getElementById("loginPassword").value.trim();
      const loginError = document.getElementById("loginError");

      const userData = JSON.parse(localStorage.getItem("userData"));
      const adminData = JSON.parse(localStorage.getItem("adminData"));

      if (adminData && username === adminData.username && password === adminData.password) {
        alert("Admin login successful!");
        window.location.href = "admin.html";
        return;
      }

      if (userData && username === userData.username && password === userData.password) {
        alert("User login successful!");
        window.location.href = "Grammer Checker 1.html";
        return;
      }

      loginError.textContent = "Invalid username or password.";
    });

   
    document.addEventListener("DOMContentLoaded", () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("animate") === "left") {
        document.body.classList.add("slide-in-left");
      }
    });

    document.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", e => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#")) return;
        e.preventDefault();
        document.body.style.opacity = 0;
        setTimeout(() => window.location.href = href, 300);
      });
    });
