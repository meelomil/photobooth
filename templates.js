// =====================================================================
// Caca Booth — templates.js
// 4 custom illustrated templates + 7 warna solid lama
// =====================================================================

// ── helper warna/path ──
function hsl(h,s,l){ return `hsl(${h},${s}%,${l}%)`; }

// =====================================================================
// TEMPLATE DEFINITIONS
// Setiap template punya:
//   bg, card, text, accent  → sama seperti THEMES lama
//   drawBg(ctx,W,H)         → gambar latar belakang dekoratif
//   drawDeco(ctx,W,H,slots) → gambar doodle/stiker di slot tertentu
//     slots = array of {x,y} posisi bebas di luar foto
// =====================================================================

const TEMPLATES = {

  // ── 1. CAPYBARA ──────────────────────────────────────────────────
  capybara: {
    label:'🐾 Capybara', bg:'#e8dcc8', card:'#fffaf4', text:'#5c4a32', accent:'#a0784a',
    drawBg(ctx, W, H){
      // rumput di bawah
      ctx.fillStyle='#c5dfa0';
      ctx.fillRect(0, H-60, W, 60);
      for(let x=0;x<W;x+=18){
        ctx.fillStyle='#8fc45a';
        ctx.beginPath();
        ctx.moveTo(x,H-60); ctx.lineTo(x+6,H-80); ctx.lineTo(x+12,H-60);
        ctx.fill();
      }
      // langit gradasi
      const sky = ctx.createLinearGradient(0,0,0,H*0.4);
      sky.addColorStop(0,'#b8dff5'); sky.addColorStop(1,'#e8dcc8');
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H*0.4);
      // awan-awan lucu
      drawCloud(ctx, W*0.12, H*0.08, 55, 22);
      drawCloud(ctx, W*0.72, H*0.05, 70, 28);
      drawCloud(ctx, W*0.45, H*0.12, 45, 18);
    },
    drawDeco(ctx, W, H, slots){
      // capybara duduk di pojok kiri bawah
      drawCapybara(ctx, 18, H-110, 72);
      // capybara kecil di kanan bawah
      drawCapybara(ctx, W-90, H-90, 52);
      // bunga kecil di pojok atas
      drawFlower(ctx, 30, 30, 18, '#f5c842', '#f5a623');
      drawFlower(ctx, W-40, 28, 14, '#ff9ecd', '#ff6fa5');
      // jejak kaki di tengah footer
      drawPaw(ctx, W/2-20, H-38, 10, '#a0784a');
      drawPaw(ctx, W/2+14, H-28, 10, '#a0784a');
      // nama
      ctx.font="700 20px 'Caveat',Georgia,serif";
      ctx.fillStyle='#5c4a32'; ctx.textAlign='center';
      ctx.fillText('caca booth 🐾', W/2, H-8);
    }
  },

  // ── 2. PRINCESS MOANA ────────────────────────────────────────────
  moana: {
    label:'🌊 Moana', bg:'#0a4f7a', card:'#fff8ee', text:'#fff', accent:'#f7c948',
    drawBg(ctx, W, H){
      // laut gradasi
      const sea = ctx.createLinearGradient(0,0,0,H);
      sea.addColorStop(0,'#0a2a5a');
      sea.addColorStop(0.45,'#0a6fa0');
      sea.addColorStop(1,'#00b4d8');
      ctx.fillStyle=sea; ctx.fillRect(0,0,W,H);
      // matahari terbenam
      const sun = ctx.createRadialGradient(W*0.5,H*0.18,4, W*0.5,H*0.18,120);
      sun.addColorStop(0,'rgba(255,220,80,0.85)');
      sun.addColorStop(0.4,'rgba(255,140,30,0.4)');
      sun.addColorStop(1,'transparent');
      ctx.fillStyle=sun; ctx.fillRect(0,0,W,H);
      // gelombang
      for(let row=0;row<4;row++){
        const wy = H*0.55 + row*28;
        ctx.beginPath();
        ctx.strokeStyle=`rgba(255,255,255,${0.18-row*0.03})`;
        ctx.lineWidth=3;
        for(let x=0;x<W;x+=4){
          const y = wy + Math.sin((x+row*40)*0.06)*10;
          x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
      // bintang-bintang
      for(let i=0;i<22;i++){
        const sx=Math.random()*W, sy=Math.random()*H*0.35;
        ctx.fillStyle='rgba(255,255,200,0.8)';
        ctx.beginPath(); ctx.arc(sx,sy,1.2,0,Math.PI*2); ctx.fill();
      }
    },
    drawDeco(ctx, W, H, slots){
      // bunga tifaire merah di pojok
      drawHibiscus(ctx, 22, 22, 32);
      drawHibiscus(ctx, W-54, 18, 28);
      drawHibiscus(ctx, 18, H-54, 26);
      drawHibiscus(ctx, W-50, H-56, 30);
      // ombak kecil di footer
      drawWaveBar(ctx, 0, H-48, W, 48);
      // spiral laut
      drawSpiral(ctx, W*0.5, H-28, 10, '#f7c948');
      ctx.font="700 20px 'Caveat',Georgia,serif";
      ctx.fillStyle='#f7c948'; ctx.textAlign='center';
      ctx.fillText('caca booth 🌊', W/2, H-8);
    }
  },

  // ── 3. TANAMAN ───────────────────────────────────────────────────
  garden: {
    label:'🌻 Taman Bunga', bg:'#f0fae8', card:'#fffdf7', text:'#3a5a2a', accent:'#e8b400',
    drawBg(ctx, W, H){
      // gradient hijau lembut
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#f0fae8'); g.addColorStop(1,'#d4f0c0');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      // polka dot daun halus
      for(let i=0;i<30;i++){
        const lx=Math.random()*W, ly=Math.random()*H;
        drawLeafSmall(ctx, lx, ly, 10+Math.random()*10, Math.random()*Math.PI*2);
      }
    },
    drawDeco(ctx, W, H, slots){
      // bunga matahari di pojok
      drawSunflower(ctx, 28, 30, 36);
      drawSunflower(ctx, W-46, 26, 30);
      // bunga lily pink di sisi lain
      drawLilyPink(ctx, 22, H-64, 38);
      drawLilyPink(ctx, W-50, H-60, 32);
      // bunga matahari kecil di footer tengah
      drawSunflower(ctx, W*0.25, H-32, 18);
      drawSunflower(ctx, W*0.75, H-32, 18);
      // daun di tepi
      drawLeafSmall(ctx, 60, H/2, 22, -0.4);
      drawLeafSmall(ctx, W-55, H/2, 22, 0.4);
      ctx.font="700 20px 'Caveat',Georgia,serif";
      ctx.fillStyle='#3a5a2a'; ctx.textAlign='center';
      ctx.fillText('caca booth 🌻', W/2, H-8);
    }
  },

  // ── 4. MAKANAN ───────────────────────────────────────────────────
  foodie: {
    label:'🍢 Foodies', bg:'#fff8e8', card:'#fff', text:'#7a3a00', accent:'#e85d00',
    drawBg(ctx, W, H){
      // gradient warm
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#fff8e8'); g.addColorStop(1,'#ffeac8');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      // titik-titik wijen
      for(let i=0;i<40;i++){
        ctx.fillStyle='rgba(160,100,30,0.12)';
        const sx=Math.random()*W, sy=Math.random()*H;
        ctx.beginPath(); ctx.ellipse(sx,sy,3,2,Math.random(),0,Math.PI*2); ctx.fill();
      }
    },
    drawDeco(ctx, W, H, slots){
      // sate pojok kiri atas
      drawSate(ctx, 16, 16, 52, -0.3);
      // pangsit kanan atas
      drawPangsit(ctx, W-56, 14, 44);
      // dimsum kiri bawah
      drawDimsum(ctx, 14, H-62, 46);
      // sate kanan bawah
      drawSate(ctx, W-60, H-66, 46, 0.3);
      // bintang-bumbu di footer
      for(let i=0;i<5;i++){
        ctx.fillStyle='#e85d00';
        ctx.font='14px sans-serif'; ctx.textAlign='center';
        ctx.fillText('✦', W*0.15+i*(W*0.18), H-20);
      }
      ctx.font="700 20px 'Caveat',Georgia,serif";
      ctx.fillStyle='#7a3a00'; ctx.textAlign='center';
      ctx.fillText('caca booth 🍢', W/2, H-6);
    }
  },
};

// ── merge dengan warna solid lama ─────────────────────────────────
const SOLID_THEMES = {
  pink:     { label:'🩷 Pink',     bg:'#ffd6e8', card:'#fff', text:'#a6416f', accent:'#ff6fa5' },
  lavender: { label:'💜 Lavender', bg:'#e3d6ff', card:'#fff', text:'#5c4590', accent:'#b28dff' },
  mint:     { label:'🩵 Mint',     bg:'#d2f5e3', card:'#fff', text:'#2c7a58', accent:'#4fd8a8' },
  butter:   { label:'💛 Butter',   bg:'#fff2b8', card:'#fff', text:'#8a6d10', accent:'#ffcf3f' },
  peach:    { label:'🍑 Peach',    bg:'#ffe0cc', card:'#fff', text:'#a85a2f', accent:'#ff9d6c' },
  sky:      { label:'🩵 Sky',      bg:'#d6eeff', card:'#fff', text:'#2b5f8a', accent:'#5bb8f5' },
  clean:    { label:'🤍 Clean',    bg:'#ffffff', card:'#fff', text:'#4a3b52', accent:'#ff6fa5' },
};
// Tambahkan drawBg & drawDeco default ke solid themes
Object.values(SOLID_THEMES).forEach(t => {
  t.drawBg = function(ctx,W,H){
    ctx.fillStyle=this.bg; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=this.accent; ctx.lineWidth=3;
    ctx.setLineDash([10,8]); ctx.strokeRect(10,10,W-20,H-20); ctx.setLineDash([]);
  };
  t.drawDeco = function(ctx,W,H){
    const glyphs=['♡','✦','✧','☆'];
    [[28,28],[W-28,28],[28,H-40],[W-28,H-40]].forEach(([x,y],i)=>{
      ctx.font='20px sans-serif'; ctx.fillStyle=this.accent;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(glyphs[i%glyphs.length], x, y);
    });
    ctx.font="700 20px 'Caveat',Georgia,serif";
    ctx.fillStyle=this.text; ctx.textAlign='center';
    ctx.fillText('caca booth ✨', W/2, H-10);
  };
});

// =====================================================================
// 🖼️  CUSTOM FRAME TEMPLATES — ISI LINK GAMBAR KAMU DI SINI
// =====================================================================
//
//  CARA PAKAI:
//  1. Upload gambar frame kamu ke GitHub repo (folder /frames/)
//  2. Ganti URL di bawah dengan link raw GitHub gambarmu
//     Format link raw GitHub:
//     https://raw.githubusercontent.com/USERNAME/REPO/main/frames/NAMAFILE.png
//
//  SYARAT GAMBAR:
//  - Format: PNG dengan background TRANSPARAN (bagian tengah kosong/transparan)
//    supaya foto kamu keliatan di balik frame
//  - Ukuran disarankan: 800x1200px (portrait) atau 1200x800px (landscape)
//  - File boleh .png atau .webp
//
//  ⚠️  Kalau gambar belum ada, biarkan URL-nya seperti ini →
//      nanti tampilannya pakai warna solid dulu sebagai placeholder
//
// =====================================================================

const CUSTOM_FRAME_URLS = {
  // ┌─────────────────────────────────────────────────────────────┐
  // │  GANTI 4 LINK DI BAWAH INI DENGAN LINK GAMBAR FRAMEMU      │
  // └─────────────────────────────────────────────────────────────┘

  custom1: 'https://raw.githubusercontent.com/USERNAME/REPO/main/frames/frame1.png',
  // ↑ Template 1 — ganti USERNAME, REPO, dan nama file

  custom2: 'https://raw.githubusercontent.com/USERNAME/REPO/main/frames/frame2.png',
  // ↑ Template 2 — ganti USERNAME, REPO, dan nama file

  custom3: 'https://raw.githubusercontent.com/USERNAME/REPO/main/frames/frame3.png',
  // ↑ Template 3 — ganti USERNAME, REPO, dan nama file

  custom4: 'https://raw.githubusercontent.com/USERNAME/REPO/main/frames/frame4.png',
  // ↑ Template 4 — ganti USERNAME, REPO, dan nama file
};

// ── Label & warna teks untuk tiap custom frame ──────────────────
// Ganti label, warna teks (text), dan warna aksen (accent) sesuai warna gambar framemu
const CUSTOM_FRAME_META = {
  custom1: { label: '🖼️ Tema 1', text: '#4a3b52', accent: '#ff6fa5', card: '#fff' },
  custom2: { label: '🖼️ Tema 2', text: '#4a3b52', accent: '#b28dff', card: '#fff' },
  custom3: { label: '🖼️ Tema 3', text: '#4a3b52', accent: '#4fd8a8', card: '#fff' },
  custom4: { label: '🖼️ Tema 4', text: '#4a3b52', accent: '#ffcf3f', card: '#fff' },
};

// ── Cache gambar frame agar tidak load berulang ──────────────────
const _frameCache = {};
function loadFrameImg(url) {
  if (_frameCache[url]) return Promise.resolve(_frameCache[url]);
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => { _frameCache[url] = img; res(img); };
    img.onerror = () => res(null); // kalau gagal load, skip aja
    img.src = url;
  });
}

