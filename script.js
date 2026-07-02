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
let currentTheme  = 'pink';

// captured photos: solo → array of dataUrls; together → [{you, peer}]
let capturedPhotos = [];
let peerPhotos     = {};   // index → dataUrl received from peer

const LAYOUTS = {
  strip3:  { count:3, cols:1 },
  strip4:  { count:4, cols:1 },
  grid2x2: { count:4, cols:2 },
  polaroid:{ count:1, cols:1 },
};

const FILTER_CSS = {
  none:    'none',
  bw:      'grayscale(1) contrast(1.05)',
  vintage: 'sepia(.45) saturate(1.3) contrast(1.05) brightness(.98)',
  warm:    'saturate(1.3) hue-rotate(-8deg) brightness(1.05)',
  cool:    'saturate(1.15) hue-rotate(12deg) brightness(1.02)',
  soft:    'brightness(1.08) contrast(.92) saturate(1.1) blur(.3px)',
};

const THEMES = {
  pink:    { bg:'#ffd6e8', card:'#fff', text:'#a6416f', accent:'#ff6fa5', stickers:['♡','✦','☆'] },
  lavender:{ bg:'#e3d6ff', card:'#fff', text:'#5c4590', accent:'#b28dff', stickers:['✧','☆','✦'] },
  mint:    { bg:'#d2f5e3', card:'#fff', text:'#2c7a58', accent:'#4fd8a8', stickers:['✦','♡','✧'] },
  butter:  { bg:'#fff2b8', card:'#fff', text:'#8a6d10', accent:'#ffcf3f', stickers:['☆','✧','♡'] },
  peach:   { bg:'#ffe0cc', card:'#fff', text:'#a85a2f', accent:'#ff9d6c', stickers:['✦','☆','♡'] },
  sky:     { bg:'#d6eeff', card:'#fff', text:'#2b5f8a', accent:'#5bb8f5', stickers:['✧','☆','✦'] },
  clean:   { bg:'#ffffff', card:'#fff', text:'#4a3b52', accent:'#ff6fa5', stickers:['♡','✦','✧'] },
};

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
      await startBooth();
      showScreen('screenBooth');
      if (userNum === 1) await startWebRTC_asInitiator();
      else               await startWebRTC_asReceiver();
      break;

    case 'offer':
      await pc.setRemoteDescription(new RTCSessionDescription(msg));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type:'answer', sdp:answer.sdp }));
      break;

    case 'answer':
      await pc.setRemoteDescription(new RTCSessionDescription(msg));
      break;

    case 'ice-candidate':
      if (msg.candidate) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      break;

    case 'do-capture':
      stageNote.textContent = '🎀 temanmu menekan jepret!';
      await runCaptureSequence(msg.countdown, false);
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
async function startWebRTC_asInitiator() {
  createPeerConnection();
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  ws.send(JSON.stringify({ type:'offer', sdp: offer.sdp }));
}

async function startWebRTC_asReceiver() {
  createPeerConnection();
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
}

function createPeerConnection() {
  pc = new RTCPeerConnection({
    iceServers:[
      { urls:'stun:stun.l.google.com:19302' },
      { urls:'stun:stun1.l.google.com:19302' },
    ]
  });
  pc.onicecandidate = e => {
    if (e.candidate) ws.send(JSON.stringify({ type:'ice-candidate', candidate:e.candidate }));
  };
  pc.ontrack = e => {
    remoteStream = e.streams[0];
    videoPeer.srcObject = remoteStream;
    connectingOverlay.style.display = 'none';
  };
}

function cleanupConnection() {
  if (pc)  { pc.close();  pc = null; }
  if (ws)  { ws.close();  ws = null; }
  remoteStream = null;
  videoPeer.srcObject = null;
  connectingOverlay.style.display = 'flex';
  connectingOverlay.querySelector('span').textContent = 'Menghubungkan… ♡';
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
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video:{ width:1280, height:960 }, audio:false });
    videoYou.srcObject = localStream;
  } catch(err) {
    stageNote.textContent = 'Kamera gagal dimuat. Izinkan akses kamera ya!';
    console.error(err);
  }
}

