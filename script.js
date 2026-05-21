/* ==========================================
   MODERN PHOTOBOOTH - JavaScript
   ========================================== */

// ===== VARIABEL GLOBAL =====
let currentLayout = 2;
let currentTheme = 'pastel';
let currentFilter = 'normal';
let currentSticker = '';
let photoCount = 0;
let capturedPhotos = [];
let stream = null;
let isCapturing = false;

// Elemen DOM
const video = document.getElementById('cameraPreview');
const canvas = document.getElementById('photoCanvas');
const photoLayout = document.getElementById('photoLayout');
const countdownDisplay = document.getElementById('countdownDisplay');
const countdownNumber = document.querySelector('.countdown-number');
const flashOverlay = document.getElementById('flashOverlay');
const userNameInput = document.getElementById('userName');
const photoDateInput = document.getElementById('photoDate');
const photoMetaOverlay = document.getElementById('photoMetaOverlay');
const metaName = document.querySelector('.meta-name');
const metaDate = document.querySelector('.meta-date');
const captureBtn = document.getElementById('captureBtn');

// ===== SOUND EFFECTS =====
// Membuat sound dengan Web Audio API (tidak perlu file eksternal)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playShutterSound() {
    // Membuat efek suara shutter kamera
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Suara klik
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// ===== INISIALISASI =====
document.addEventListener('DOMContentLoaded', function() {
    initCamera();
    setCurrentDate();
    setupEventListeners();
});

// ===== KAMERA =====
async function initCamera() {
    try {
        // Minta izin kamera
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user' // Kamera depan
            },
            audio: false
        });
        
        video.srcObject = stream;
        console.log('Kamera berhasil diaktifkan!');
        
    } catch (err) {
        console.error('Error mengakses kamera:', err);
        alert('Gagal mengakses kamera. Pastikan Anda mengizinkan akses kamera dan menggunakan HTTPS atau localhost.');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

// ===== TANGGAL OTOMATIS =====
function setCurrentDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    photoDateInput.value = today.toLocaleDateString('id-ID', options);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Update nama saat input berubah
    userNameInput.addEventListener('input', updateMetaOverlay);
    
    // Update tanggal saat foto diambil
    photoDateInput.addEventListener('change', updateMetaOverlay);
}

function updateMetaOverlay() {
    if (userNameInput.value || photoDateInput.value) {
        photoMetaOverlay.classList.add('active');
        metaName.textContent = userNameInput.value || 'Guest';
        metaDate.textContent = photoDateInput.value;
    } else {
        photoMetaOverlay.classList.remove('active');
    }
}

// ===== AMBIL FOTO =====
function startCapture() {
    // Jika layout penuh, tidak bisa Ambil foto lagi
    if (photoCount >= currentLayout) {
        alert(`Layout sudah penuh! Maksimal ${currentLayout} foto.`);
        return;
    }
    
    if (isCapturing) return;
    isCapturing = true;
    
    // Nonaktifkan tombol saat proses
    captureBtn.disabled = true;
    
    // Jalankan countdown
    runCountdown();
}

async function runCountdown() {
    // Tampilkan overlay meta
    updateMetaOverlay();
    
    // Countdown 3...2...1
    for (let i = 3; i >= 1; i--) {
        countdownDisplay.classList.add('active');
        countdownNumber.textContent = i;
        countdownNumber.style.animation = 'none';
        void countdownNumber.offsetWidth; // Trigger reflow
        countdownNumber.style.animation = 'countdownPulse 1s ease infinite';
        
        await sleep(1000);
    }
    
    // Sembunyikan countdown
    countdownDisplay.classList.remove('active');
    
    // Ambil foto!
    takePhoto();
}

function takePhoto() {
    // Mainkan suara shutter
    playShutterSound();
    
    // Efek flash
    flashOverlay.classList.add('active');
    setTimeout(() => {
        flashOverlay.classList.remove('active');
    }, 300);
    
    // Ambil frame video ke canvas
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Terapkan filter
    ctx.filter = getFilterString();
    
    // Gambar video (dengan mirror effect)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
    
    // Konversi ke data URL
    const photoData = canvas.toDataURL('image/png');
    
    // Simpan foto
    capturedPhotos.push(photoData);
    photoCount++;
    
    // Render ke layout
    renderPhoto(photoData, photoCount);
    
    // Reset state
    isCapturing = false;
    captureBtn.disabled = false;
    
    console.log(`Foto ${photoCount} berhasil diambil!`);
}

function getFilterString() {
    switch(currentFilter) {
        case 'grayscale': return 'grayscale(100%)';
        case 'sepia': return 'sepia(100%)';
        case 'vintage': return 'sepia(50%) contrast(1.2) brightness(0.9)';
        case 'cool': return 'saturate(0.8) hue-rotate(30deg) brightness(1.1)';
        default: return 'none';
    }
}