// ── Buat objek template untuk tiap custom frame ─────────────────
const CUSTOM_FRAMES = {};
['custom1','custom2','custom3','custom4'].forEach(key => {
  const url  = CUSTOM_FRAME_URLS[key];
  const meta = CUSTOM_FRAME_META[key];

  CUSTOM_FRAMES[key] = {
    label:  meta.label,
    bg:     '#ffffff',       // background putih di belakang frame
    card:   meta.card,
    text:   meta.text,
    accent: meta.accent,
    _frameUrl: url,

    // background putih bersih — gambar frame ditimpa di drawDeco
    drawBg(ctx, W, H) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
    },

    // gambar frame di ATAS semua foto (dipanggil setelah foto digambar)
    drawDeco(ctx, W, H) {
      const frameUrl = this._frameUrl;
      if (!frameUrl || frameUrl.includes('USERNAME')) {
        // Placeholder: border dashed warna aksen + label
        ctx.strokeStyle = this.accent;
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 8]);
        ctx.strokeRect(12, 12, W - 24, H - 24);
        ctx.setLineDash([]);
        ctx.fillStyle = this.accent + '22';
        ctx.fillRect(0, 0, W, 36);
        ctx.fillRect(0, H - 36, W, 36);
        ctx.fillStyle = this.text;
        ctx.font = "700 16px 'Caveat',Georgia,serif";
        ctx.textAlign = 'center';
        ctx.fillText('↑ upload gambar framemu ke GitHub ↑', W / 2, 24);
        ctx.fillText('caca booth ✨', W / 2, H - 12);
        return;
      }

      // Gambar frame PNG di atas seluruh canvas (full size)
      const img = _frameCache[frameUrl];
      if (img) {
        ctx.drawImage(img, 0, 0, W, H);
      }

      // Footer nama
      ctx.font = "700 20px 'Caveat',Georgia,serif";
      ctx.fillStyle = this.text;
      ctx.textAlign = 'center';
      ctx.fillText('caca booth ✨', W / 2, H - 10);
    },

    // Pre-load gambar frame saat template dipilih
    preload() {
      if (this._frameUrl && !this._frameUrl.includes('USERNAME')) {
        loadFrameImg(this._frameUrl);
      }
    },
  };
});

