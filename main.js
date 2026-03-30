// ── Backend config ──────────────────────────────────────────────────────────
// In production, set this to your server URL e.g. 'https://api.quantumsnippet.xyz'
// In development with the server running locally, leave as empty string (same-origin).
const API_BASE = '';

// ── Scroll progress bar ──────────────────────────────────────────────────────
window.addEventListener('scroll', function() {
  var p = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  document.getElementById('bar').style.width = p + '%';
});

// ── Scroll reveal animations ─────────────────────────────────────────────────
var ro = new IntersectionObserver(function(entries) {
  entries.forEach(function(e, i) {
    if (e.isIntersecting) setTimeout(function() { e.target.classList.add('in'); }, i * 80);
  });
}, { threshold: 0.1 });
document.querySelectorAll('.rv').forEach(function(el) { ro.observe(el); });

// ── Mobile menu ──────────────────────────────────────────────────────────────
function toggleM() { document.getElementById('mm').classList.toggle('open'); }

// ── Dark / Light mode ────────────────────────────────────────────────────────
var dark = true;
function toggleMode() {
  dark = !dark;
  document.body.classList.toggle('light', !dark);
  document.getElementById('modeBtn').textContent = dark ? 'Light Mode' : 'Dark Mode';
  try { localStorage.setItem('qm', dark ? 'd' : 'l'); } catch(e) {}
}
try {
  if (localStorage.getItem('qm') === 'l') {
    dark = false;
    document.body.classList.add('light');
    document.getElementById('modeBtn').textContent = 'Dark Mode';
  }
} catch(e) {}

// ── Language switcher ────────────────────────────────────────────────────────
function toggleL() { document.getElementById('ldrop').classList.toggle('open'); }
document.addEventListener('click', function(e) {
  if (!e.target.closest('.lw')) document.getElementById('ldrop').classList.remove('open');
});
var langs = {
  en: { d: 'Fast, beautiful, conversion-focused websites for small businesses across the WORLD. Delivered in 7 days - guaranteed.', b1: 'Book a Free 30-Min Call', b2: 'See Our Work' },
  es: { d: 'Sitios web rapidos y hermosos. En 7 dias garantizado.', b1: 'Reserva una Llamada Gratis', b2: 'Ver Proyectos' },
  fr: { d: 'Sites web rapides et beaux. Livraison en 7 jours garanti.', b1: 'Reserver un Appel Gratuit', b2: 'Voir nos Projets' },
  pt: { d: 'Sites rapidos e bonitos. Em 7 dias garantido.', b1: 'Agendar Chamada Gratis', b2: 'Ver Projetos' }
};
function setL(l, el) {
  var t = langs[l];
  document.getElementById('ldrop').classList.remove('open');
  document.getElementById('lbtn').textContent = l.toUpperCase();
  document.getElementById('hd').textContent = t.d;
  document.getElementById('hb1').textContent = t.b1;
  document.getElementById('hb2').textContent = t.b2;
  document.querySelectorAll('.lopt').forEach(function(o) { o.classList.remove('on'); });
  el.classList.add('on');
}

// ── Animated counters ────────────────────────────────────────────────────────
var counted = false;
function runC() {
  if (counted) return;
  var box = document.getElementById('counters');
  if (!box || box.getBoundingClientRect().top > window.innerHeight) return;
  counted = true;
  document.querySelectorAll('[data-target]').forEach(function(el) {
    var target = parseInt(el.getAttribute('data-target'));
    var sfx = el.getAttribute('data-sfx') || '';
    var start = null, dur = 1800;
    (function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(ease * target) + sfx;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target + sfx;
    })(performance.now());
  });
}
window.addEventListener('scroll', runC);
setTimeout(runC, 800);

