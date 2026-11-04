/* script.js */
/* Handles API requests, loading states, errors and MP3 downloads. */

// Render backend service.
const API_BASE_URL = "https://youtube-mp3-api-0crg.onrender.com";

const form = document.getElementById("convertForm");
const videoInput = document.getElementById("videoUrl");
const convertButton = document.getElementById("convertButton");
const buttonText = document.getElementById("buttonText");
const spinner = document.getElementById("spinner");
const buttonArrow = document.getElementById("buttonArrow");
const message = document.getElementById("message");
const result = document.getElementById("result");
const fileTitle = document.getElementById("fileTitle");
const downloadButton = document.getElementById("downloadButton");

let activeDownloadToken = null;

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `message ${type}`;
  message.classList.remove("hidden");
}

function hideMessage() {
  message.classList.add("hidden");
}

function setLoading(isLoading) {
  convertButton.disabled = isLoading;
  spinner.classList.toggle("hidden", !isLoading);
  buttonArrow.classList.toggle("hidden", isLoading);
  buttonText.textContent = isLoading ? "Dönüştürülüyor..." : "Dönüştür";
}

function resetResult() {
  result.classList.add("hidden");
  activeDownloadToken = null;
  downloadButton.href = "#";
  downloadButton.style.opacity = "";
  downloadButton.style.pointerEvents = "";
  downloadButton.innerHTML = 'MP3 İndir <span aria-hidden="true">↓</span>';
}

async function convertVideo(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 130000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Sunucu hatası (HTTP ${response.status}).`);
    }

    if (!data.token) {
      throw new Error("Sunucu geçerli bir indirme token'ı döndürmedi.");
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const url = videoInput.value.trim();
  if (!url) {
    showMessage("Lütfen bir bağlantı girin.");
    return;
  }

  hideMessage();
  resetResult();
  setLoading(true);

  try {
    const data = await convertVideo(url);
    activeDownloadToken = data.token;
    fileTitle.textContent = data.title || "Audio file";

    downloadButton.href = `${API_BASE_URL}/api/download/${encodeURIComponent(data.token)}`;
    result.classList.remove("hidden");
    showMessage("Dönüştürme tamamlandı. MP3 dosyanız hazır.", "success");
  } catch (error) {
    const errorMessage = error.name === "AbortError"
      ? "İstek zaman aşımına uğradı. Sunucu geç açılmış veya işlem uzamış olabilir."
      : (error.message || "Sunucuya bağlanırken hata oluştu.");
    showMessage(errorMessage);
  } finally {
    setLoading(false);
  }
});

downloadButton.addEventListener("click", () => {
  if (!activeDownloadToken) return;

  // The backend deletes the temporary file after the response is sent.
  activeDownloadToken = null;
  downloadButton.style.opacity = "0.6";
  downloadButton.style.pointerEvents = "none";
  downloadButton.textContent = "İndirme başlatıldı";
});

videoInput.addEventListener("input", hideMessage);

const uploadForm = document.getElementById("uploadForm");
const mediaFile = document.getElementById("mediaFile");
const uploadButton = document.getElementById("uploadButton");
const uploadSpinner = document.getElementById("uploadSpinner");
const uploadArrow = document.getElementById("uploadArrow");
const uploadButtonText = document.getElementById("uploadButtonText");

mediaFile.addEventListener("change", () => {
  document.getElementById("fileName").textContent = mediaFile.files[0]?.name || "Cihazından dosya seç";
  hideMessage();
});
uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = mediaFile.files[0];
  if (!file) return showMessage("Önce cihazından bir medya dosyası seç.");
  if (file.size > 100 * 1024 * 1024) return showMessage("Dosya 100 MB sınırını aşıyor.");
  hideMessage();
  resetResult();
  uploadButton.disabled = true;
  uploadSpinner.classList.remove("hidden");
  uploadArrow.classList.add("hidden");
  uploadButtonText.textContent = "Dönüştürülüyor...";
  try {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(`${API_BASE_URL}/api/convert-file`, { method: "POST", body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Sunucu hatası (HTTP ${response.status}).`);
    activeDownloadToken = data.token;
    fileTitle.textContent = data.title || file.name;
    downloadButton.href = `${API_BASE_URL}/api/download/${encodeURIComponent(data.token)}`;
    result.classList.remove("hidden");
    showMessage("Dosya MP3'e dönüştürüldü. İndirmeye hazır.", "success");
  } catch (error) {
    showMessage(error.message || "Dosya dönüştürülemedi.");
  } finally {
    uploadButton.disabled = false;
    uploadSpinner.classList.add("hidden");
    uploadArrow.classList.remove("hidden");
    uploadButtonText.textContent = "Dosyayı MP3'e dönüştür";
  }
});
