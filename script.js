// =====================================================================
// Caca Booth — script.js
// WebRTC peer-to-peer untuk mode bareng + solo mode
// =====================================================================

// ── GANTI URL INI setelah deploy signaling server kamu ──
const SIGNAL_URL = 'wss://caca-booth-signal-production.up.railway.app';
// contoh Railway: 'wss://caca-booth-signal.up.railway.app'
// contoh Render:  'wss://caca-booth-signal.onrender.com'
// ────────────────────────────────────────────────────────

// ===== State =====
let mode       = 'solo';  // 'solo' | 'together'
let userNum    = 0;        // 1 (host) | 2 (guest)
let roomCode   = '';
let ws         = null;
let pc         = null;     // RTCPeerConnection
let localStream  = null;
let remoteStream = null;

let currentLayout = 'strip3';
let currentFilter = 'none';
let currentTheme  = 'capybara';

// captured photos: solo → array of dataUrls; together → [{you, peer}]
let capturedPhotos = [];
let peerPhotos     = {};   // index → dataUrl received from peer

const LAYOUTS = {
  strip3:  { count:3, cols:1 },
  strip4:  { count:4, cols:1 },
  grid2x2: { count:4, cols:2 },
  polaroid:{ count:1, cols:1 },
};

// Layout khusus mode bareng:
// count = jumlah foto PER ORANG
// hasil akhir: tiap baris = [kamu | teman]
// kecuali grid2x2: 2x2 total (kamu 2 foto + teman 2 foto)
const LAYOUTS_TOGETHER = {
  strip3:  { count:3, mode:'rows' },   // 3 baris, tiap baris kamu|teman
  strip4:  { count:4, mode:'rows' },   // 4 baris, tiap baris kamu|teman
  polaroid:{ count:1, mode:'rows' },   // 1 baris, kamu|teman
  grid2x2: { count:2, mode:'grid' },   // grid 2x2: baris 1=kamu1|kamu2, baris 2=teman1|teman2
};

const FILTER_CSS = {
  none:    'none',
  bw:      'grayscale(1) contrast(1.05)',
  vintage: 'sepia(.45) saturate(1.3) contrast(1.05) brightness(.98)',
  warm:    'saturate(1.3) hue-rotate(-8deg) brightness(1.05)',
  cool:    'saturate(1.15) hue-rotate(12deg) brightness(1.02)',
  soft:    'brightness(1.08) contrast(.92) saturate(1.1) blur(.3px)',
};

// THEMES di-load dari templates.js sebagai ALL_THEMES

// ===== DOM refs =====
const screens      = document.querySelectorAll('.screen');
const btnSolo      = document.getElementById('btnSolo');
const btnTogether  = document.getElementById('btnTogether');
const btnCreateRoom= document.getElementById('btnCreateRoom');
const btnCopyCode  = document.getElementById('btnCopyCode');
const btnJoinRoom  = document.getElementById('btnJoinRoom');
const joinCodeInput= document.getElementById('joinCodeInput');
const joinError    = document.getElementById('joinError');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const roomCodeText = document.getElementById('roomCodeText');
const waitStatus   = document.getElementById('waitStatus');
const modeBadge    = document.getElementById('modeBadge');
const camPeer      = document.getElementById('camPeer');
const videoYou     = document.getElementById('videoYou');
const videoPeer    = document.getElementById('videoPeer');
const connectingOverlay = document.getElementById('connectingOverlay');
const countdownEl  = document.getElementById('countdown');
const flashEl      = document.getElementById('flash');
const progressRow  = document.getElementById('progressRow');
const stageNote    = document.getElementById('stageNote');
const shutterBtn   = document.getElementById('shutterBtn');
const captionField = document.getElementById('captionField');
const resultCanvas = document.getElementById('resultCanvas');
const workCanvas   = document.getElementById('workCanvas');
const camYouLabel    = document.getElementById('camYouLabel');
const camToggleBtn   = document.getElementById('camToggleBtn');
const camToggleIcon  = document.getElementById('camToggleIcon');
const camToggleText  = document.getElementById('camToggleText');
const camOffOverlay  = document.getElementById('camOffOverlay');

let camEnabled = true;