// ── Before/After image sliders ───────────────────────────────────────────────
function initBA(wid, bid, lid, hid) {
  var w = document.getElementById(wid), b = document.getElementById(bid),
      l = document.getElementById(lid), h = document.getElementById(hid);
  if (!w || !b || !l || !h) return;
  var drag = false;
  function set(pct) {
    pct = Math.max(5, Math.min(95, pct));
    b.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
    l.style.left = pct + '%';
    h.style.left = pct + '%';
  }
  set(50);
  function gp(e) { var r = w.getBoundingClientRect(); return ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * 100; }
  w.addEventListener('mousedown', function(e) { drag = true; set(gp(e)); e.preventDefault(); });
  w.addEventListener('touchstart', function(e) { drag = true; set(gp(e)); }, { passive: true });
  window.addEventListener('mousemove', function(e) { if (drag) set(gp(e)); });
  window.addEventListener('touchmove', function(e) { if (drag) set(gp(e)); }, { passive: true });
  window.addEventListener('mouseup', function() { drag = false; });
  window.addEventListener('touchend', function() { drag = false; });
}
initBA('sl1', 'b1', 'l1', 'h1');
initBA('sl2', 'b2', 'l2', 'h2');
initBA('sl3', 'b3', 'l3', 'h3');

// ── Booking calendar ─────────────────────────────────────────────────────────
var now = new Date(), cy = now.getFullYear(), cm = now.getMonth(), selD = null, selT = null;
var MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var TM = ['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM'];
var bookedSlots = {};

function fetchBookedSlots(cb) {
  var key = cy + '-' + cm;
  fetch(API_BASE + '/api/bookings/slots?month=' + key)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      bookedSlots = {};
      (d.booked || []).forEach(function(b) { bookedSlots[b.date_key + '-' + b.time_slot] = true; });
      if (cb) cb();
    })
    .catch(function() { if (cb) cb(); });
}

function rCal() {
  document.getElementById('calLbl').textContent = MN[cm] + ' ' + cy;
  var g = document.getElementById('cagd'); g.innerHTML = '';
  var first = new Date(cy, cm, 1).getDay(), days = new Date(cy, cm + 1, 0).getDate();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  for (var i = 0; i < first; i++) { var d = document.createElement('div'); d.className = 'cd of'; g.appendChild(d); }
  for (var day = 1; day <= days; day++) {
    var d = document.createElement('div');
    var ts = new Date(cy, cm, day).getTime();
    var dow = new Date(cy, cm, day).getDay();
    var k = cy + '-' + cm + '-' + day;
    if (ts < today || dow === 0 || dow === 6) { d.className = 'cd of'; }
    else {
      d.className = 'cd av' + (ts === today ? ' td' : '') + (selD === k ? ' sl' : '');
      (function(key, dy) { d.onclick = function() { selD = key; selT = null; rCal(); rSlots(dy); }; })(k, day);
    }
    d.textContent = day; g.appendChild(d);
  }
}

function rSlots(day) {
  document.getElementById('slt').textContent = MN[cm] + ' ' + day + ' - Pick a Time';
  var g = document.getElementById('slg'); g.innerHTML = '';
  TM.forEach(function(t) {
    var slotKey = selD + '-' + t;
    var isBooked = !!bookedSlots[slotKey];
    var s = document.createElement('div');
    s.className = 'sli' + (isBooked ? ' sli-booked' : '');
    s.textContent = t + (isBooked ? ' (taken)' : '');
    if (!isBooked) {
      s.onclick = function() {
        document.querySelectorAll('.sli').forEach(function(x) { x.classList.remove('sl'); });
        s.classList.add('sl'); selT = t;
        document.getElementById('bn').style.display = 'block';
        document.getElementById('be').style.display = 'block';
        document.getElementById('bkb').style.display = 'block';
      };
    } else {
      s.style.opacity = '0.4';
      s.style.cursor = 'not-allowed';
      s.style.textDecoration = 'line-through';
    }
    g.appendChild(s);
  });
}

function chM(d) {
  cm += d;
  if (cm > 11) { cm = 0; cy++; }
  if (cm < 0) { cm = 11; cy--; }
  fetchBookedSlots(rCal);
}

