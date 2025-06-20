function openAuthModal() {
  document.getElementById("authModalOverlay").style.display = "flex";
  switchToLogin();
}

function switchToLogin() {
  document.getElementById("loginForm").classList.add("active");
  document.getElementById("registerForm").classList.remove("active");
  document.getElementById("login-side").style.display = "block";
  document.getElementById("register-side").style.display = "none";
}

function switchToRegister() {
  document.getElementById("loginForm").classList.remove("active");
  document.getElementById("registerForm").classList.add("active");
  document.getElementById("login-side").style.display = "none";
  document.getElementById("register-side").style.display = "block";
}

document
  .getElementById("authModalOverlay")
  .addEventListener("click", function (e) {
    if (e.target === this) this.style.display = "none";
  });

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  // ==== Xử lý đăng nhập ====
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      try {
        const res = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        });
        const result = await res.json();
        if (result.success) {
          localStorage.setItem("userName", result.name);
          localStorage.setItem("userId", result.id);
          alert("✅ Đăng nhập thành công! Xin chào, " + result.name);
          e.target.reset();
          document.getElementById("authModalOverlay").style.display = "none";
          window.location.href = "/dashboard.html";
        } else {
          alert("❌ Đăng nhập thất bại: " + result.message);
        }
      } catch {
        alert("❌ Lỗi kết nối máy chủ.");
      }
    };
  }

  if (registerForm) {
    const passwordInput = registerForm.querySelector('input[name="password"]');
    const passwordError = document.getElementById(
      "registerForm-password-error"
    );

    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (passwordInput.value.length < 8) {
        if (passwordError) passwordError.style.display = "block";
        return;
      } else {
        if (passwordError) passwordError.style.display = "none";
      }

      const formData = new FormData(registerForm);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch("/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        if (result.success) {
          alert("✅ Đăng ký thành công! Đang chuyển về đăng nhập...");
          switchToLogin();
          registerForm.reset();
        } else {
          alert("❌ " + result.message);
        }
      } catch (err) {
        console.error("Lỗi khi gửi form:", err);
        alert("⚠️ Có lỗi xảy ra.");
      }
    });
  }
//all bắt đầu
  document.querySelectorAll(".start-button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/user", { credentials: "include" });
        const data = await res.json();

        if (data && data.success) {
          window.location.href = "/dashboard.html";
        } else {
          openAuthModal();
        }
      } catch (err) {
        console.error("Lỗi kiểm tra đăng nhập:", err);
        openAuthModal();
      }
    });
  });
});

fetch("/api/user", { credentials: "include" })
  .then((res) => res.json())
  .then((data) => {
    if (data && data.name) {
      // Ẩn nút đăng nhập
      document.getElementById("loginBtn").style.display = "none";

      // Hiện tên người dùng
      const userNameEl = document.getElementById("userName");
      userNameEl.textContent = `👤 ${data.name}`;
      userNameEl.style.display = "inline";
    }
  })
  .catch((err) => {
    console.error("Không thể lấy thông tin người dùng:", err);
  });

document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/user", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const userInfo = document.getElementById("userInfo");
        const userNameEl = document.getElementById("userName");
        const userAvatarEl = document.getElementById("userAvatar");
        const loginBtn = document.querySelector(".login-btn");

        userNameEl.innerText = data.name;
        userAvatarEl.src = data.avatar || "default-avt.png";

        userInfo.style.display = "flex";
        if (loginBtn) loginBtn.style.display = "none";
        const dashboardBtn = document.createElement("button");
        dashboardBtn.textContent = "Quay lại";
        dashboardBtn.onclick = () => {
          window.location.href = "/dashboard.html";
        };
        dashboardBtn.classList.add("login-btn");

        const navButtons = document.querySelector(".nav-buttons");
        navButtons.appendChild(dashboardBtn);
      }
    })
    .catch((err) => {
      console.error("Không lấy được thông tin người dùng:", err);
    });
});