// pakai getElementById langsung di dalam event agar aman
document.addEventListener('click', (e) => {
  if (!e.target.closest('#camToggleBtn')) return;
  camEnabled = !camEnabled;
  if (localStream) {
    localStream.getVideoTracks().forEach(t => { t.enabled = camEnabled; });
  }
  const overlay  = document.getElementById('camOffOverlay');
  const icon     = document.getElementById('camToggleIcon');
  const text     = document.getElementById('camToggleText');
  const btn      = document.getElementById('camToggleBtn');
  if (overlay) overlay.style.display = camEnabled ? 'none' : 'flex';
  if (icon)    icon.textContent      = camEnabled ? '📷' : '🚫';
  if (text)    text.textContent      = camEnabled ? 'Matikan' : 'Nyalakan';
  if (btn)     btn.classList.toggle('off', !camEnabled);
});

// ===== Screen helpers =====
function showScreen(id) {
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ===== HOME buttons =====
btnSolo.addEventListener('click', () => {
  mode = 'solo';
  modeBadge.textContent = '📷 solo';
  camPeer.classList.add('hidden');
  camYouLabel.textContent = 'kamu';
  startBooth();
  showScreen('screenBooth');
});

btnTogether.addEventListener('click', () => {
  mode = 'together';
  showScreen('screenLobby');
});

document.getElementById('btnBackHome').addEventListener('click', () => {
  cleanupConnection();
  showScreen('screenHome');
});

document.getElementById('btnBackBooth').addEventListener('click', () => {
  cleanupConnection();
  stopCamera();
  showScreen('screenHome');
});

// ===== LOBBY — create room =====
btnCreateRoom.addEventListener('click', () => {
  connectSignaling(() => {
    ws.send(JSON.stringify({ type: 'create-room' }));
  });
});

btnCopyCode.addEventListener('click', () => {
  navigator.clipboard.writeText(roomCodeText.textContent)
    .then(() => { btnCopyCode.textContent = '✅ Tersalin!'; setTimeout(() => { btnCopyCode.textContent = '📋 Salin Kode'; }, 2000); });
});

// ===== LOBBY — join room =====
btnJoinRoom.addEventListener('click', () => {
  const code = joinCodeInput.value.trim().toUpperCase();
  if (code.length < 4) { joinError.textContent = 'Kode minimal 4 karakter ya!'; return; }
  joinError.textContent = '';
  connectSignaling(() => {
    ws.send(JSON.stringify({ type: 'join-room', code }));
  });
});

// ===== Signaling WebSocket =====
function connectSignaling(onOpen) {
  if (ws && ws.readyState === WebSocket.OPEN) { onOpen(); return; }
  ws = new WebSocket(SIGNAL_URL);
  ws.onopen  = () => onOpen();
  ws.onerror = () => { joinError.textContent = 'Tidak bisa terhubung ke server. Coba lagi.'; };
  ws.onmessage = handleSignal;
  ws.onclose   = () => {
    if (mode === 'together') stageNote.textContent = 'Koneksi terputus.';
  };
}

async function handleSignal(event) {
  const msg = JSON.parse(event.data);

  switch (msg.type) {

    case 'room-created':
      roomCode = msg.code;
      roomCodeText.textContent = msg.code;
      roomCodeDisplay.style.display = 'block';
      btnCreateRoom.disabled = true;
      break;

    case 'peer-joined':
      userNum = msg.you;
      waitStatus.textContent = userNum === 1 ? 'Teman sudah masuk! Memulai…' : 'Terhubung! Memulai…';
      modeBadge.textContent = '👯 bareng';
      camPeer.classList.remove('hidden');
      camYouLabel.textContent = 'kamu';
      // tunggu kamera siap dulu baru WebRTC
      await startBooth();
      showScreen('screenBooth');
      // tunggu video track benar-benar aktif
      await waitForVideoTrack(videoYou);
      if (userNum === 1) await startWebRTC_asInitiator();
      else               await startWebRTC_asReceiver();
      break;

    case 'offer':
      // receiver: set remote dulu, baru add track, lalu answer
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: msg.sdp }));
      // flush ICE queue yang mungkin sudah datang sebelumnya
      for (const c of iceCandidateQueue) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch(e){}
      }
      iceCandidateQueue = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
      break;

    case 'answer':
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
      // flush ICE queue
      for (const c of iceCandidateQueue) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch(e){}
      }
      iceCandidateQueue = [];
      break;

    case 'ice-candidate':
      if (!msg.candidate) break;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        // remoteDescription sudah di-set, langsung tambah
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch(e){}
      } else {
        // belum siap, simpan dulu di queue
        iceCandidateQueue.push(msg.candidate);
      }
      break;

    case 'sync-settings':
      applySettings(msg.settings);
      break;

    case 'do-capture':
      // peer yang menekan jepret — kita ikut capture bersamaan
      stageNote.textContent = '🎀 temanmu menekan jepret!';
      await runCaptureSequence(msg.countdown ?? 3);
      break;

    case 'peer-photo':
      peerPhotos[msg.index] = msg.dataUrl;
      checkAndComposeTogather();
      break;

    case 'peer-left':
      stageNote.textContent = 'Teman kamu keluar dari room :(';
      connectingOverlay.style.display = 'flex';
      connectingOverlay.querySelector('span').textContent = 'Teman keluar :(';
      break;

    case 'error':
      joinError.textContent = msg.message;
      break;
  }
}

