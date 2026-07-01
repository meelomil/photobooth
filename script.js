// ================= Cutie Booth — script.js =================

const video = document.getElementById('video');
const countdownEl = document.getElementById('countdown');
const flashEl = document.getElementById('flash');
const progressRow = document.getElementById('progressRow');
const shotLabel = document.getElementById('shotLabel');
const startBtn = document.getElementById('startBtn');
const resultWrap = document.getElementById('resultWrap');
const resultCanvas = document.getElementById('resultCanvas');
const workCanvas = document.getElementById('workCanvas');
const captionField = document.getElementById('captionField');

let currentLayout = 'strip3';
let currentFilter = 'none';
let currentTheme = 'pink';

const LAYOUTS = {
  strip3:   { count: 3, cols: 1 },
  strip4:   { count: 4, cols: 1 },
  grid2x2:  { count: 4, cols: 2 },
  polaroid: { count: 1, cols: 1 },
};

const FILTER_CSS = {
  none:    'none',
  bw:      'grayscale(1) contrast(1.05)',
  vintage: 'sepia(0.45) saturate(1.3) contrast(1.05) brightness(0.98)',
  warm:    'saturate(1.3) hue-rotate(-8deg) brightness(1.05)',
  cool:    'saturate(1.15) hue-rotate(12deg) brightness(1.02)',
  soft:    'brightness(1.08) contrast(0.92) saturate(1.1) blur(0.3px)',
};

// each theme: background, card (photo mat), text color, accent, and sticker emoji set
const THEME_COLORS = {
  pink:     { bg:'#ffd6e8', card:'#ffffff', text:'#a6416f', accent:'#ff6fa5', stickers:['♡','✦','☆'] },
  lavender: { bg:'#e3d6ff', card:'#ffffff', text:'#5c4590', accent:'#b28dff', stickers:['✧','☆','✦'] },
  mint:     { bg:'#d2f5e3', card:'#ffffff', text:'#2c7a58', accent:'#4fd8a8', stickers:['✦','♡','✧'] },
  butter:   { bg:'#fff2b8', card:'#ffffff', text:'#8a6d10', accent:'#ffcf3f', stickers:['☆','✧','♡'] },
  peach:    { bg:'#ffe0cc', card:'#ffffff', text:'#a85a2f', accent:'#ff9d6c', stickers:['✦','☆','♡'] },
  cream:    { bg:'#fdf6ec', card:'#ffffff', text:'#7a6650', accent:'#e0553f', stickers:['✧','♡','☆'] },
};

// ---------------- option button wiring ----------------
document.getElementById('layoutOptions').addEventListener('click', e => {
  const btn = e.target.closest('.opt-btn');
  if (!btn) return;
  document.querySelectorAll('#layoutOptions .opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentLayout = btn.dataset.layout;
  captionField.style.display = currentLayout === 'polaroid' ? 'block' : 'none';
  buildProgressDots();
});

document.getElementById('filterOptions').addEventListener('click', e => {
  const btn = e.target.closest('.opt-btn');
  if (!btn) return;
  document.querySelectorAll('#filterOptions .opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  video.style.filter = FILTER_CSS[currentFilter];
});

document.getElementById('themeOptions').addEventListener('click', e => {
  const sw = e.target.closest('.swatch');
  if (!sw) return;
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
buildProgressDots();

// ---------------- camera ----------------
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 960 },
      audio: false,
    });
    video.srcObject = stream;
  } catch (err) {
    shotLabel.textContent = 'kamera gagal :(';
    alert('Tidak bisa mengakses kamera. Pastikan izin kamera aktif, dan buka lewat HTTPS atau localhost (bukan file:// langsung).');
    console.error(err);
  }
}
initCamera();

// ---------------- capture flow ----------------
startBtn.addEventListener('click', runCaptureSequence);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runCaptureSequence() {
  startBtn.disabled = true;
  const n = LAYOUTS[currentLayout].count;
  const dots = progressRow.querySelectorAll('.progress-dot');
  dots.forEach(d => d.classList.remove('done', 'current'));
  const photos = [];

  for (let i = 0; i < n; i++) {
    dots[i].classList.add('current');
    shotLabel.textContent = `foto ${i + 1}/${n}`;
    await countdownAnimation(3);
    const dataUrl = capturePhotoWithFilter();
    photos.push(dataUrl);
    flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');
    dots[i].classList.remove('current');
    dots[i].classList.add('done');
    await sleep(500);
  }

  shotLabel.textContent = 'selesai! 🎀';
  composeResult(photos);
  startBtn.disabled = false;
}