function stopCamera() {
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
}

// ===== Controls =====
document.getElementById('layoutOptions').addEventListener('click', e => {
  const btn = e.target.closest('.opt-btn'); if (!btn) return;
  document.querySelectorAll('#layoutOptions .opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentLayout = btn.dataset.layout;
  captionField.style.display = currentLayout === 'polaroid' ? 'block' : 'none';
  buildProgressDots(); capturedPhotos = []; peerPhotos = {};
});

document.getElementById('filterOptions').addEventListener('click', e => {
  const btn = e.target.closest('.opt-btn'); if (!btn) return;
  document.querySelectorAll('#filterOptions .opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  videoYou.style.filter = FILTER_CSS[currentFilter];
});

document.getElementById('themeOptions').addEventListener('click', e => {
  const sw = e.target.closest('.swatch'); if (!sw) return;
  document.querySelectorAll('#themeOptions .swatch').forEach(s => s.classList.remove('active'));
  sw.classList.add('active');
  currentTheme = sw.dataset.theme;
});

function buildProgressDots() {
  const n = LAYOUTS[currentLayout].count;
  progressRow.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'progress-dot';
    progressRow.appendChild(d);
  }
}

// ===== Shutter =====
shutterBtn.addEventListener('click', async () => {
  if (mode === 'together' && ws?.readyState === WebSocket.OPEN) {
    // tell the peer to also capture
    ws.send(JSON.stringify({ type:'trigger-capture', countdown:3 }));
  }
  await runCaptureSequence(3, true);
});

// ===== Capture sequence =====
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function runCaptureSequence(cdSecs, isInitiator) {
  shutterBtn.disabled = true;
  const n    = LAYOUTS[currentLayout].count;
  const dots = progressRow.querySelectorAll('.progress-dot');

  for (let i = 0; i < n; i++) {
    dots.forEach(d => d.classList.remove('current'));
    dots[i].classList.add('current');
    stageNote.textContent = `foto ${i+1}/${n} — bersiap!`;
    await countdownAnim(cdSecs);
    const dataUrl = captureFrame(videoYou, FILTER_CSS[currentFilter]);

    if (mode === 'solo') {
      capturedPhotos.push(dataUrl);
    } else {
      capturedPhotos[i] = dataUrl;
      // send our photo to peer
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type:'photo', dataUrl, index:i }));
      }
    }

    flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');
    dots[i].classList.remove('current');
    dots[i].classList.add('done');
    stageNote.textContent = `foto ${i+1} diambil! ✨`;
    await sleep(600);
  }

  shutterBtn.disabled = false;

  if (mode === 'solo') {
    await composeCanvas_solo(capturedPhotos);
    showScreen('screenResult');
  } else {
    stageNote.textContent = 'Menunggu foto dari teman… ♡';
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

// ===== Together: wait for both photos at each index =====
function checkAndComposeTogather() {
  const n = LAYOUTS[currentLayout].count;
  for (let i = 0; i < n; i++) {
    if (!capturedPhotos[i] || !peerPhotos[i]) return; // not all ready yet
  }
  composeCanvas_together(capturedPhotos, peerPhotos).then(() => showScreen('screenResult'));
}

// ===== Canvas: solo =====
async function composeCanvas_solo(photos) {
  const theme = THEMES[currentTheme];
  const cfg   = LAYOUTS[currentLayout];
  const imgs  = await Promise.all(photos.map(loadImg));

  const cellW=340, cellH=255, gap=18, outerPad=28;
  const cols=cfg.cols, rows=Math.ceil(cfg.count/cols);
  const footerH = currentLayout==='polaroid'?74:90;
  const W = cols*cellW + (cols-1)*gap + outerPad*2;
  const H = rows*cellH + (rows-1)*gap + outerPad*2 + footerH;

  resultCanvas.width=W; resultCanvas.height=H;
  const ctx = resultCanvas.getContext('2d');
  drawBase(ctx,W,H,theme);

  imgs.forEach((img,i) => {
    const col=i%cols, row=Math.floor(i/cols);
    drawPhotoCard(ctx, img, outerPad+col*(cellW+gap), outerPad+row*(cellH+gap), cellW, cellH, theme);
    drawSticker(ctx, theme.stickers[i%theme.stickers.length], outerPad+col*(cellW+gap)+cellW-4, outerPad+row*(cellH+gap)+6, 24, theme.accent);
  });
  drawFooter(ctx,W,H,footerH,theme,'solo');
}

// ===== Canvas: together — each row = [you | peer] =====
async function composeCanvas_together(youPhotos, theirPhotos) {
  const theme = THEMES[currentTheme];
  const n     = LAYOUTS[currentLayout].count;

  const cellW=280, cellH=210, gap=10, outerPad=24;
  const footerH=90;
  // layout: n rows, 2 cols (you | peer)
  const W = 2*cellW + gap + outerPad*2;
  const H = n*cellH + (n-1)*gap + outerPad*2 + footerH;

  resultCanvas.width=W; resultCanvas.height=H;
  const ctx = resultCanvas.getContext('2d');
  drawBase(ctx,W,H,theme);

  const youImgs  = await Promise.all(youPhotos.map(loadImg));
  const theirImgs= await Promise.all(Object.values(theirPhotos).map(loadImg));

  for (let i=0; i<n; i++) {
    const y = outerPad + i*(cellH+gap);
    drawPhotoCard(ctx, youImgs[i],   outerPad,         y, cellW, cellH, theme);
    drawPhotoCard(ctx, theirImgs[i], outerPad+cellW+gap, y, cellW, cellH, theme);
    // sticker between the two
    drawSticker(ctx, theme.stickers[i%theme.stickers.length], W/2, y+cellH/2, 22, theme.accent);
  }
  drawFooter(ctx,W,H,footerH,theme,'together');
}

// ===== Drawing helpers =====
function drawBase(ctx,W,H,theme){
  ctx.fillStyle=theme.bg; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle=theme.accent; ctx.lineWidth=3;
  ctx.setLineDash([10,8]); ctx.strokeRect(10,10,W-20,H-20); ctx.setLineDash([]);
}

function drawPhotoCard(ctx,img,x,y,cw,ch,theme){
  ctx.save();
  ctx.shadowColor='rgba(0,0,0,0.18)'; ctx.shadowBlur=14; ctx.shadowOffsetY=4;
  ctx.fillStyle=theme.card; ctx.fillRect(x-8,y-8,cw+16,ch+16);
  ctx.restore();
  const ir=img.width/img.height, cr=cw/ch;
  let sx,sy,sw,sh;
  if(ir>cr){sh=img.height;sw=sh*cr;sx=(img.width-sw)/2;sy=0;}
  else{sw=img.width;sh=sw/cr;sx=0;sy=(img.height-sh)/2;}
  ctx.drawImage(img,sx,sy,sw,sh,x,y,cw,ch);
}

function drawSticker(ctx,glyph,cx,cy,size,color){
  ctx.save();
  ctx.font=`${size}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=color;
  ctx.translate(cx,cy); ctx.rotate((Math.random()*20-10)*Math.PI/180);
  ctx.fillText(glyph,0,0); ctx.restore();
}

function drawFooter(ctx,W,H,footerH,theme,modeStr){
  ctx.fillStyle=theme.text; ctx.textAlign='center';
  if(currentLayout==='polaroid'){
    const cap=captionField.value.trim()||'caca booth ✦ '+new Date().toLocaleDateString('id-ID');
    ctx.font='italic 24px Georgia,serif'; ctx.fillText(cap,W/2,H-30);
  } else {
    ctx.font="700 26px 'Caveat',Georgia,serif";
    const label = modeStr==='together' ? 'caca booth  ♡  foto bareng' : 'caca booth ✨';
    ctx.fillText(label,W/2,H-footerH+30);
    ctx.font="13px 'Poppins',sans-serif"; ctx.fillStyle=theme.accent;
    ctx.fillText(new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}),W/2,H-footerH+56);
  }
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
