document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname;
  const isDashboard = path.includes("dashboard.html");
  const isQuiz = path.includes("quiz.html");

  // ==== Kiểm tra đăng nhập ====
  try {
    const res = await fetch("/api/user", { credentials: "include" });
    const data = await res.json();
    const userNameEl = document.getElementById("userName");

    if (data.name) {
      if (userNameEl) userNameEl.innerText = `${data.name}`;
      localStorage.setItem("userId", data.id);
      const avatarEl = document.getElementById("userAvatar");
      if (avatarEl) avatarEl.src = data.avatar || "/img/avatar-MD.jpg";
    } else if (isDashboard || isQuiz) {
      alert("❌ Bạn chưa đăng nhập. Quay về trang chính.");
      window.location.href = "/";
    }
  } catch {
    alert("❌ Lỗi khi kiểm tra đăng nhập.");
    window.location.href = "/";
  }

  try {
    const res = await fetch("/api/favorites", { credentials: "include" });
    const result = await res.json();
    if (result.success && result.favorites) {
      const favoriteSubjects = result.favorites;
      document.querySelectorAll(".subject-card").forEach((card) => {
        const subject = card.getAttribute("data-subject");
        if (favoriteSubjects.includes(subject)) {
          const heart = card.querySelector(".heart-icon");
          if (heart) {
            heart.classList.add("favorited");
            heart.textContent = "♥";
          }
        }
      });
    }
  } catch (err) {
    console.error("Không thể tải danh sách yêu thích:", err);
  }

  const contactBtn = document.querySelector(
    ".login-btn[onclick='openContactPopup()']"
  );
  const contactPopup = document.getElementById("contactPopup");

  if (contactBtn && contactPopup) {
    contactBtn.addEventListener("click", () => {
      contactPopup.style.display = "flex";
      contactPopup.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  const closeBtn = contactPopup?.querySelector(".close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      contactPopup.style.display = "none";
    });
  }

  document.querySelectorAll(".section-content").forEach((ul) => {
    ul.style.display = "none";
  });

  //môn học
  if (isDashboard) {
    const container = document.getElementById("subjectContainer");
    if (container) {
      fetch("/api/subjects")
        .then((res) => res.json())
        .then((subjects) => {
          container.innerHTML = "";
          if (!subjects.length) {
            container.innerHTML = "<p>📭 Chưa có môn học nào.</p>";
            return;
          }
          subjects.forEach((subject) => {
            const card = document.createElement("div");
            card.className = "subject-card";
            card.innerHTML = `
              <h3>${subject}</h3>
              <button>🔍 Làm bài</button>
            `;
            card.querySelector("button").addEventListener("click", () => {
              localStorage.setItem("selectedSubject", subject);
              window.location.href = "/quiz.html";
            });
            container.appendChild(card);
          });
        })
        .catch((err) => {
          console.error("❌ Lỗi tải môn học:", err);
          container.innerHTML = "<p>❌ Lỗi khi tải môn học.</p>";
        });
    }
  }

  const searchInput = document.getElementById("searchInput");
  const subjectCards = document.querySelectorAll(".subject-card");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const keyword = searchInput.value.trim().toLowerCase();

      subjectCards.forEach((card) => {
        const subjectName = card.getAttribute("data-subject")?.toLowerCase();
        if (subjectName.includes(keyword)) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    });
  }

  //câu hỏi
  if (isQuiz) {
    const subject = localStorage.getItem("selectedSubject");
    const titleEl = document.getElementById("quizTitle");
    const container = document.getElementById("questionList");

    if (!subject || !container) {
      alert("❌ Không tìm thấy môn học.");
      window.location.href = "dashboard.html";
      return;
    }

    if (titleEl) titleEl.innerText = `📝 Đề thi: ${subject}`;

    fetch(`/api/questions?subject=${encodeURIComponent(subject)}`)
      .then((res) => res.json())
      .then((questions) => {
        container.innerHTML = "";
        if (!questions.length) {
          container.innerHTML = "<p>📭 Chưa có câu hỏi nào.</p>";
          return;
        }
        questions.forEach((q, i) => {
          const card = document.createElement("div");
          card.className = "question-card";
          card.innerHTML = `
            <h4>Câu ${i + 1}: ${q.question}</h4>
            <ul>
              <li>A. ${q.optionA}</li>
              <li>B. ${q.optionB}</li>
              <li>C. ${q.optionC}</li>
              <li>D. ${q.optionD}</li>
            </ul>
            <p><strong>✅ Đáp án đúng:</strong> ${q.correctOption}</p>
          `;
          container.appendChild(card);
        });
      })
      .catch((err) => {
        console.error("❌ Lỗi tải câu hỏi:", err);
        container.innerHTML = "<p>❌ Lỗi khi tải câu hỏi.</p>";
      });
  }

  //kết quả
  const resultsBtn = document.querySelector(
    'a[href="#"][onclick="showResults()"]'
  );
  if (resultsBtn) {
    resultsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showResults();
      window.location.hash = "#results";
    });
  }
  if (window.location.hash === "#results") {
    showResults();
  }
});