async function countdownAnimation(seconds) {
  countdownEl.style.display = 'flex';
  for (let s = seconds; s >= 1; s--) {
    countdownEl.textContent = s;
    await sleep(700);
  }
  countdownEl.textContent = '📸';
  await sleep(250);
  countdownEl.style.display = 'none';
}

function capturePhotoWithFilter() {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 960;
  workCanvas.width = w;
  workCanvas.height = h;
  const ctx = workCanvas.getContext('2d');
  ctx.save();
  ctx.filter = FILTER_CSS[currentFilter];
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();
  return workCanvas.toDataURL('image/jpeg', 0.95);
}

function loadImg(src) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.src = src;
  });
}

// ---------------- compose final strip ----------------
async function composeResult(photoDataUrls) {
  const theme = THEME_COLORS[currentTheme];
  const cfg = LAYOUTS[currentLayout];
  const imgs = await Promise.all(photoDataUrls.map(loadImg));

  const cellW = 340, cellH = 255, gap = 18, outerPad = 30;
  const cols = cfg.cols;
  const rows = Math.ceil(cfg.count / cols);
  const footerH = currentLayout === 'polaroid' ? 74 : 96;

  const gridW = cols * cellW + (cols - 1) * gap;
  const gridH = rows * cellH + (rows - 1) * gap;
  const W = gridW + outerPad * 2;
  const H = gridH + outerPad * 2 + footerH;

  resultCanvas.width = W;
  resultCanvas.height = H;
  const ctx = resultCanvas.getContext('2d');

  // background
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  // dashed cute border
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.setLineDash([]);

  // draw photo cards
  imgs.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = outerPad + col * (cellW + gap);
    const y = outerPad + row * (cellH + gap);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = theme.card;
    ctx.fillRect(x - 8, y - 8, cellW + 16, cellH + 16);
    ctx.restore();

    const ir = img.width / img.height, cr = cellW / cellH;
    let sx, sy, sw, sh;
    if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
    else { sw = img.width; sh = sw / cr; sx = 0; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cellH);

    // small corner sticker on each photo
    drawSticker(ctx, theme.stickers[i % theme.stickers.length], x + cellW - 6, y + 6, 26, theme.accent);
  });

  // scattered stickers around the border for the cute doodle effect
  const border = [
    [26, 26], [W - 26, 26], [26, H - footerH - 22], [W - 26, H - footerH - 22],
  ];
  border.forEach((pos, i) => drawSticker(ctx, theme.stickers[(i + 1) % theme.stickers.length], pos[0], pos[1], 22, theme.accent));

  // footer text
  ctx.fillStyle = theme.text;
  ctx.textAlign = 'center';
  if (currentLayout === 'polaroid') {
    const cap = captionField.value.trim() || 'cutie booth ✦ ' + new Date().toLocaleDateString('id-ID');
    ctx.font = "italic 26px Georgia, serif";
    ctx.fillText(cap, W / 2, H - 30);
  } else {
    ctx.font = "700 26px 'Caveat', Georgia, serif";
    ctx.fillText('c u t i e   b o o t h', W / 2, H - 52);
    ctx.font = "13px 'Poppins', sans-serif";
    ctx.fillStyle = theme.accent;
    ctx.fillText(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }), W / 2, H - 26);
  }

  resultWrap.classList.add('show');
  resultWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function drawSticker(ctx, glyph, cx, cy, size, color) {
  ctx.save();
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.translate(cx, cy);
  ctx.rotate((Math.random() * 20 - 10) * Math.PI / 180);
  ctx.fillText(glyph, 0, 0);
  ctx.restore();
}

// ---------------- result actions ----------------
document.getElementById('downloadBtn').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `cutie-booth-${Date.now()}.png`;
  link.href = resultCanvas.toDataURL('image/png');
  link.click();
});

document.getElementById('retakeBtn').addEventListener('click', () => {
  resultWrap.classList.remove('show');
  shotLabel.textContent = 'siap yaa~';
  buildProgressDots();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