function confBook() {
  var n = document.getElementById('bn').value.trim(), e = document.getElementById('be').value.trim();
  var okEl = document.getElementById('bok');
  var errEl = document.getElementById('bokErr');
  if (!n || !e || !e.includes('@')) { alert('Please enter your name and a valid email.'); return; }
  if (!selD || !selT) { alert('Please select a date and time.'); return; }
  var btn = document.getElementById('bkb');
  btn.textContent = 'Booking…'; btn.disabled = true;
  okEl.style.display = 'none';
  errEl.style.display = 'none';
  fetch(API_BASE + '/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: n, email: e, dateKey: selD, timeSlot: selT })
  })
  .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
  .then(function(res) {
    if (res.ok) {
      okEl.style.display = 'block';
      okEl.innerHTML = '✓ Booked! Confirmation sent to ' + e;
      errEl.style.display = 'none';
      btn.style.display = 'none';
      document.getElementById('bn').style.display = 'none';
      document.getElementById('be').style.display = 'none';
    } else {
      btn.textContent = 'Confirm Free Consultation'; btn.disabled = false;
      errEl.style.display = 'block';
      errEl.innerHTML = (res.data.error || 'Something went wrong while booking.') + ' Please message us on <a href="https://www.instagram.com/quantum_snippet/?__pwa=1" target="_blank" rel="noopener noreferrer">Instagram</a> and we will help you book your call.';
    }
  })
  .catch(function() {
    btn.textContent = 'Confirm Free Consultation'; btn.disabled = false;
    errEl.style.display = 'block';
    errEl.innerHTML = 'Could not connect to the booking server. Please message us on <a href="https://www.instagram.com/quantum_snippet/?__pwa=1" target="_blank" rel="noopener noreferrer">Instagram</a> or <a href="https://wa.me/2205219970?text=Hi%20Quantum%20Snippet%2C%20I%20tried%20to%20book%20a%20call%20on%20your%20website%20but%20it%20didn%27t%20work.%20Can%20you%20help%20me%20book%20it%3F" target="_blank" rel="noopener noreferrer">WhatsApp</a> and we will help you book your call.';
  });
}

fetchBookedSlots(rCal);

// ── Contact form ─────────────────────────────────────────────────────────────
function subForm() {
  var n = document.getElementById('cfn').value.trim(), e = document.getElementById('cfe').value.trim();
  var b = document.getElementById('cfb2').value.trim(), s = document.getElementById('cfs').value, m = document.getElementById('cfm').value.trim();
  var btn = document.getElementById('cfbtn');
  var okEl = document.getElementById('cfok'), errEl = document.getElementById('cfer');
  if (!n || !e || !e.includes('@')) return;
  btn.textContent = 'Sending...'; btn.disabled = true;
  okEl.style.display = 'none'; errEl.style.display = 'none';
  fetch(API_BASE + '/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: n, email: e, business: b, service: s, message: m })
  })
  .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
  .then(function(res) {
    if (res.ok) {
      okEl.textContent = 'Message sent! We will be in touch within 24 hours.';
      okEl.style.display = 'block';
      btn.textContent = 'Send My Free Quote Request'; btn.disabled = false;
      document.getElementById('cfn').value = ''; document.getElementById('cfe').value = '';
      document.getElementById('cfb2').value = ''; document.getElementById('cfm').value = '';
      document.getElementById('cfs').value = '';
    } else {
      errEl.textContent = res.data.error || 'Something went wrong. Please try again.';
      errEl.style.display = 'block';
      btn.textContent = 'Send My Free Quote Request'; btn.disabled = false;
    }
  })
  .catch(function() {
    errEl.textContent = 'Could not connect. Please email us directly.';
    errEl.style.display = 'block';
    btn.textContent = 'Send My Free Quote Request'; btn.disabled = false;
  });
}

// ── Admin modal ──────────────────────────────────────────────────────────────
document.getElementById('qs-admin-modal').addEventListener('click', function(e) {
  if (e.target === this) qsCloseModal();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { qsCloseModal(); return; }
  var tag = document.activeElement.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.key === 'q' || e.key === 'Q') openQsModal();
});
function openQsModal() {
  var m = document.getElementById('qs-admin-modal');
  m.style.display = 'flex';
  setTimeout(function() { document.getElementById('qs-admin-pw').focus(); }, 80);
  document.getElementById('qs-admin-err').style.display = 'none';
  document.getElementById('qs-admin-pw').value = '';
}
function qsCloseModal() {
  document.getElementById('qs-admin-modal').style.display = 'none';
}
function qsAdminLogin() {
  var token = document.getElementById('qs-admin-pw').value.trim();
  if (!token) return;
  var errEl = document.getElementById('qs-admin-err');
  errEl.style.display = 'none';
  fetch(API_BASE + '/api/admin/stats', { headers: { 'x-admin-token': token } })
    .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function() {
      qsCloseModal();
      window.open('/admin.html', '_blank');
    })
    .catch(function() {
      errEl.style.display = 'block';
      document.getElementById('qs-admin-pw').value = '';
      document.getElementById('qs-admin-pw').focus();
    });
}