// ===== WebRTC =====

// Queue ICE candidates yang datang sebelum remoteDescription di-set
let iceCandidateQueue = [];

async function startWebRTC_asInitiator() {
  iceCandidateQueue = [];
  createPeerConnection();
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: true });
  await pc.setLocalDescription(offer);
  ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
}

async function startWebRTC_asReceiver() {
  iceCandidateQueue = [];
  createPeerConnection();
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
}

// Batasi bitrate video sender agar tidak patah-patah
// dipanggil setelah koneksi terbentuk (onconnectionstatechange = connected)
async function applyVideoBandwidth(pc, maxKbps = 500) {
  if (!pc) return;
  const senders = pc.getSenders().filter(s => s.track?.kind === 'video');
  for (const sender of senders) {
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings.forEach(enc => {
        enc.maxBitrate    = maxKbps * 1000;
        enc.maxFramerate  = 24;
        // prioritaskan kelancaran (framerate) daripada kualitas gambar
        enc.networkPriority = 'high';
        enc.priority        = 'high';
      });
      await sender.setParameters(params);
    } catch(e) {
      console.warn('setParameters gagal:', e);
    }
  }
}

function createPeerConnection() {
  if (pc) { try { pc.close(); } catch(e){} pc = null; }

  pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302'  },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      {
        urls:       'turn:openrelay.metered.ca:80',
        username:   'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls:       'turn:openrelay.metered.ca:443',
        username:   'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls:       'turn:openrelay.metered.ca:443?transport=tcp',
        username:   'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    iceCandidatePoolSize: 10,
    // preferensikan VP8 — codec paling stabil & ringan di semua browser
    sdpSemantics: 'unified-plan',
  });

  pc.onicecandidate = e => {
    if (e.candidate && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ice-candidate', candidate: e.candidate }));
    }
  };

  pc.onconnectionstatechange = async () => {
    console.log('WebRTC state:', pc.connectionState);
    if (pc.connectionState === 'connected') {
      connectingOverlay.style.display = 'none';
      stageNote.textContent = '🎀 tersambung! pilih layout & tekan jepret!';
      // terapkan batas bandwidth setelah tersambung
      await applyVideoBandwidth(pc, 500); // maks 500 kbps
    }
    if (pc.connectionState === 'disconnected') {
      // coba reconnect otomatis setelah 2 detik
      setTimeout(() => {
        if (pc?.connectionState === 'disconnected') {
          stageNote.textContent = '⚠️ koneksi tidak stabil, mencoba ulang…';
        }
      }, 2000);
    }
    if (pc.connectionState === 'failed') {
      stageNote.textContent = '⚠️ koneksi gagal, coba refresh & ulangi';
      connectingOverlay.style.display = 'flex';
      connectingOverlay.querySelector('span').textContent = 'Koneksi gagal :(';
    }
  };

  pc.ontrack = e => {
    remoteStream = e.streams[0];
    videoPeer.srcObject = remoteStream;
    connectingOverlay.style.display = 'none';
    stageNote.textContent = '🎀 tersambung! pilih layout & tekan jepret!';
  };
}