// ── Pre-load semua frame di background saat halaman dibuka ───────
window.addEventListener('load', () => {
  Object.values(CUSTOM_FRAMES).forEach(t => t.preload());
});

const ALL_THEMES = { ...TEMPLATES, ...SOLID_THEMES, ...CUSTOM_FRAMES };

// =====================================================================
// ILLUSTRATED DRAWING FUNCTIONS
// =====================================================================

function drawCloud(ctx, cx, cy, rw, rh){
  ctx.fillStyle='rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx-rw*0.45, cy+rh*0.1, rw*0.6, rh*0.75, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx+rw*0.45, cy+rh*0.12, rw*0.55, rh*0.7, 0, 0, Math.PI*2); ctx.fill();
}

function drawCapybara(ctx, x, y, size){
  const s = size/60;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // tubuh
  ctx.fillStyle='#b5935a';
  ctx.beginPath(); ctx.ellipse(30,40,28,20,0,0,Math.PI*2); ctx.fill();
  // kepala
  ctx.fillStyle='#c9a96e';
  ctx.beginPath(); ctx.ellipse(30,18,20,16,0,0,Math.PI*2); ctx.fill();
  // hidung besar khas capybara
  ctx.fillStyle='#a07848';
  ctx.beginPath(); ctx.ellipse(30,22,10,7,0,0,Math.PI*2); ctx.fill();
  // mata
  ctx.fillStyle='#2a1a08';
  ctx.beginPath(); ctx.arc(22,14,3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(38,14,3,0,Math.PI*2); ctx.fill();
  // telinga
  ctx.fillStyle='#c9a96e';
  ctx.beginPath(); ctx.ellipse(14,6,5,7,-.4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(46,6,5,7,.4,0,Math.PI*2); ctx.fill();
  // kaki
  ctx.fillStyle='#b5935a';
  [[10,56],[24,58],[36,58],[50,56]].forEach(([lx,ly])=>{
    ctx.beginPath(); ctx.ellipse(lx,ly,6,5,0,0,Math.PI*2); ctx.fill();
  });
  // bunga kecil di kepala (lucu!)
  ctx.fillStyle='#ff9ecd';
  ctx.beginPath(); ctx.arc(30,4,5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(30,4,2.5,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawPaw(ctx, x, y, size, color){
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fill();
  const toes=[[x-size*0.8,y-size*0.9],[x,y-size*1.1],[x+size*0.8,y-size*0.9]];
  toes.forEach(([tx,ty])=>{ ctx.beginPath(); ctx.arc(tx,ty,size*0.5,0,Math.PI*2); ctx.fill(); });
}

function drawFlower(ctx, cx, cy, r, petalColor, centerColor){
  ctx.fillStyle=petalColor;
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    ctx.beginPath(); ctx.ellipse(cx+Math.cos(a)*r*0.9, cy+Math.sin(a)*r*0.9, r*0.55, r*0.35, a, 0, Math.PI*2); ctx.fill();
  }
  ctx.fillStyle=centerColor;
  ctx.beginPath(); ctx.arc(cx,cy,r*0.4,0,Math.PI*2); ctx.fill();
}

function drawHibiscus(ctx, cx, cy, size){
  const s=size/36; ctx.save(); ctx.translate(cx+size/2,cy+size/2); ctx.scale(s,s);
  const petals=['#ff3a3a','#ff6060','#ff8080','#ff5050','#ff2a2a'];
  for(let i=0;i<5;i++){
    ctx.save(); ctx.rotate(i*Math.PI*2/5);
    ctx.fillStyle=petals[i];
    ctx.beginPath(); ctx.ellipse(0,-22,8,18,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle='#ffdd44';
  ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ff9900';
  ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawWaveBar(ctx, x, y, w, h){
  const g=ctx.createLinearGradient(0,y,0,y+h);
  g.addColorStop(0,'rgba(0,100,180,0.55)'); g.addColorStop(1,'rgba(0,180,220,0.25)');
  ctx.fillStyle=g;
  ctx.beginPath(); ctx.moveTo(x,y+20);
  for(let i=0;i<=w;i+=8){ ctx.lineTo(x+i, y+20+Math.sin(i*0.08)*8); }
  ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.closePath(); ctx.fill();
}

function drawSpiral(ctx, cx, cy, r, color){
  ctx.strokeStyle=color; ctx.lineWidth=2.5;
  ctx.beginPath();
  for(let a=0;a<Math.PI*6;a+=0.15){
    const sr=r*(a/(Math.PI*6));
    const sx=cx+Math.cos(a)*sr, sy=cy+Math.sin(a)*sr;
    a===0 ? ctx.moveTo(sx,sy) : ctx.lineTo(sx,sy);
  }
  ctx.stroke();
}

function drawSunflower(ctx, cx, cy, size){
  const s=size/38; ctx.save(); ctx.translate(cx,cy); ctx.scale(s,s);
  // kelopak kuning
  ctx.fillStyle='#f5c500';
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    ctx.save(); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0,-22,6,12,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  // cakram coklat
  ctx.fillStyle='#7a4500';
  ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#5a3000';
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    ctx.beginPath(); ctx.arc(Math.cos(a)*6,Math.sin(a)*6,3,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawLilyPink(ctx, cx, cy, size){
  const s=size/40; ctx.save(); ctx.translate(cx,cy); ctx.scale(s,s);
  const colors=['#ff9ecd','#ff7bbd','#ffb8da','#ff6fa5','#ffd6ee'];
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5 - Math.PI/2;
    ctx.fillStyle=colors[i];
    ctx.beginPath();
    ctx.ellipse(Math.cos(a)*18,Math.sin(a)*18,9,16,a,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle='#fff0fa';
  ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ffb8da';
  ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
  // putik
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;
    ctx.strokeStyle='#ff6fa5'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*14,Math.sin(a)*14); ctx.stroke();
    ctx.fillStyle='#ffdd44';
    ctx.beginPath(); ctx.arc(Math.cos(a)*14,Math.sin(a)*14,2.5,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawLeafSmall(ctx, cx, cy, size, angle){
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
  ctx.fillStyle='#6abf45';
  ctx.beginPath();
  ctx.moveTo(0,-size); ctx.bezierCurveTo(size,-size*0.5,size,size*0.5,0,size);
  ctx.bezierCurveTo(-size,size*0.5,-size,-size*0.5,0,-size);
  ctx.fill();
  ctx.strokeStyle='#4a9a28'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,-size); ctx.lineTo(0,size); ctx.stroke();
  ctx.restore();
}

// ── SATE ──
function drawSate(ctx, x, y, size, angle=0){
  const s=size/54; ctx.save(); ctx.translate(x+size*0.5,y+size*0.5); ctx.rotate(angle); ctx.scale(s,s);
  // tusuk
  ctx.strokeStyle='#c8a060'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(0,-50); ctx.lineTo(0,50); ctx.stroke();
  // potongan daging
  const meatY=[-30,-8,14];
  meatY.forEach(my=>{
    ctx.fillStyle='#c85820';
    ctx.beginPath(); ctx.ellipse(0,my,12,10,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#e87040';
    ctx.beginPath(); ctx.ellipse(-2,my-2,7,6,0,0,Math.PI*2); ctx.fill();
    // saus
    ctx.fillStyle='rgba(180,40,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0,my+6,12,3,0,0,Math.PI*2); ctx.fill();
  });
  // asap
  for(let i=0;i<3;i++){
    ctx.strokeStyle=`rgba(180,180,160,${0.3-i*0.08})`;
    ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-4+i*4,-50);
    ctx.quadraticCurveTo(8-i*4,-65,-4+i*4,-78);
    ctx.stroke();
  }
  ctx.restore();
}

// ── PANGSIT ──
function drawPangsit(ctx, x, y, size){
  const s=size/50; ctx.save(); ctx.translate(x+size*0.5,y+size*0.5); ctx.scale(s,s);
  // badan pangsit
  ctx.fillStyle='#fff8e0';
  ctx.beginPath();
  ctx.moveTo(-22,10); ctx.quadraticCurveTo(-25,-10,0,-22);
  ctx.quadraticCurveTo(25,-10,22,10);
  ctx.quadraticCurveTo(0,28,-22,10);
  ctx.fill();
  ctx.strokeStyle='#d4b060'; ctx.lineWidth=1.5; ctx.stroke();
  // lipatan atas (khas pangsit)
  ctx.fillStyle='#fff0c0';
  ctx.beginPath();
  ctx.moveTo(-14,-8); ctx.quadraticCurveTo(0,-18,14,-8);
  ctx.quadraticCurveTo(0,-4,-14,-8);
  ctx.fill();
  // garis lipatan
  for(let i=-10;i<=10;i+=5){
    ctx.strokeStyle='rgba(180,140,60,0.35)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(i,-12); ctx.lineTo(i-2,8); ctx.stroke();
  }
  // warna isi
  ctx.fillStyle='rgba(220,80,40,0.2)';
  ctx.beginPath(); ctx.ellipse(0,4,14,8,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// ── DIMSUM ──
function drawDimsum(ctx, x, y, size){
  const s=size/54; ctx.save(); ctx.translate(x+size*0.5,y+size*0.5); ctx.scale(s,s);
  // alas keranjang bambu
  ctx.fillStyle='#c8a460';
  ctx.beginPath(); ctx.ellipse(0,20,28,8,0,0,Math.PI*2); ctx.fill();
  // keranjang bambu
  ctx.fillStyle='#e8c880';
  ctx.beginPath(); ctx.rect(-26,-8,52,28); ctx.fill();
  // garis bambu horizontal
  for(let by=-4;by<=16;by+=8){
    ctx.strokeStyle='rgba(140,100,40,0.35)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-26,by); ctx.lineTo(26,by); ctx.stroke();
  }
  // garis bambu vertikal
  for(let bx=-20;bx<=20;bx+=10){
    ctx.strokeStyle='rgba(140,100,40,0.2)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(bx,-8); ctx.lineTo(bx,20); ctx.stroke();
  }
  // tutup keranjang (dome)
  ctx.fillStyle='#f0d89a';
  ctx.beginPath(); ctx.ellipse(0,-8,26,16,0,0,Math.PI,true); ctx.fill();
  ctx.strokeStyle='#c8a460'; ctx.lineWidth=1.5; ctx.stroke();
  // tombol di atas tutup
  ctx.fillStyle='#e8b460';
  ctx.beginPath(); ctx.ellipse(0,-22,5,4,0,0,Math.PI*2); ctx.fill();
  // uap
  for(let i=0;i<2;i++){
    ctx.strokeStyle=`rgba(200,200,180,0.5)`;
    ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(-6+i*12,-26);
    ctx.quadraticCurveTo(-2+i*12,-34,-6+i*12,-42);
    ctx.stroke();
  }
  ctx.restore();
}