// Bắt đầu làm bài
function startQuiz(subject) {
  localStorage.setItem("selectedSubject", subject);
  window.location.href = "quiz.html";
}

function toggleSection(id) {
  const section = document.getElementById(id);
  if (!section) return;
  const isHidden =
    section.style.display === "none" ||
    getComputedStyle(section).display === "none";
  section.style.display = isHidden ? "block" : "none";
}

// Nộp kết quả
function submitQuizResult(subject, score, correct, wrong, duration) {
  const userId = parseInt(localStorage.getItem("userId"));
  fetch("/api/saveResult", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject,
      score,
      correct,
      wrong,
      duration,
      timestamp: new Date().toISOString(),
      userId,
    }),
  })
    .then((res) => res.json())
    .then((data) => console.log("Đã lưu kết quả:", data))
    .catch((err) => console.error("Lỗi lưu kết quả:", err));
}

// Hiển thị kết quả thi
function showResults() {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    alert("Bạn chưa đăng nhập!");
    return;
  }
  const quizResultsEl = document.getElementById("quizResultsContainer");
  if (quizResultsEl) quizResultsEl.style.display = "block";
  document.getElementById("subjectCards").style.display = "none";
  document.getElementById("subjectTitle").style.display = "none";
  document.getElementById("resultDisplay").classList.remove("hidden");
  const resultList = document.getElementById("resultList");
  resultList.innerHTML = "";

  fetch(`/api/results?userId=${userId}`)
    .then((res) => res.json())
    .then((data) => {
      if (!data.length) {
        resultList.innerHTML = "<p>Bạn chưa có kết quả nào.</p>";
        return;
      }

      let html = `
        <h2 style="margin-bottom: 10px;">Kết quả làm bài</h2>
        <div style="overflow-x: auto;">
          <table border="1" cellpadding="10" cellspacing="0" style="width: 100%; background: #fff; border-collapse: collapse; text-align: center;">
            <thead style="background-color: #333; color: white;">
              <tr>
                <th>Môn</th>
                <th>Điểm</th>
                <th>Câu đúng</th>
                <th>Câu sai</th>
                <th>Thời gian làm bài</th>
                <th>Ngày làm bài</th>
              </tr>
            </thead>
            <tbody>
      `;

      data.forEach((r) => {
        const duration = `${Math.floor(r.duration / 60)} phút ${
          r.duration % 60
        } giây`;
        const timestamp = new Date(r.timestamp).toLocaleString();
        html += `
          <tr>
            <td>${r.subject}</td>
            <td>${r.score}/10</td>
            <td>${r.correct}</td>
            <td>${r.wrong}</td>
            <td>${duration}</td>
            <td>${timestamp}</td>
          </tr>
        `;
      });

      html += "</tbody></table></div>";
      resultList.innerHTML = html;
    })
    .catch((err) => {
      console.error("❌ Lỗi khi lấy kết quả:", err);
      resultList.innerHTML = "<p>Không thể tải kết quả.</p>";
    });
}

// Hiển thị lại tất cả đề thi
function showAllSubjects() {
  const quizResultsEl = document.getElementById("quizResultsContainer");
  if (quizResultsEl) quizResultsEl.style.display = "none";
  document.getElementById("subjectCards").style.display = "flex";
  document.getElementById("subjectTitle").style.display = "block";
  document.getElementById("resultDisplay").classList.add("hidden");
  document.querySelectorAll(".subject-card").forEach((card) => {
    card.style.display = "flex";
    const info = card.querySelector(".subject-info");
    if (info) {
      info.classList.remove("hidden");
      info.style.display = "block";
    }
  });
}