function cleanupConnection() {
  iceCandidateQueue = [];
  if (pc) { try { pc.close(); } catch(e){} pc = null; }
  if (ws) { try { ws.close(); } catch(e){} ws = null; }
  remoteStream = null;
  videoPeer.srcObject = null;

  // reset UI overlay dan status — penting saat user pindah ke solo setelah bareng
  connectingOverlay.style.display = 'none';
  stageNote.textContent = 'pilih layout & tekan jepret!';

  roomCode = ''; userNum = 0;
  roomCodeDisplay.style.display = 'none';
  btnCreateRoom.disabled = false;
  roomCodeText.textContent = '------';
  waitStatus.textContent = 'Menunggu teman masuk… ♡';
  joinCodeInput.value = '';
  joinError.textContent = '';
}

// ===== Camera =====
async function startBooth() {
  buildProgressDots();
  capturedPhotos = [];
  peerPhotos = {};

  // reset toggle kamera ke ON
  camEnabled = true;
  const _ov  = document.getElementById('camOffOverlay');
  const _ic  = document.getElementById('camToggleIcon');
  const _tx  = document.getElementById('camToggleText');
  const _btn = document.getElementById('camToggleBtn');
  if (_ov)  _ov.style.display = 'none';
  if (_ic)  _ic.textContent   = '📷';
  if (_tx)  _tx.textContent   = 'Matikan';
  if (_btn) _btn.classList.remove('off');

  // FIX 2: reset stageNote dan sembunyikan connectingOverlay saat mode solo
  if (mode === 'solo') {
    stageNote.textContent = 'pilih layout & tekan jepret!';
    connectingOverlay.style.display = 'none';
  }

  // FIX 1: resolusi berbeda untuk solo vs bareng
  // Solo: tinggi (untuk hasil foto bagus)
  // Bareng: sedang (agar stream WebRTC tidak patah-patah)
  const videoConstraints = mode === 'together'
    ? {
        width:  { ideal: 640,  max: 854  },
        height: { ideal: 480,  max: 640  },
        frameRate: { ideal: 24, max: 30  },
      }
    : {
        width:  { ideal: 1280 },
        height: { ideal: 960  },
      };

  try {
    // stop stream lama kalau ada
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    localStream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });
    videoYou.srcObject = localStream;
  } catch(err) {
    stageNote.textContent = 'Kamera gagal dimuat. Izinkan akses kamera ya!';
    console.error(err);
  }
}

function stopCamera() {
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
}

// sync caption polaroid saat diketik
captionField.addEventListener('input', () => broadcastSettings());

// Tunggu sampai video element benar-benar punya data (kamera aktif)
function waitForVideoTrack(videoEl, timeout = 5000) {
  return new Promise(res => {
    if (videoEl.readyState >= 2) { res(); return; }
    const done = () => { clearTimeout(timer); res(); };
    const timer = setTimeout(done, timeout); // fallback timeout
    videoEl.addEventListener('loadeddata', done, { once: true });
    videoEl.addEventListener('playing',    done, { once: true });
  });
}

// ===== Controls =====
document.getElementById('layoutOptions').addEventListener('click', e => {
  const btn = e.target.closest('.opt-btn'); if (!btn) return;
  document.querySelectorAll('#layoutOptions .opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentLayout = btn.dataset.layout;
  captionField.style.display = currentLayout === 'polaroid' ? 'block' : 'none';
  buildProgressDots(); capturedPhotos = []; peerPhotos = {};
  broadcastSettings();
});

document.getElementById('filterOptions').addEventListener('click', e => {
  const btn = e.target.closest('.opt-btn'); if (!btn) return;
  document.querySelectorAll('#filterOptions .opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  videoYou.style.filter = FILTER_CSS[currentFilter];
  broadcastSettings();
});

// ===== Settings Sync (mode bareng) =====
function broadcastSettings() {
  if (mode !== 'together' || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'sync-settings',
    settings: {
      layout:  currentLayout,
      filter:  currentFilter,
      theme:   currentTheme,
      caption: captionField.value,
    }
  }));
}

