function toggleDropdown() {
      const dropdown = document.getElementById('userDropdown');
      const userData = JSON.parse(localStorage.getItem("userData"));
      if (userData) {
        document.getElementById('dropdownUsername').textContent = userData.username || 'Unknown';
        document.getElementById('dropdownPhone').textContent = userData.phone || 'N/A';
        document.getElementById('dropdownEmail').textContent = userData.email || 'N/A';
      }
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }

    function logout() {
      // localStorage.removeItem("userData");
      window.location.href = 'login.html';
    }

    window.addEventListener('click', function (e) {
      const avatar = document.querySelector('.avatar');
      const dropdown = document.getElementById('userDropdown');
      if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    function showUploadBox() {
      const uploadBox = document.getElementById('uploadBox');
      if (uploadBox) {
        uploadBox.style.display = 'block';
      }
    }

    function handleLanguageChange() {
      document.getElementById('uploadBox').style.display = 'none';
    }

    document.addEventListener('DOMContentLoaded', function () {
      const languageSelect = document.getElementById('languageSelect');
      if (languageSelect) {
        languageSelect.addEventListener('click', function () {
          const uploadBox = document.getElementById('uploadBox');
          if (uploadBox) uploadBox.style.display = 'none';
        });
      }
    });

   

  const languageList = [
    'English', 'Vietnamese', 'French', 'Japanese',
    'Korean', 'Spanish', 'German', 'Chinese', 'Thai', 'Russian'
  ];

  function toggleLangDropdown() {
  const dropdown = document.getElementById('langDropdown');
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  renderLanguageList();
}

function closeLangDropdown() {
  document.getElementById('langDropdown').style.display = 'none';
}

function renderLanguageList() {
  const ul = document.getElementById('languageList');
  ul.innerHTML = '';
  allLanguages.forEach(lang => {
    const li = document.createElement('li');
    li.textContent = lang;
    li.onclick = () => {
      document.getElementById('languageInput').value = lang;
      closeLangDropdown();
    };
    ul.appendChild(li);
  });
}

function filterLanguages() {
  const search = document.getElementById('langSearch').value.toLowerCase();
  const ul = document.getElementById('languageList');
  ul.innerHTML = '';
  allLanguages
    .filter(lang => lang.toLowerCase().includes(search))
    .forEach(lang => {
      const li = document.createElement('li');
      li.textContent = lang;
      li.onclick = () => {
        document.getElementById('languageInput').value = lang;
        closeLangDropdown();
      };
      ul.appendChild(li);
    });
}




  function toggleLangDropdown2() {
  const dropdown = document.getElementById('translateDropdown');
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  renderTranslateLanguages();
}

function closeLangDropdown2() {
  document.getElementById('translateDropdown').style.display = 'none';
}

function renderTranslateLanguages() {
  const list = document.getElementById('translateList');
  list.innerHTML = '';
  allLanguages.forEach(lang => {
    const li = document.createElement('li');
    li.textContent = lang;
    li.onclick = () => {
      document.getElementById('translateInput').value = lang;
      closeLangDropdown2();
    };
    list.appendChild(li);
  });
}

function filterTranslateLanguages() {
  const search = document.getElementById('translateSearch').value.toLowerCase();
  const list = document.getElementById('translateList');
  list.innerHTML = '';
  allLanguages
    .filter(lang => lang.toLowerCase().includes(search))
    .forEach(lang => {
      const li = document.createElement('li');
      li.textContent = lang;
      li.onclick = () => {
        document.getElementById('translateInput').value = lang;
        closeLangDropdown2();
      };
      list.appendChild(li);
    });
}


  // Đóng dropdown nếu click ra ngoài
  document.addEventListener('click', function (event) {
  const input1 = document.getElementById('languageInput');
  const dropdown1 = document.getElementById('langDropdown');
  if (!dropdown1.contains(event.target) && event.target !== input1) {
    closeLangDropdown();
  }

  const input2 = document.getElementById('translateInput');
  const dropdown2 = document.getElementById('translateDropdown');
  if (!dropdown2.contains(event.target) && event.target !== input2) {
    closeLangDropdown2();
  }
});

const allLanguages = [
  "English", "Vietnamese", "French", "Japanese", "Korean", "Chinese",
  "Spanish", "German", "Italian", "Portuguese", "Russian", "Arabic",
  "Hindi", "Turkish", "Thai", "Dutch", "Greek", "Polish", "Swedish",
  "Danish", "Norwegian", "Finnish", "Czech", "Hungarian", "Hebrew",
  "Malay", "Indonesian", "Filipino", "Ukrainian", "Bengali", "Urdu",
  "Swahili", "Slovak", "Romanian", "Persian", "Tamil", "Telugu", "Marathi",
  "Gujarati", "Punjabi", "Zulu", "Afrikaans", "Sinhala"
];


const translateLanguages = [
  'English', 'Vietnamese', 'French', 'Japanese', 'Chinese', 'Korean', 'Spanish',
  'German', 'Italian', 'Russian', 'Thai', 'Portuguese', 'Arabic', 'Dutch',
  'Greek', 'Hindi', 'Indonesian', 'Malay', 'Swedish', 'Norwegian', 'Polish',
  'Finnish', 'Hebrew', 'Bengali', 'Turkish', 'Ukrainian', 'Urdu', 'Czech',
  'Hungarian', 'Romanian', 'Slovak', 'Slovenian', 'Serbian', 'Croatian',
  'Persian', 'Tamil', 'Telugu', 'Tagalog', 'Swahili', 'Zulu', 'Punjabi'
];

// Toggle dropdown
function toggleLangDropdownBottom() {
  const dropdown = document.getElementById('translateDropdownBottom');
  if (dropdown.style.display === 'block') {
    dropdown.style.display = 'none';
  } else {
    dropdown.style.display = 'block';
    renderTranslateLanguagesBottom();
  }
}

// Close dropdown
function closeLangDropdownBottom() {
  document.getElementById('translateDropdownBottom').style.display = 'none';
}

// Render language list
function renderTranslateLanguagesBottom() {
  const list = document.getElementById('translateListBottom');
  list.innerHTML = '';
  translateLanguages.forEach(lang => {
    const li = document.createElement('li');
    li.textContent = lang;
    li.onclick = () => {
      document.getElementById('translateInputBottom').value = lang;
      closeLangDropdownBottom();
    };
    list.appendChild(li);
  });
}

// Filter language search
function filterTranslateLanguagesBottom() {
  const search = document.getElementById('translateSearchBottom').value.toLowerCase();
  const list = document.getElementById('translateListBottom');
  list.innerHTML = '';
  translateLanguages
    .filter(lang => lang.toLowerCase().includes(search))
    .forEach(lang => {
      const li = document.createElement('li');
      li.textContent = lang;
      li.onclick = () => {
        document.getElementById('translateInputBottom').value = lang;
        closeLangDropdownBottom();
      };
      list.appendChild(li);
    });
}

// Close dropdown if clicked outside
document.addEventListener('click', function (event) {
  const dropdown = document.getElementById('translateDropdownBottom');
  const input = document.getElementById('translateInputBottom');
  if (dropdown && !dropdown.contains(event.target) && event.target !== input) {
    closeLangDropdownBottom();
  }
});


function speakText(text) {
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

function playInputAudio() {
  const text = document.querySelector('.input-text textarea').value;
  speakText(text);
}

function playGrammarAudio() {
  const text = document.querySelector('.result-part p')?.innerText?.replace("Result:", "").trim();
  speakText(text);
}

function playTranslationAudio() {
  const text = document.querySelector('.translation-box .result-content')?.innerText?.trim();
  speakText(text);
}


// thêm document
function showUploadBox() {
  document.getElementById("uploadFormContainer").style.display = "flex";
}

function closeUploadForm() {
  document.getElementById("uploadFormContainer").style.display = "none";
}

function uploadDocument() {
  const fileInput = document.getElementById("documentFile");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file to upload.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const content = e.target.result;
    document.querySelector(".input-text textarea").value = content;
  };

  if (file.type.includes("text") || file.name.endsWith(".txt")) {
    reader.readAsText(file);
  } else {
    alert("Only .txt files are currently supported for preview.");
  }

  closeUploadForm();
}

// Hiển thị tên file khi chọn
document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("documentFile");
  const fileNameDisplay = document.getElementById("file-name-display");

  fileInput.addEventListener("change", function () {
    const fileName = this.files[0]?.name || "No file chosen";
    fileNameDisplay.textContent = fileName;
  });
});


function toggleSettingsPanel() {
  document.getElementById("settingsPanel").classList.toggle("open");
}

function closeSettingsPanel() {
  document.getElementById("settingsPanel").classList.remove("open");
}

// Bấm vào ảnh sẽ mở file input
// Khi click vào ảnh → mở hộp chọn ảnh
function triggerAvatarInput() {
  document.getElementById("avatarInput").click();
}

// Khi chọn ảnh → đọc & hiển thị → lưu vào localStorage
function previewAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function () {
    const base64 = reader.result;
    document.getElementById("previewAvatar").src = base64;

    // Lưu vào localStorage
    localStorage.setItem("savedAvatar", base64);
  };

  reader.readAsDataURL(file);
}

// Khi tải lại trang → load avatar từ localStorage (nếu có)
window.onload = function () {
  const savedAvatar = localStorage.getItem("savedAvatar");
  if (savedAvatar) {
    document.getElementById("previewAvatar").src = savedAvatar;
  }
};







  