// ===== RENDER FOTO KE LAYOUT =====
function renderPhoto(photoData, index) {
    // Hapus container lama jika ada
    const existingContainer = photoLayout.querySelector('.photo-container');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    // Buat container baru
    const container = document.createElement('div');
    container.className = 'photo-container';
    container.id = `photoContainer${index}`;
    
    // Tentukan grid berdasarkan layout
    updateContainerClass(container);
    
    // Buat foto element
    const photoImg = document.createElement('img');
    photoImg.src = photoData;
    photoImg.alt = `Foto ${index}`;
    photoImg.className = 'captured-photo';
    photoImg.id = `photo${index}`;
    
    // Wrapper untuk foto dan sticker
    const photoWrapper = document.createElement('div');
    photoWrapper.className = 'photo-wrapper';
    photoWrapper.appendChild(photoImg);
    
    // Tambahkan sticker jika ada
    if (currentSticker) {
        const sticker = document.createElement('div');
        sticker.className = 'photo-sticker';
        sticker.textContent = currentSticker;
        sticker.style.left = '10px';
        sticker.style.top = '10px';
        photoWrapper.appendChild(sticker);
    }
    
    // Info meta
    const infoDiv = document.createElement('div');
    infoDiv.className = 'photo-info';
    infoDiv.innerHTML = `
        <span class="info-name">${userNameInput.value || 'Guest'}</span>
        <span class="info-date">${photoDateInput.value}</span>
    `;
    
    // Tombol retake
    const retakeBtn = document.createElement('button');
    retakeBtn.className = 'btn-retake';
    retakeBtn.textContent = '🔄 Retake';
    retakeBtn.onclick = () => retakePhoto(index);
    
    // Susun element
    container.appendChild(photoWrapper);
    container.appendChild(infoDiv);
    container.appendChild(retakeBtn);
    
    // Masukkan ke layout
    photoLayout.appendChild(container);
    
    // Animasi masuk
    container.style.opacity = '0';
    container.style.transform = 'scale(0.9)';
    setTimeout(() => {
        container.style.opacity = '1';
        container.style.transform = 'scale(1)';
    }, 50);
}

function updateContainerClass(container) {
    // Hapus class lama
    container.className = 'photo-container';
    
    // Tambah class berdasarkan layout
    switch(currentLayout) {
        case 2:
            container.classList.add('layout-2');
            break;
        case 3:
            container.classList.add('layout-3');
            break;
        case 4:
            container.classList.add('layout-4');
            break;
        case 6:
            container.classList.add('layout-6');
            break;
    }
}

// ===== RETAKE FOTO =====
function retakePhoto(index) {
    if (capturedPhotos[index - 1]) {
        capturedPhotos[index - 1] = null;
        document.getElementById(`photoContainer${index}`).remove();
        photoCount--;
        console.log(`Foto ${index} dihapus!`);
    }
}

// ===== PILIH LAYOUT =====
function selectLayout(num) {
    currentLayout = num;
    
    // Update UI
    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.layout == num) {
            btn.classList.add('active');
        }
    });
    
    // Update layout yang ada
    const container = photoLayout.querySelector('.photo-container');
    if (container) {
        updateContainerClass(container);
    }
    
    console.log(`Layout changed to ${num} photos`);
}

// ===== PILIH STICKER =====
function selectSticker(sticker) {
    currentSticker = sticker;
    
    // Update UI
    document.querySelectorAll('.sticker-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.sticker === 'none' && sticker === '') {
            btn.classList.add('active');
        } else if (btn.dataset.sticker === 'heart' && sticker === '❤️') {
            btn.classList.add('active');
        } else if (btn.dataset.sticker === 'star' && sticker === '⭐') {
            btn.classList.add('active');
        } else if (btn.dataset.sticker === 'smile' && sticker === '😊') {
            btn.classList.add('active');
        } else if (btn.dataset.sticker === 'flower' && sticker === '🌸') {
            btn.classList.add('active');
        }
    });
    
    console.log(`Sticker: ${sticker || 'none'}`);
}

// ===== GANTI FILTER =====
function changeFilter(filter) {
    currentFilter = filter;
    
    // Update video preview
    video.className = '';
    if (filter !== 'normal') {
        video.classList.add(`filter-${filter}`);
    }
    
    console.log(`Filter changed to: ${filter}`);
}