function applySettings(settings) {
  // layout
  if (settings.layout && settings.layout !== currentLayout) {
    currentLayout = settings.layout;
    document.querySelectorAll('#layoutOptions .opt-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.layout === currentLayout);
    });
    captionField.style.display = currentLayout === 'polaroid' ? 'block' : 'none';
    buildProgressDots();
    capturedPhotos = []; peerPhotos = {};
  }
  // filter
  if (settings.filter && settings.filter !== currentFilter) {
    currentFilter = settings.filter;
    document.querySelectorAll('#filterOptions .opt-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === currentFilter);
    });
    videoYou.style.filter = FILTER_CSS[currentFilter];
  }
  // theme
  if (settings.theme && settings.theme !== currentTheme) {
    currentTheme = settings.theme;
    document.querySelectorAll('.tpl-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === currentTheme);
    });
    document.querySelectorAll('#solidThemeOptions .swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.theme === currentTheme);
    });
    document.querySelectorAll('#customFrameOptions .tpl-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === currentTheme);
    });
  }
  // caption
  if (settings.caption !== undefined) {
    captionField.value = settings.caption;
  }
}
function clearAllThemeSelections() {
  document.querySelectorAll('.tpl-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#solidThemeOptions .swatch').forEach(s => s.classList.remove('active'));
}

// handler untuk template ilustrasi
document.getElementById('themeOptions').addEventListener('click', e => {
  const btn = e.target.closest('.tpl-btn'); if (!btn) return;
  clearAllThemeSelections();
  btn.classList.add('active');
  currentTheme = btn.dataset.theme;
  broadcastSettings();
});

// handler untuk custom frame
document.getElementById('customFrameOptions').addEventListener('click', e => {
  const btn = e.target.closest('.tpl-btn'); if (!btn) return;
  clearAllThemeSelections();
  btn.classList.add('active');
  currentTheme = btn.dataset.theme;
  if (ALL_THEMES[currentTheme]?.preload) ALL_THEMES[currentTheme].preload();
  broadcastSettings();
});

// handler untuk warna solid
document.getElementById('solidThemeOptions').addEventListener('click', e => {
  const sw = e.target.closest('.swatch'); if (!sw) return;
  clearAllThemeSelections();
  sw.classList.add('active');
  currentTheme = sw.dataset.theme;
  broadcastSettings();
});

function buildProgressDots() {
  const n = mode === 'together'
    ? LAYOUTS_TOGETHER[currentLayout].count
    : LAYOUTS[currentLayout].count;
  progressRow.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'progress-dot';
    progressRow.appendChild(d);
  }
}

// ===== Shutter =====
shutterBtn.addEventListener('click', async () => {
  if (mode === 'together') {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      stageNote.textContent = '⚠️ Belum tersambung ke teman!';
      return;
    }
    // Kirim trigger ke peer DULU, lalu dua-duanya mulai bareng
    ws.send(JSON.stringify({ type: 'trigger-capture', countdown: 3 }));
  }
  await runCaptureSequence(3);
});

// ===== Capture sequence =====
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function runCaptureSequence(cdSecs = 3) {
  // nonaktifkan tombol jepret di kedua user selama proses
  shutterBtn.disabled = true;
  capturedPhotos = [];
  peerPhotos     = {};

  const n = mode === 'together'
    ? LAYOUTS_TOGETHER[currentLayout].count
    : LAYOUTS[currentLayout].count;

  // rebuild dots segar setiap sesi
  buildProgressDots();
  const dots = progressRow.querySelectorAll('.progress-dot');

  for (let i = 0; i < n; i++) {
    // update progress dot
    dots.forEach(d => d.classList.remove('current'));
    if (dots[i]) dots[i].classList.add('current');
    stageNote.textContent = `📸 foto ${i+1} dari ${n}`;

    await countdownAnim(cdSecs);

    const dataUrl = captureFrame(videoYou, FILTER_CSS[currentFilter]);

    if (mode === 'solo') {
      capturedPhotos.push(dataUrl);
    } else {
      capturedPhotos[i] = dataUrl;
      // kirim foto kita ke peer
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'photo', dataUrl, index: i }));
      }
    }

    // efek flash
    flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');

    // update dot jadi done
    if (dots[i]) { dots[i].classList.remove('current'); dots[i].classList.add('done'); }
    stageNote.textContent = `✅ foto ${i+1} diambil!`;
    await sleep(500);
  }

  shutterBtn.disabled = false;

  if (mode === 'solo') {
    stageNote.textContent = '✨ menyusun foto…';
    await composeCanvas_solo(capturedPhotos);
    showScreen('screenResult');
  } else {
    stageNote.textContent = '⏳ menunggu foto dari teman… ♡';
    checkAndComposeTogather();
  }
}