// Hiển thị chỉ đề yêu thích
async function showFavoriteCards() {
  try {
    const res = await fetch("/api/favorites", { credentials: "include" });
    const data = await res.json();
    if (!data.success) {
      alert("❌ Bạn chưa đăng nhập!");
      return;
    }

    const favoriteSubjects = data.favorites;

    const quizResultsEl = document.getElementById("quizResultsContainer");
    if (quizResultsEl) quizResultsEl.style.display = "none";

    document.getElementById("subjectCards").style.display = "flex";
    document.getElementById("subjectTitle").style.display = "block";
    document.getElementById("resultDisplay").classList.add("hidden");

    document.querySelectorAll(".subject-card").forEach((card) => {
      const subjectName = card.dataset.subject;
      const isFavorite = favoriteSubjects.includes(subjectName);

      card.style.display = isFavorite ? "flex" : "none";

      const info = card.querySelector(".subject-info");
      if (info) {
        info.style.display = isFavorite ? "block" : "none";
      }
    });
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách yêu thích:", err);
    alert("⚠️ Không thể tải danh sách yêu thích.");
  }
}

// Toggle yêu thích
async function toggleFavorite(el) {
  const card = el.closest(".subject-card");
  const subjectName = card.dataset.subject;

  try {
    const res = await fetch("/api/user", { credentials: "include" });
    const data = await res.json();

    if (!data || !data.success || !data.id) {
      alert("❌ Bạn chưa đăng nhập!");
      return;
    }

    const isFavorited = el.classList.toggle("favorited");
    el.textContent = isFavorited ? "♥" : "♡";

    const method = isFavorited ? "POST" : "DELETE";

    await fetch("/api/favorite", {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ subject: subjectName }),
    });
  } catch (err) {
    console.error("Lỗi xử lý yêu thích:", err);
    alert("⚠️ Có lỗi khi xử lý yêu thích.");
  }
}

// Thông tin cá nhân
document.getElementById("profile-link").addEventListener("click", async (e) => {
  e.preventDefault();
  const res = await fetch("/api/user");
  const data = await res.json();

  if (data.success) {
    document.getElementById("popup-name").innerText = data.name;
    document.getElementById("popup-email").innerText = data.email;
    document.getElementById("popup-gender").innerText = data.gender;
    document.getElementById("popup-phone").innerText = data.phone;
    document.getElementById("popup-dob").innerText = data.dob;
    document.getElementById("popup-role").innerText = data.role;
    document.getElementById("popup-avatar").src =
      data.avatar || "default-avt.png";
    document.querySelector("#profile-link.popup-overlay").style.display =
      "flex";
  } else {
    alert("Không thể tải thông tin người dùng.");
  }
});

function closeProfilePopup() {
  document.querySelector("#profile-link.popup-overlay").style.display = "none";
}

function editProfile() {
  document.getElementById("edit-name").value = document
    .getElementById("popup-name")
    .textContent.trim();
  document.getElementById("edit-phone").value = document
    .getElementById("popup-phone")
    .textContent.trim();
  document.getElementById("edit-dob").value = document
    .getElementById("popup-dob")
    .textContent.trim();
  document.getElementById("edit-gender").value = document
    .getElementById("popup-gender")
    .textContent.trim();
  const avatarImg = document.getElementById("popup-avatar");
  document.getElementById("edit-avatar").value = avatarImg ? avatarImg.src : "";
  closeProfilePopup();
  document.getElementById("editProfilePopup").style.display = "flex";
}

function closeEditProfilePopup() {
  document.getElementById("editProfilePopup").style.display = "none";
}

function submitEditProfile(event) {
  event.preventDefault();

  const form = document.getElementById("editProfileForm");
  const formData = new FormData(form);
  const data = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    dob: formData.get("dob"),
    gender: formData.get("gender"),
    avatar: formData.get("avatar"),
  };

  fetch("/api/user/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.success) {
        alert("✅ Cập nhật thành công!");
        location.reload();
      } else {
        alert("❌ " + result.message);
      }
    })
    .catch((err) => alert("Lỗi: " + err.message));
}

function deleteAccount() {
  if (!confirm("⚠️ Bạn có chắc muốn xoá tài khoản?")) return;

  fetch("/delete-account", { method: "DELETE" })
    .then((res) => res.json())
    .then((result) => {
      if (result.success) {
        alert("🗑 Tài khoản đã bị xoá.");
        window.location.href = "/";
      } else {
        alert("❌ " + result.message);
      }
    })
    .catch((err) => alert("Lỗi: " + err.message));
}