// ===== GANTI TEMA =====
function changeTheme(theme) {
    currentTheme = theme;
    
    const root = document.documentElement;
    
    // Reset variabel dulu
    root.style.removePropertyValue('--bg-primary');
    
    // Definition tema
    const themes = {
        pastel: {
            bgPrimary: '#ffeef8',
            bgSecondary: '#fff5f8',
            bgGlass: 'rgba(255, 255, 255, 0.7)',
            textPrimary: '#5a3a4a',
            textSecondary: '#8a6a7a',
            accentColor: '#ff6b9d',
            accentHover: '#ff4785',
            borderColor: '#ffb6d9',
            shadowColor: 'rgba(255, 107, 157, 0.2)',
            stickerColor: '#ff6b9d',
            fontMain: "'Poppins', sans-serif",
            fontHandwriting: "'Dancing Script', cursive",
            gradient: 'linear-gradient(135deg, #ffeef8 0%, #fff5f8 100%)'
        },
        dark: {
            bgPrimary: '#1a1a2e',
            bgSecondary: '#16213e',
            bgGlass: 'rgba(30, 30, 60, 0.8)',
            textPrimary: '#eaeaea',
            textSecondary: '#a0a0a0',
            accentColor: '#e94560',
            accentHover: '#ff6b8d',
            borderColor: '#e94560',
            shadowColor: 'rgba(233, 69, 96, 0.3)',
            stickerColor: '#e94560',
            fontMain: "'Poppins', sans-serif",
            fontHandwriting: "'Dancing Script', cursive",
            gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
        },
        retro: {
            bgPrimary: '#f4e4bc',
            bgSecondary: '#f0d9a0',
            bgGlass: 'rgba(244, 228, 188, 0.8)',
            textPrimary: '#5a4a3a',
            textSecondary: '#8a7a6a',
            accentColor: '#c9553d',
            accentHover: '#e06b4f',
            borderColor: '#8b5a2b',
            shadowColor: 'rgba(139, 90, 43, 0.3)',
            stickerColor: '#d4a855',
            fontMain: "'Courier New', monospace",
            fontHandwriting: "'Brush Script MT', cursive",
            gradient: 'linear-gradient(135deg, #f4e4bc 0%, #f0d9a0 100%)'
        },
        cyber: {
            bgPrimary: '#0a0a0f',
            bgSecondary: '#15151f',
            bgGlass: 'rgba(20, 20, 35, 0.85)',
            textPrimary: '#00fff7',
            textSecondary: '#00b8b0',
            accentColor: '#00fff7',
            accentHover: '#00cccc',
            borderColor: '#00fff7',
            shadowColor: 'rgba(0, 255, 247, 0.4)',
            stickerColor: '#ff00ff',
            fontMain: "'Poppins', sans-serif",
            fontHandwriting: "'Orbitron', sans-serif",
            gradient: 'linear-gradient(135deg, #0a0a0f 0%, #15151f 100%)'
        },
        korean: {
            bgPrimary: '#fff5f5',
            bgSecondary: '#ffe8e8',
            bgGlass: 'rgba(255, 245, 245, 0.75)',
            textPrimary: '#4a4a4a',
            textSecondary: '#7a7a7a',
            accentColor: '#f8a5b8',
            accentHover: '#f78aa8',
            borderColor: '#f8a5b8',
            shadowColor: 'rgba(248, 165, 184, 0.25)',
            stickerColor: '#f8a5b8',
            fontMain: "'Noto Sans KR', sans-serif",
            fontHandwriting: "'Nanum Pen Script', cursive",
            gradient: 'linear-gradient(180deg, #fff5f5 0%, #ffe8e8 100%)'
        },
        minimal: {
            bgPrimary: '#ffffff',
            bgSecondary: '#f5f5f5',
            bgGlass: 'rgba(255, 255, 255, 0.9)',
            textPrimary: '#333333',
            textSecondary: '#666666',
            accentColor: '#333333',
            accentHover: '#000000',
            borderColor: '#dddddd',
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            stickerColor: '#333333',
            fontMain: "'Poppins', sans-serif",
            fontHandwriting: "'Poppins', sans-serif",
            gradient: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)'
        }
    };
    
    // Terapkan tema
    const t = themes[theme];
    if (t) {
        root.style.setProperty('--bg-primary', t.bgPrimary);
        root.style.setProperty('--bg-secondary', t.bgSecondary);
        root.style.setProperty('--bg-glass', t.bgGlass);
        root.style.setProperty('--text-primary', t.textPrimary);
        root.style.setProperty('--text-secondary', t.textSecondary);
        root.style.setProperty('--accent-color', t.accentColor);
        root.style.setProperty('--accent-hover', t.accentHover);
        root.style.setProperty('--border-color', t.borderColor);
        root.style.setProperty('--shadow-color', t.shadowColor);
        root.style.setProperty('--sticker-color', t.stickerColor);
        root.style.setProperty('--font-main', t.fontMain);
        root.style.setProperty('--font-handwriting', t.fontHandwriting);
        root.style.setProperty('--gradient', t.gradient);
    }
    
    // Update button states
    document