async function countdownAnim(seconds) {
  countdownEl.style.display = 'flex';
  for (let s = seconds; s >= 1; s--) {
    countdownEl.textContent = s;
    await sleep(700);
  }
  countdownEl.textContent = '📸';
  await sleep(250);
  countdownEl.style.display = 'none';
}

function captureFrame(videoEl, filterStr) {
  const w = videoEl.videoWidth || 1280, h = videoEl.videoHeight || 960;
  workCanvas.width = w; workCanvas.height = h;
  const ctx = workCanvas.getContext('2d');
  ctx.save();
  ctx.filter = filterStr;
  ctx.translate(w, 0); ctx.scale(-1, 1);
  ctx.drawImage(videoEl, 0, 0, w, h);
  ctx.restore();
  return workCanvas.toDataURL('image/jpeg', 0.95);
}

// ===== Together: tunggu foto dari kedua user =====
function checkAndComposeTogather() {
  const n = LAYOUTS_TOGETHER[currentLayout].count;
  for (let i = 0; i < n; i++) {
    if (!capturedPhotos[i] || !peerPhotos[i]) return; // belum semua ready
  }
  stageNote.textContent = '✨ menyusun foto bareng…';
  composeCanvas_together(capturedPhotos, peerPhotos).then(() => showScreen('screenResult'));
}

// ===== Canvas: solo =====
async function composeCanvas_solo(photos) {
  const theme = ALL_THEMES[currentTheme];
  const cfg   = LAYOUTS[currentLayout];

  // pre-load frame gambar kalau ada
  if (theme._frameUrl && !theme._frameUrl.includes('USERNAME')) {
    await loadFrameImg(theme._frameUrl);
  }

  const imgs = await Promise.all(photos.map(loadImg));

  const cellW=340, cellH=255, gap=18, outerPad=36;
  const cols=cfg.cols, rows=Math.ceil(cfg.count/cols);
  const footerH = currentLayout==='polaroid' ? 74 : 70;
  const W = cols*cellW + (cols-1)*gap + outerPad*2;
  const H = rows*cellH + (rows-1)*gap + outerPad*2 + footerH;

  resultCanvas.width=W; resultCanvas.height=H;
  const ctx = resultCanvas.getContext('2d');

  // 1. background
  theme.drawBg(ctx, W, H);

  // 2. foto-foto
  imgs.forEach((img,i) => {
    const col=i%cols, row=Math.floor(i/cols);
    drawPhotoCard(ctx, img, outerPad+col*(cellW+gap), outerPad+row*(cellH+gap), cellW, cellH, theme);
  });

  // 3. dekorasi/frame di ATAS foto
  theme.drawDeco(ctx, W, H, []);
}

// ===== Canvas: together =====
async function composeCanvas_together(youPhotos, theirPhotos) {
  const theme  = ALL_THEMES[currentTheme];
  const cfg    = LAYOUTS_TOGETHER[currentLayout];
  const n      = cfg.count;

  // pre-load frame gambar kalau ada
  if (theme._frameUrl && !theme._frameUrl.includes('USERNAME')) {
    await loadFrameImg(theme._frameUrl);
  }

  const youImgs   = await Promise.all(Array.from({length:n}, (_,i) => loadImg(youPhotos[i])));
  const theirImgs = await Promise.all(Array.from({length:n}, (_,i) => loadImg(peerPhotos[i])));

  const outerPad = 32, gap = 14, footerH = 72;

  if (cfg.mode === 'grid') {
    // ── GRID 2x2: baris 1 = kamu1 | kamu2, baris 2 = teman1 | teman2 ──
    const cellW = 290, cellH = 218;
    const W = 2*cellW + gap + outerPad*2;
    const H = 2*cellH + gap + outerPad*2 + footerH;

    resultCanvas.width = W; resultCanvas.height = H;
    const ctx = resultCanvas.getContext('2d');
    theme.drawBg(ctx, W, H);

    // baris 1: 2 foto kamu
    drawPhotoCard(ctx, youImgs[0], outerPad,            outerPad,            cellW, cellH, theme);
    drawPhotoCard(ctx, youImgs[1], outerPad+cellW+gap,  outerPad,            cellW, cellH, theme);
    // baris 2: 2 foto teman
    drawPhotoCard(ctx, theirImgs[0], outerPad,           outerPad+cellH+gap, cellW, cellH, theme);
    drawPhotoCard(ctx, theirImgs[1], outerPad+cellW+gap, outerPad+cellH+gap, cellW, cellH, theme);

    // label kamu / teman
    drawRowLabel(ctx, 'kamu',  theme.accent, outerPad,           outerPad - 20, cellW*2+gap);
    drawRowLabel(ctx, 'teman', theme.accent, outerPad, outerPad+cellH+gap - 20, cellW*2+gap);

    theme.drawDeco(ctx, W, H, []);

  } else {
    // ── ROWS: tiap baris = kamu | teman ──
    const cellW = 268, cellH = 201;
    const W = 2*cellW + gap + outerPad*2;
    const H = n*cellH + (n-1)*gap + outerPad*2 + footerH;

    resultCanvas.width = W; resultCanvas.height = H;
    const ctx = resultCanvas.getContext('2d');
    theme.drawBg(ctx, W, H);

    // label kolom di atas baris pertama
    drawRowLabel(ctx, 'kamu',  theme.accent, outerPad,            outerPad - 22, cellW);
    drawRowLabel(ctx, 'teman', theme.accent, outerPad+cellW+gap,  outerPad - 22, cellW);

    for (let i = 0; i < n; i++) {
      const y = outerPad + i*(cellH+gap);
      drawPhotoCard(ctx, youImgs[i],   outerPad,           y, cellW, cellH, theme);
      drawPhotoCard(ctx, theirImgs[i], outerPad+cellW+gap, y, cellW, cellH, theme);
    }

    theme.drawDeco(ctx, W, H, []);
  }
}

// helper label kecil di atas baris foto
function drawRowLabel(ctx, text, color, x, y, w) {
  ctx.save();
  ctx.font = "700 15px 'Caveat',Georgia,serif";
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w/2, y);
  ctx.restore();
}

// ===== Drawing helpers =====
function drawPhotoCard(ctx, img, x, y, cw, ch, theme){
  ctx.save();
  ctx.shadowColor='rgba(0,0,0,0.18)'; ctx.shadowBlur=14; ctx.shadowOffsetY=4;
  ctx.fillStyle=theme.card; ctx.fillRect(x-8, y-8, cw+16, ch+16);
  ctx.restore();
  const ir=img.width/img.height, cr=cw/ch;
  let sx,sy,sw,sh;
  if(ir>cr){ sh=img.height; sw=sh*cr; sx=(img.width-sw)/2; sy=0; }
  else     { sw=img.width;  sh=sw/cr; sx=0; sy=(img.height-sh)/2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, cw, ch);
}

function loadImg(src){
  return new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.src=src; });
}

// ===== Result actions =====
document.getElementById('downloadBtn').addEventListener('click',()=>{
  const a=document.createElement('a');
  a.download=`caca-booth-${Date.now()}.png`;
  a.href=resultCanvas.toDataURL('image/png'); a.click();
});

document.getElementById('retakeBtn').addEventListener('click',()=>{
  capturedPhotos=[]; peerPhotos={};
  buildProgressDots();
  stageNote.textContent='pilih layout & tekan jepret!';
  showScreen('screenBooth');
});

document.getElementById('homeBtn').addEventListener('click',()=>{
  cleanupConnection(); stopCamera();
  showScreen('screenHome');
});
