/* =========================================================
   MediTurn · app.js
   Autores: Juan Luis Jimenez · Raider Valdez Ramón · Francisco Antonio Vasquez Henriquez
   UNPHU · INF-275-02 Ingeniería de Software II
   Un solo archivo para login.html e index.html. Se comunica con Flask mediante /api/...
   ========================================================= */
(() => {
'use strict';

/* ---------- Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => 'RD$ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = s => parseFloat(String(s).replace(/[^\d.]/g, '')) || 0;
const fdate = d => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '';
const f12 = t => { if (!t) return ''; const [h, m] = String(t).split(':').map(Number); return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const today = () => addDays(0);
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const st = s => `<span class="st st-${esc(s)}">${esc(s)}</span>`;
const maskD = (v, p) => { const d = v.replace(/\D/g, ''); let o = '', i = 0; for (const c of p) { if (i >= d.length) break; o += c === '9' ? d[i++] : c; } return o; };
const MASKS = { cedula: '999-9999999-9', telefono: '999-999-9999', rnc: '9-99-99999-9' };
const RX = { cedula: /^\d{3}-\d{7}-\d$/, telefono: /^(809|829|849)-\d{3}-\d{4}$/, rnc: /^\d-\d{2}-\d{5}-\d$/, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ };
const NOMBRE = '[A-Za-zÁÉÍÓÚáéíóúÑñÜü ]{2,30}';

const toast = (msg, type = 'primary') => {
  const c = $('#toasts'); if (!c) return alert(msg);
  const el = document.createElement('div');
  el.className = `toast align-items-center text-bg-${type} border-0`; el.setAttribute('role', 'alert');
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(msg)}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>`;
  c.append(el); new bootstrap.Toast(el, { delay: 4500 }).show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
};

const api = async (url, method = 'GET', body) => {
  try {
    const r = await fetch('/api' + url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401 && !url.startsWith('/login')) { location.href = '/login'; return { ok: false }; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok && !Array.isArray(j)) j.ok = false;
    return j;
  } catch (e) { toast('No se pudo conectar con el servidor.', 'danger'); return { ok: false }; }
};

/* ---------- Validación (mensajes VAL-xx) ---------- */
const setErr = (el, msg) => {
  el.classList.toggle('is-invalid', !!msg);
  let f = el.parentElement.querySelector(':scope > .invalid-feedback');
  if (!f && msg) { f = document.createElement('div'); f.className = 'invalid-feedback'; el.after(f); }
  if (f) { f.textContent = msg || ''; f.style.display = msg ? 'block' : ''; }
};
const lbl = el => (el.closest('.form-floating,[class*="col"]')?.querySelector('label')?.textContent || el.name || 'El campo').replace('*', '').trim();
const validate = form => {
  let ok = true, first;
  $$('input,select,textarea', form).forEach(el => {
    if (['hidden', 'radio', 'checkbox', 'file'].includes(el.type) || el.disabled || (el.readOnly && !el.required)) return;
    const v = el.value.trim(); let m = '';
    if (el.required && !v) m = `El campo ${lbl(el)} es obligatorio.`;
    else if (v) {
      if (el.dataset.mask && !RX[el.dataset.mask].test(v)) m = `${lbl(el)} no tiene el formato correcto. Formato esperado: ${MASKS[el.dataset.mask]}.`;
      else if (el.type === 'email' && !RX.email.test(v)) m = 'Ingrese un correo válido (usuario@dominio.ext).';
      else if (el.minLength > 0 && v.length < el.minLength) m = `${lbl(el)} debe tener al menos ${el.minLength} caracteres.`;
      else if (el.pattern && !new RegExp('^(?:' + el.pattern + ')$').test(v)) m = `${lbl(el)} no tiene el formato correcto.`;
      else if (el.type === 'number' && (num(v) < +el.min || num(v) > +el.max)) m = `El monto debe ser mayor que 0 y no superar ${money(el.max)}.`;
    }
    setErr(el, m); if (m) { ok = false; first ??= el; }
  });
  first?.focus(); return ok;
};

/* ---------- Tema claro / oscuro ---------- */
let chart;
const setTheme = t => {
  document.documentElement.setAttribute('data-bs-theme', t); localStorage.setItem('mt-theme', t);
  $$('.theme-toggle i').forEach(i => i.className = t === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill');
  if (chart) { chart.options.plugins.legend.labels.color = css('--text'); chart.update(); }
};
setTheme(localStorage.getItem('mt-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
document.addEventListener('click', e => { if (e.target.closest('.theme-toggle')) setTheme(document.documentElement.dataset.bsTheme === 'dark' ? 'light' : 'dark'); });
document.addEventListener('input', e => {
  const t = e.target; if (t.dataset?.mask) t.value = maskD(t.value, MASKS[t.dataset.mask]);
  if (t.classList?.contains('is-invalid')) setErr(t, '');
});

/* ---------- Inicio de sesión (ENT-01) ---------- */
function initLogin() {
  const f = $('#loginForm'); if (!f) return false;
  const u = $('#usuario'), err = $('#loginError'), btn = f.querySelector('[type=submit]'), html = btn.innerHTML;
  u.value = localStorage.getItem('mt-user') || ''; $('#recordar').checked = !!u.value;
  const showErr = m => { err.textContent = m; err.classList.remove('d-none'); };
  $('#togglePass').onclick = () => { const p = $('#contrasena'), s = p.type === 'password'; p.type = s ? 'text' : 'password'; $('#togglePass i').className = s ? 'bi bi-eye-slash' : 'bi bi-eye'; };
  f.addEventListener('submit', async e => {
    e.preventDefault(); err.classList.add('d-none');
    if (!validate(f)) return;
    const p = $('#contrasena').value;
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,20}$/.test(p)) return showErr('La contraseña debe tener 8 a 20 caracteres, una mayúscula, una minúscula y un número.');
    btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Ingresando...';
    const r = await api('/login', 'POST', { usuario: u.value.trim(), contrasena: p });
    if (r.ok) { $('#recordar').checked ? localStorage.setItem('mt-user', u.value.trim()) : localStorage.removeItem('mt-user'); location.href = '/'; return; }
    showErr(r.mensaje || 'Usuario o contraseña incorrectos.');
    $('#intentosInfo').textContent = r.intentos_restantes != null ? `Intentos restantes: ${r.intentos_restantes}` : '';
    btn.disabled = false; btn.innerHTML = html; f.animate([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }], 250);
  });
  return true;
}

/* ---------- Estado global ---------- */
const ROLE = document.body.dataset.role || '';
const STAFF = ['Médico', 'Recepcionista', 'Administrador'].includes(ROLE);
const ESTADOS = ['Pendiente', 'Reprogramada', 'Atendida', 'Cancelada'];
const ABIERTA = c => c.estado === 'Pendiente' || c.estado === 'Reprogramada';
const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MODS = { dashboard: 'Tablero', citas: 'Citas', pacientes: 'Pacientes', medicos: 'Médicos', especialidades: 'Especialidades', horarios: 'Horarios', pagos: 'Pagos', reportes: 'Reportes', usuarios: 'Usuarios y roles', configuracion: 'Configuración', acerca: 'Acerca del sistema' };
const PL = { paciente: 'pacientes', medico: 'medicos', especialidad: 'especialidades', usuario: 'usuarios' };
let CFG = {}, CAT = { esp: [], med: [] }, DATA = {}, CITAS = [], DASH = [], PAC = null, PAGO = null, CAMBIO = null;

const showTab = sel => { const b = $(`.nav-pills [data-bs-target="${sel}"]`); if (b) bootstrap.Tab.getOrCreateInstance(b).show(); };
const countUp = (el, n, fmt = v => Math.round(v)) => { const t0 = performance.now(); const step = t => { const p = Math.min((t - t0) / 700, 1); el.textContent = fmt(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
const rowsOrEmpty = (rows, cols) => rows || `<tr><td colspan="${cols}" class="text-center text-secondary py-4">Sin registros.</td></tr>`;

async function loadCats() {
  const r = await api('/catalogos'); CAT.esp = r.especialidades || []; CAT.med = r.medicos || [];
  if ($('#cEsp')) fillEsp();
}
function fillEsp() {
  const act = CAT.esp.filter(e => e.estado === 'Activa' && CAT.med.some(m => m.id_especialidad == e.id && m.estado === 'Activo'));
  $('#cEsp').innerHTML = '<option value="">Seleccione...</option>' + act.map(e => `<option value="${e.id}">${esc(e.nombre)}</option>`).join('');
}
const fillMed = (sel, esp, first = 'Seleccione...') => {
  sel.innerHTML = `<option value="">${first}</option>` + CAT.med.filter(m => (!esp || m.id_especialidad == esp) && m.estado === 'Activo').map(m => `<option value="${m.id}">Dr(a). ${esc(m.nombre)}</option>`).join('');
};

/* ---------- Navegación por módulos ---------- */
function route() {
  let m = (location.hash || '#dashboard').slice(1);
  const link = $(`#mainNav [data-module="${m}"]`);
  if (!link || link.classList.contains('d-none')) m = 'dashboard';
  $$('.module').forEach(s => s.classList.toggle('active', s.id === 'mod-' + m));
  $$('#mainNav .nav-link').forEach(a => a.classList.toggle('active', a.dataset.module === m));
  $('#pageTitle').textContent = MODS[m];
  bootstrap.Offcanvas.getInstance('#sidebar')?.hide();
  scrollTo({ top: 0, behavior: 'smooth' }); LOAD[m]?.();
}

/* ---------- Tablero ---------- */
async function loadDash() {
  const f = $('#dashFecha'); if (!f.value) f.value = today();
  const d = await api('/dashboard?fecha=' + f.value); if (!d.citas) return;
  DASH = d.citas; const by = e => DASH.filter(c => c.estado === e);
  countUp($('#kpiHoy'), DASH.length); countUp($('#kpiPend'), by('Pendiente').length + by('Reprogramada').length);
  countUp($('#kpiAten'), by('Atendida').length); countUp($('#kpiCanc'), by('Cancelada').length); countUp($('#kpiIng'), d.ingresos || 0, money);
  ESTADOS.forEach(e => {
    const l = by(e); $('#cnt' + e).textContent = l.length;
    $('#board-' + e).innerHTML = l.length ? l.map(c => `<div class="board-card" data-id="${c.id}"><strong>${f12(c.hora)} · ${esc(c.paciente)}</strong><small>${esc(c.medico)} · ${esc(c.especialidad)}</small></div>`).join('') : '<div class="empty"><i class="bi bi-inbox d-block fs-4"></i>Sin citas</div>';
  });
  const data = ESTADOS.map(e => by(e).length);
  if (!chart) chart = new Chart($('#chartEstados'), { type: 'doughnut', data: { labels: ESTADOS, datasets: [{ data, backgroundColor: ['#f59e0b', '#0d6efd', '#22c55e', '#ef4444'], borderWidth: 0, hoverOffset: 8 }] }, options: { cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: css('--text'), usePointStyle: true } } } } });
  else { chart.data.datasets[0].data = data; chart.update(); }
  $('#tbProximas').innerHTML = rowsOrEmpty((d.proximas || []).map(c => `<tr><td>${c.numero}</td><td>${fdate(c.fecha)} ${f12(c.hora)}</td><td>${esc(c.paciente)}</td><td>Dr(a). ${esc(c.medico)}</td><td>${esc(c.especialidad)}</td><td>${st(c.estado)}</td></tr>`).join(''), 6);
}

/* ---------- Citas ---------- */
const citaActs = c => `<button class="btn-act" data-act="print" data-id="${c.id}" title="Comprobante"><i class="bi bi-printer"></i></button>` +
  (ABIERTA(c) ? `${STAFF ? ` <button class="btn-act" data-act="done" data-id="${c.id}" title="Marcar como atendida"><i class="bi bi-check2"></i></button>` : ''} <button class="btn-act danger" data-act="change" data-id="${c.id}" title="Cancelar o reprogramar"><i class="bi bi-arrow-repeat"></i></button>` : '');
async function loadCitas() {
  const q = new URLSearchParams({ desde: $('#fcDesde').value, hasta: $('#fcHasta').value, estado: $('#fcEstado').value });
  const r = await api('/citas?' + q); CITAS = Array.isArray(r) ? r : [];
  $('#tblCitas tbody').innerHTML = CITAS.length ? CITAS.map(c => `<tr><td>${c.numero}</td><td>${fdate(c.fecha)}</td><td>${f12(c.hora)}</td><td>${esc(c.paciente)}</td><td>Dr(a). ${esc(c.medico)}</td><td>${esc(c.especialidad)}</td><td>${st(c.estado)}</td><td>${st(c.estado_pago)}</td><td class="text-end text-nowrap">${citaActs(c)}</td></tr>`).join('') : '<tr><td colspan="9" class="text-center text-secondary py-4">No hay citas para los filtros seleccionados.</td></tr>';
}
const getSlots = async (m, f) => (m && f) ? ((await api(`/cupos?id_medico=${m}&fecha=${f}`)).horas || []) : [];
async function cSlots() {
  $('#cHora').value = ''; const box = $('#cSlots');
  if (!$('#cMed').value || !$('#cFecha').value) { box.innerHTML = '<span class="text-secondary">Seleccione médico y fecha para ver los cupos.</span>'; return; }
  box.innerHTML = '<span class="text-secondary">Buscando cupos...</span>';
  const h = await getSlots($('#cMed').value, $('#cFecha').value);
  box.innerHTML = h.length ? h.map(x => `<button type="button" class="slot" data-h="${x}">${f12(x)}</button>`).join('') : '<span class="text-secondary">No hay cupos libres para esa fecha.</span>';
}
async function buscarPac() {
  const v = $('#cCedula');
  if (!RX.cedula.test(v.value)) return setErr(v, 'Cédula no tiene el formato correcto. Formato esperado: 999-9999999-9.');
  const r = await api('/paciente-por-cedula?cedula=' + v.value);
  if (r.id) { PAC = r; $('#cNombre').value = r.nombre; setErr(v, ''); } else { PAC = null; $('#cNombre').value = ''; setErr(v, 'No existe un paciente activo con esa cédula.'); }
}
async function loadHist() {
  const ced = $('#hCedula').value.trim();
  if (ROLE !== 'Paciente' && !RX.cedula.test(ced)) return setErr($('#hCedula'), 'Ingrese una cédula válida (999-9999999-9).');
  const r = await api(`/citas?cedula=${ced}&estado=${$('#hEstado').value}&historial=1`); const l = Array.isArray(r) ? r : [];
  $('#hResumen').textContent = l.length ? ESTADOS.map(e => `${e}: ${l.filter(c => c.estado === e).length}`).join('  ·  ') : 'El paciente no tiene citas registradas.';
  $('#tblHistorial tbody').innerHTML = rowsOrEmpty(l.map(c => `<tr><td>${fdate(c.fecha)}</td><td>${f12(c.hora)}</td><td>${c.numero}</td><td>Dr(a). ${esc(c.medico)}</td><td>${esc(c.especialidad)}</td><td>${st(c.estado)}</td><td>${st(c.estado_pago)}</td></tr>`).join(''), 7);
}
function openCambio(c) {
  CAMBIO = c; $('#frmCambio').reset(); $('#chId').value = c.id; $('#chReprog').classList.add('d-none'); $('#chFecha').min = today(); $('#chFecha').max = addDays(90);
  $('#chNumero').textContent = `${c.numero} · ${fdate(c.fecha)} ${f12(c.hora)}`; $('#chHora').innerHTML = '';
  bootstrap.Modal.getOrCreateInstance('#modalCambio').show();
}

/* ---------- Comprobantes y recibos imprimibles ---------- */
function printDoc(titulo, codigo, filas, nota = '') {
  const w = window.open('', '_blank', 'width=820,height=900'); if (!w) return toast('Permita las ventanas emergentes para imprimir.', 'warning');
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#0b1220}header{display:flex;justify-content:space-between;border-bottom:3px solid #0d6efd;padding-bottom:12px;font-size:13px}h1{font-size:19px;background:#0a2a63;color:#fff;padding:10px 14px;margin:18px 0}table{width:100%;border-collapse:collapse}td{padding:8px 10px;border-bottom:1px solid #dfe6f1}td:first-child{font-weight:700;width:38%;color:#0a4fb8}footer{margin-top:28px;font-size:12px;color:#5d6b82}</style></head><body><header><div><strong>${esc(CFG.nombre || 'MediTurn')}</strong><br>${esc(CFG.direccion || '')}<br>Tel. ${esc(CFG.telefono || '')} · RNC ${esc(CFG.rnc || '')}</div><div style="text-align:right">${esc(codigo)}<br>${fdate(today())}</div></header><h1>${esc(titulo)}</h1><table>${filas.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table><p>${esc(nota)}</p><footer>Generado por ${esc($('#userName').textContent)} (${esc(ROLE)}) · MediTurn v1.0</footer><script>onload=()=>print()<\/script></body></html>`);
  w.document.close();
}

/* ---------- Catálogos con formulario genérico (ENT-02, 03, 04, 10) ---------- */
const ICON = { pacientes: 'person-plus', medicos: 'heart-pulse', especialidades: 'hospital', usuarios: 'shield-lock' };
const NOM = { pacientes: 'paciente', medicos: 'médico', especialidades: 'especialidad', usuarios: 'usuario' };
const TBL = { pacientes: '#tblPacientes', medicos: '#tblMedicos', especialidades: '#tblEspecialidades', usuarios: '#tblUsuarios' };
const F = {
  pacientes: () => [
    { n: 'cedula', l: 'Cédula', m: 'cedula', ml: 13, req: 1, ph: '999-9999999-9' },
    { n: 'nombres', l: 'Nombres', ml: 30, req: 1, p: NOMBRE }, { n: 'apellidos', l: 'Apellidos', ml: 30, req: 1, p: NOMBRE },
    { n: 'fecha_nacimiento', l: 'Fecha de nacimiento', t: 'date', req: 1, max: today() },
    { n: 'sexo', l: 'Sexo', t: 'radio', op: ['M', 'F'], def: 'M' },
    { n: 'telefono', l: 'Teléfono', m: 'telefono', ml: 12, req: 1, ph: '809-000-0000' },
    { n: 'telefono_alterno', l: 'Teléfono alterno', m: 'telefono', ml: 12, ph: '809-000-0000' },
    { n: 'correo', l: 'Correo electrónico', t: 'email', ml: 60, req: 1 },
    { n: 'direccion', l: 'Dirección', ml: 80, min: 10, req: 1, w: 12 },
    { n: 'estado', l: 'Estado', t: 'radio', op: ['Activo', 'Inactivo'], def: 'Activo' }],
  medicos: () => [
    { n: 'cedula', l: 'Cédula', m: 'cedula', ml: 13, req: 1, ph: '999-9999999-9' },
    { n: 'exequatur', l: 'N.° de exequátur', ml: 6, req: 1, p: '\\d{6}', ph: '000000' },
    { n: 'nombres', l: 'Nombres', ml: 30, req: 1, p: NOMBRE }, { n: 'apellidos', l: 'Apellidos', ml: 30, req: 1, p: NOMBRE },
    { n: 'id_especialidad', l: 'Especialidad', t: 'select', req: 1, op: CAT.esp.filter(e => e.estado === 'Activa').map(e => ({ v: e.id, t: e.nombre })) },
    { n: 'telefono', l: 'Teléfono', m: 'telefono', ml: 12, req: 1, ph: '809-000-0000' },
    { n: 'correo', l: 'Correo electrónico', t: 'email', ml: 60, req: 1 },
    { n: 'consultorio', l: 'Consultorio', ml: 30, req: 1, ph: 'Torre X, Consultorio 999' },
    { n: 'estado', l: 'Estado', t: 'radio', op: ['Activo', 'Inactivo'], def: 'Activo' }],
  especialidades: () => [
    { n: 'nombre', l: 'Nombre de la especialidad', ml: 40, req: 1 },
    { n: 'tarifa', l: 'Tarifa de consulta (RD$)', t: 'number', req: 1, min: 0.01, max: 999999.99, step: '0.01' },
    { n: 'duracion_min', l: 'Duración de la consulta', t: 'select', req: 1, op: [15, 20, 30, 45, 60].map(x => ({ v: x, t: x + ' minutos' })) },
    { n: 'estado', l: 'Estado', t: 'radio', op: ['Activa', 'Inactiva'], def: 'Activa' },
    { n: 'descripcion', l: 'Descripción', t: 'textarea', ml: 150, w: 12 }],
  usuarios: rec => [
    { n: 'nombre_usuario', l: 'Nombre de usuario', ml: 30, req: 1, min: 4, p: '[A-Za-z0-9._]{4,30}' },
    { n: 'nombre_completo', l: 'Nombre completo', ml: 60, req: 1 },
    { n: 'correo', l: 'Correo electrónico', t: 'email', ml: 60, req: 1 },
    { n: 'rol', l: 'Rol', t: 'select', req: 1, op: ['Paciente', 'Médico', 'Recepcionista', 'Administrador'] },
    { n: 'vinculo', l: 'Vincular con (PAC-999999 o MED-9999)', ml: 10, ph: 'Solo para Paciente o Médico' },
    { n: 'estado', l: 'Estado', t: 'select', op: ['Activo', 'Bloqueado', 'Inactivo'] },
    { n: 'contrasena', l: rec ? 'Nueva contraseña (opcional)' : 'Contraseña temporal', t: 'password', ml: 20, min: 8, req: rec ? 0 : 1, p: '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,20}', w: 12 }]
};
const fld = (f, v) => {
  const id = 'f_' + f.n; let c;
  if (f.t === 'radio') c = f.op.map(o => `<div class="form-check form-check-inline"><input class="form-check-input" type="radio" name="${f.n}" id="${id}${o}" value="${o}" ${(v ?? f.def) === o ? 'checked' : ''}><label class="form-check-label" for="${id}${o}">${o}</label></div>`).join('');
  else if (f.t === 'select') c = `<select class="form-select" id="${id}" name="${f.n}" ${f.req ? 'required' : ''}>${f.op.map(o => `<option value="${esc(o.v ?? o)}" ${(o.v ?? o) == v ? 'selected' : ''}>${esc(o.t ?? o)}</option>`).join('')}</select>`;
  else if (f.t === 'textarea') c = `<textarea class="form-control" id="${id}" name="${f.n}" rows="2" maxlength="${f.ml}">${esc(v)}</textarea>`;
  else c = `<input class="form-control" id="${id}" name="${f.n}" type="${f.t || 'text'}" value="${esc(v)}" ${f.ml ? `maxlength="${f.ml}"` : ''} ${f.min && f.t !== 'number' ? `minlength="${f.min}"` : ''} ${f.t === 'number' ? `min="${f.min}" max="${f.max}" step="${f.step}"` : ''} ${f.t === 'date' && f.max ? `max="${f.max}"` : ''} ${f.m ? `data-mask="${f.m}"` : ''} ${f.p ? `pattern="${f.p}"` : ''} ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} ${f.req ? 'required' : ''} autocomplete="off">`;
  return `<div class="col-md-${f.w || 6}"><label class="form-label" ${f.t === 'radio' ? '' : `for="${id}"`}>${f.l}${f.req ? ' *' : ''}</label>${c}</div>`;
};
function openForm(ent, id) {
  const rec = id ? DATA[ent].find(x => x.id == id) : null, f = $('#frmModal');
  f.dataset.ent = ent; f.dataset.id = id || '';
  $('#modalFormTitle').innerHTML = `<i class="bi bi-${ICON[ent]} me-2"></i>${rec ? 'Editar' : 'Nuevo'} ${NOM[ent]}`;
  $('#modalFields').innerHTML = F[ent](rec).map(x => fld(x, rec ? (x.n === 'contrasena' ? '' : rec[x.n]) : undefined)).join('');
  bootstrap.Modal.getOrCreateInstance('#modalForm').show();
}
const ROW = {
  pacientes: p => [p.codigo, esc(p.nombres + ' ' + p.apellidos), p.cedula, p.telefono, esc(p.correo), p.ultima_cita ? fdate(p.ultima_cita) : 'Sin citas'],
  medicos: m => [m.codigo, 'Dr(a). ' + esc(m.nombre), esc(m.especialidad), m.exequatur, esc(m.consultorio), st(m.estado)],
  especialidades: e => [e.codigo, esc(e.nombre), money(e.tarifa), e.duracion_min + ' min', st(e.estado)],
  usuarios: u => [esc(u.nombre_usuario), esc(u.nombre_completo), esc(u.correo), u.rol, st(u.estado)]
};
const entActs = (ent, x) => (ent === 'pacientes' ? `<button class="btn-act" data-act="hist" data-id="${x.id}" title="Historial"><i class="bi bi-clock-history"></i></button> <button class="btn-act" data-act="cita" data-id="${x.id}" title="Nueva cita"><i class="bi bi-calendar-plus"></i></button> ` : '') +
  `<button class="btn-act" data-act="edit" data-ent="${ent}" data-id="${x.id}" title="Editar"><i class="bi bi-pencil"></i></button> <button class="btn-act danger" data-act="toggle" data-ent="${ent}" data-id="${x.id}" title="Activar / desactivar"><i class="bi bi-toggle-on"></i></button>`;
async function loadList(ent) {
  let url = '/' + ent, q = '';
  if (ent === 'pacientes') { q = $('#bpCriterio').value.trim(); url += `?tipo=${encodeURIComponent($('#bpTipo').value)}&q=${encodeURIComponent(q)}`; }
  const r = await api(url); DATA[ent] = Array.isArray(r) ? r : [];
  $(TBL[ent] + ' tbody').innerHTML = rowsOrEmpty(DATA[ent].map(x => `<tr>${ROW[ent](x).map(c => `<td>${c}</td>`).join('')}<td class="text-end text-nowrap">${entActs(ent, x)}</td></tr>`).join(''), 8);
  if (ent === 'pacientes' && q && !DATA[ent].length) toast(`No se encontraron pacientes con el criterio ${q}.`, 'warning');
}

/* ---------- Horarios (ENT-05) ---------- */
async function loadHorarios() {
  fillMed($('#hMedico'), ''); if (CAT.med.length === 1) $('#hMedico').value = CAT.med[0].id; $('#hDesde').min = today();
  const r = await api('/horarios');
  $('#tblHorarios tbody').innerHTML = rowsOrEmpty((Array.isArray(r) ? r : []).map(h => `<tr><td>Dr(a). ${esc(h.medico)}</td><td>${DIAS[h.dia_semana]}</td><td>${f12(h.hora_inicio)} – ${f12(h.hora_fin)}</td></tr>`).join(''), 3);
}
async function saveHorario(forzar = false) {
  const dias = $$('input[name=dias]:checked').map(x => +x.value);
  const d = { id_medico: +$('#hMedico').value, dias, hora_inicio: $('#hInicio').value, hora_fin: $('#hFin').value, vigente_desde: $('#hDesde').value, vigente_hasta: $('#hHasta').value, fecha_bloqueo: $('#hBloqueo').value, motivo_bloqueo: $('#hMotivo').value.trim(), forzar };
  const r = await api('/horarios', 'POST', d);
  if (r.confirmar) { if (confirm(r.mensaje)) return saveHorario(true); return; }
  if (r.ok) { toast('Horario guardado. La disponibilidad del médico fue actualizada.', 'success'); loadHorarios(); } else toast(r.mensaje || 'No se pudo guardar el horario.', 'danger');
}

/* ---------- Pagos (ENT-08) ---------- */
async function loadPagos() {
  const r = await api('/pagos'); DATA.pagos = Array.isArray(r) ? r : [];
  $('#tblPagos tbody').innerHTML = rowsOrEmpty(DATA.pagos.map(p => `<tr><td>${p.numero}</td><td>${p.cita}</td><td>${esc(p.metodo)}</td><td>${money(p.monto)}</td><td>${fdate(p.fecha)}</td><td class="text-end"><button class="btn-act" data-act="recibo" data-id="${p.id}" title="Imprimir recibo"><i class="bi bi-printer"></i></button></td></tr>`).join(''), 6);
}

/* ---------- Reportes (RPT-05 a RPT-11) ---------- */
const RPT = {
  citas_dia: ['RPT-05', 'Reporte de citas del día', ['Médico', 'Recepcionista', 'Administrador']],
  pendientes: ['RPT-06', 'Listado de citas pendientes', ['Médico', 'Recepcionista', 'Administrador']],
  medicos: ['RPT-07', 'Reporte de médicos disponibles', ['Médico', 'Recepcionista', 'Administrador']],
  ingresos: ['RPT-10', 'Reporte de ingresos del día', ['Recepcionista', 'Administrador']],
  estadistico: ['RPT-11', 'Reporte estadístico de asistencia y cancelaciones', ['Administrador']]
};
function loadReportes() {
  $('#rTipo').innerHTML = Object.entries(RPT).filter(([, v]) => v[2].includes(ROLE)).map(([k, v]) => `<option value="${k}">${v[0]} · ${v[1]}</option>`).join('');
  $('#rEsp').innerHTML = '<option value="">Todas</option>' + CAT.esp.map(e => `<option value="${e.id}">${esc(e.nombre)}</option>`).join('');
  fillMed($('#rMed'), '', 'Todos');
  if (!$('#rDesde').value) { $('#rDesde').value = today().slice(0, 8) + '01'; $('#rHasta').value = today(); }
}
async function generarReporte() {
  const d = $('#rDesde').value, h = $('#rHasta').value, k = $('#rTipo').value;
  if (d > h) return setErr($('#rDesde'), 'Fecha desde no puede ser mayor que Fecha hasta.');
  if ((new Date(h) - new Date(d)) / 864e5 > 366) return setErr($('#rHasta'), 'La fecha debe estar dentro de un rango máximo de 366 días.');
  const r = await api('/reportes?' + new URLSearchParams({ tipo: k, desde: d, hasta: h, esp: $('#rEsp').value, med: $('#rMed').value }));
  if (!r.columnas) return toast(r.mensaje || 'No se pudo generar el reporte.', 'danger');
  $('#reporteTitulo').textContent = `${RPT[k][0]} · ${RPT[k][1]} (${fdate(d)} – ${fdate(h)})`;
  $('#reporteOut').innerHTML = `<div class="table-responsive"><table class="table align-middle"><thead><tr>${r.columnas.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${r.filas.length ? r.filas.map(f => `<tr>${f.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${r.columnas.length}" class="text-center text-secondary py-4">No hay datos para los filtros seleccionados.</td></tr>`}</tbody>${r.totales ? `<tfoot><tr class="fw-bold">${r.totales.map(c => `<td>${esc(c)}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
  $('#reporteCard').classList.remove('d-none'); $('#reporteCard').scrollIntoView({ behavior: 'smooth' });
  if (document.querySelector('input[name=rFormato]:checked').value === 'pdf') setTimeout(() => window.print(), 400);
}

/* ---------- Configuración (ENT-11) y notificaciones ---------- */
const CFGMAP = { cfNombre: 'nombre', cfDir: 'direccion', cfTel: 'telefono', cfRnc: 'rnc', cfCorreo: 'correo_notificaciones', cfApertura: 'hora_apertura', cfCierre: 'hora_cierre' };
async function loadConfig() { const c = await api('/config'); CFG = c; for (const [id, k] of Object.entries(CFGMAP)) $('#' + id).value = String(c[k] ?? '').slice(0, k.startsWith('hora') ? 5 : 999); }
async function notif() {
  const r = await api('/notificaciones'); if (!Array.isArray(r)) return;
  $('#notifDot').classList.toggle('d-none', !r.length);
  $('#notifList').innerHTML = r.length ? r.map(n => `<li><div class="dropdown-item-text small"><strong>${esc(n.asunto)}</strong><br><span class="text-secondary">${n.numero} · ${fdate(n.fecha_envio)}</span></div></li>`).join('') : '<li class="dropdown-item-text text-secondary">Sin notificaciones</li>';
}

const LOAD = { dashboard: loadDash, citas: loadCitas, pacientes: () => loadList('pacientes'), medicos: () => loadList('medicos'), especialidades: () => loadList('especialidades'), horarios: loadHorarios, pagos: loadPagos, reportes: loadReportes, usuarios: () => loadList('usuarios'), configuracion: loadConfig };

/* ---------- Inicio de la aplicación y eventos ---------- */
async function init() {
  $$('#mainNav .nav-link').forEach(a => a.classList.toggle('d-none', !a.dataset.roles.split(' ').includes(ROLE)));
  $('#userInitials').textContent = $('#userName').textContent.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  CFG = await api('/config'); await loadCats();
  $('#cFecha').min = today(); $('#cFecha').max = addDays(90);
  if (ROLE === 'Paciente') {
    const me = await api('/paciente-por-cedula?cedula=me');
    if (me.id) { PAC = me; $('#cCedula').value = me.cedula; $('#cCedula').readOnly = true; $('#cNombre').value = me.nombre; $('#btnBuscarPac').disabled = true; $('#hCedula').value = me.cedula; $('#hCedula').closest('div').classList.add('d-none'); }
  }

  // Tablero
  $('#btnDashRefresh').onclick = loadDash; $('#dashFecha').onchange = loadDash;
  $$('.board').forEach(b => b.addEventListener('click', e => { const c = DASH.find(x => x.id == e.target.closest('.board-card')?.dataset.id); if (c) ABIERTA(c) ? openCambio(c) : toast(`Cita ${c.numero}: ${c.estado}.`, 'primary'); }));

  // Citas: filtros, nueva cita, historial y cambios
  $('#frmFiltroCitas').addEventListener('submit', e => { e.preventDefault(); loadCitas(); });
  $('#btnBuscarPac').onclick = buscarPac; $('#cCedula').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); buscarPac(); } });
  $('#cEsp').onchange = () => { const e = CAT.esp.find(x => x.id == $('#cEsp').value); $('#cTarifa').value = e ? money(e.tarifa) : ''; fillMed($('#cMed'), e?.id); cSlots(); if (e && $('#cMed').options.length < 2) toast(`No hay médicos disponibles para la especialidad ${e.nombre}.`, 'warning'); };
  $('#cMed').onchange = cSlots; $('#cFecha').onchange = cSlots;
  $('#cSlots').addEventListener('click', e => { const b = e.target.closest('.slot'); if (!b) return; $$('.slot', $('#cSlots')).forEach(x => x.classList.remove('active')); b.classList.add('active'); $('#cHora').value = b.dataset.h; });
  $('#frmCita').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target; if (!validate(f)) return;
    if (!PAC) return setErr($('#cCedula'), 'Busque y seleccione un paciente válido.');
    if (!$('#cHora').value) return toast('Seleccione un horario disponible.', 'warning');
    const r = await api('/citas', 'POST', { id_paciente: PAC.id, id_medico: +$('#cMed').value, fecha: $('#cFecha').value, hora: $('#cHora').value, motivo: $('#cMotivo').value.trim() });
    if (r.ok) { toast(`Su cita fue registrada con éxito. N.° ${r.numero}`, 'success'); const keep = ROLE === 'Paciente' ? PAC : null; f.reset(); PAC = keep; if (keep) { $('#cCedula').value = keep.cedula; $('#cNombre').value = keep.nombre; } fillEsp(); fillMed($('#cMed'), ''); cSlots(); notif(); showTab('#tabLista'); loadCitas(); }
    else { toast(r.mensaje || 'El horario seleccionado ya no está disponible. Por favor, elija otro.', 'danger'); cSlots(); }
  });
  $('#frmHistorial').addEventListener('submit', e => { e.preventDefault(); loadHist(); });
  $$('input[name=accion]').forEach(r => r.onchange = () => $('#chReprog').classList.toggle('d-none', $('input[name=accion]:checked').value !== 'Reprogramación'));
  $('#chFecha').onchange = async () => { const h = await getSlots(CAMBIO.id_medico, $('#chFecha').value); $('#chHora').innerHTML = h.length ? h.map(x => `<option value="${x}">${f12(x)}</option>`).join('') : '<option value="">Sin cupos</option>'; };
  $('#frmCambio').addEventListener('submit', async e => {
    e.preventDefault(); const c = CAMBIO, acc = $('input[name=accion]:checked').value, rep = acc === 'Reprogramación', mot = $('#chMotivo').value, det = $('#chDetalle').value.trim();
    if (ROLE === 'Paciente' && new Date(`${c.fecha}T${c.hora}`) - Date.now() < 864e5) return toast('Solo puede cancelar o reprogramar hasta 24 horas antes de la cita.', 'danger');
    if (mot === 'Otro' && det.length < 10) return setErr($('#chDetalle'), 'Detalle del motivo debe tener al menos 10 caracteres.');
    if (rep && (!$('#chFecha').value || !$('#chHora').value)) return toast('Seleccione la nueva fecha y el nuevo horario.', 'warning');
    if (!rep && !confirm(`¿Desea cancelar la cita ${c.numero} del ${fdate(c.fecha)}?`)) return;
    const r = await api(`/citas/${c.id}/cambio`, 'POST', { accion: acc, motivo: mot, detalle: det, fecha: $('#chFecha').value, hora: $('#chHora').value });
    if (r.ok) { bootstrap.Modal.getInstance('#modalCambio').hide(); toast(rep ? 'La cita fue reprogramada y se notificó a los involucrados.' : 'La cita fue cancelada y se notificó a los involucrados.', 'success'); loadCitas(); loadDash(); notif(); }
    else toast(r.mensaje || 'No se pudo completar la operación.', 'danger');
  });
  $('#tblCitas').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return; const c = CITAS.find(x => x.id == b.dataset.id); if (!c) return;
    if (b.dataset.act === 'change') openCambio(c);
    if (b.dataset.act === 'done') { const r = await api(`/citas/${c.id}/atender`, 'POST'); if (r.ok) { toast(`Cita ${c.numero} marcada como atendida.`, 'success'); loadCitas(); } else toast(r.mensaje || 'No se pudo actualizar la cita.', 'danger'); }
    if (b.dataset.act === 'print') printDoc('Comprobante de cita médica', 'RPT-01 · ' + c.numero, [['N.° de comprobante', c.numero], ['Paciente', c.paciente], ['Cédula', c.cedula], ['Médico', 'Dr(a). ' + c.medico], ['Especialidad', c.especialidad], ['Fecha de la cita', fdate(c.fecha)], ['Hora', f12(c.hora)], ['Consultorio', c.consultorio], ['Estado', c.estado], ['Costo de la consulta', money(c.monto)]], 'Preséntese 15 minutos antes de la hora de su cita con su documento de identidad.');
  });
  document.addEventListener('shown.bs.tab', e => {
    const t = e.target; if (t.closest('.mod-head')) t.classList.remove('active');
    $$('#mod-citas .nav-pills .nav-link').forEach(b => b.classList.toggle('active', b.dataset.bsTarget === t.dataset.bsTarget));
  });

  // Catálogos (formulario genérico) y acciones de tabla
  $('#frmBuscarPac').addEventListener('submit', e => { e.preventDefault(); const q = $('#bpCriterio').value.trim(); if (q && q.length < 3) return setErr($('#bpCriterio'), 'Escriba al menos 3 caracteres para buscar.'); loadList('pacientes'); });
  $('#frmModal').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, ent = f.dataset.ent, id = f.dataset.id; if (!validate(f)) return;
    const d = Object.fromEntries(new FormData(f));
    if (ent === 'usuarios' && ['Paciente', 'Médico'].includes(d.rol) && !d.vinculo.trim()) return setErr($('#f_vinculo'), 'El campo Vincular con es obligatorio para el rol seleccionado.');
    const r = await api(`/${ent}${id ? '/' + id : ''}`, id ? 'PUT' : 'POST', d);
    if (r.ok) { bootstrap.Modal.getInstance('#modalForm').hide(); toast(`Registro de ${NOM[ent]} guardado correctamente.`, 'success'); await loadCats(); LOAD[ent](); }
    else toast(r.mensaje || 'No se pudo guardar el registro.', 'danger');
  });
  $('#content').addEventListener('click', async e => {
    const b = e.target.closest('[data-form],[data-act]'); if (!b) return;
    if (b.dataset.form) return openForm(PL[b.dataset.form]);
    const { act, ent, id } = b.dataset;
    if (act === 'edit') openForm(ent, id);
    if (act === 'toggle') { const r = await api(`/${ent}/${id}/estado`, 'POST'); if (r.ok) { toast('Estado actualizado.', 'success'); await loadCats(); LOAD[ent](); } else toast(r.mensaje || 'No se pudo cambiar el estado.', 'danger'); }
    if (act === 'hist' || act === 'cita') {
      const p = DATA.pacientes.find(x => x.id == id); location.hash = '#citas';
      if (act === 'hist') { showTab('#tabHistorial'); $('#hCedula').value = p.cedula; loadHist(); } else { showTab('#tabNueva'); $('#cCedula').value = p.cedula; buscarPac(); }
    }
    if (act === 'recibo') { const p = DATA.pagos.find(x => x.id == id); printDoc('Recibo de pago de consulta', 'RPT-02 · ' + p.numero, [['N.° de recibo', p.numero], ['Paciente', p.paciente], ['Cita asociada', p.cita], ['Especialidad', p.especialidad], ['Médico', 'Dr(a). ' + p.medico], ['Método de pago', p.metodo], ['Referencia', p.referencia || '—'], ['Monto pagado', money(p.monto)], ['Balance pendiente', money(p.balance)], ['Estado del pago', p.estado], ['Fecha de pago', fdate(p.fecha)], ['Recibido por', p.recibido_por]]); }
  });

  // Horarios
  $('#frmHorario').addEventListener('submit', e => {
    e.preventDefault(); if (!validate(e.target)) return;
    if (!$$('input[name=dias]:checked').length) return toast('Seleccione al menos un día de atención.', 'warning');
    if ($('#hFin').value <= $('#hInicio').value) return setErr($('#hFin'), 'La hora de fin debe ser mayor que la de inicio.');
    if ($('#hHasta').value && $('#hHasta').value <= $('#hDesde').value) return setErr($('#hHasta'), 'Vigente hasta debe ser posterior a Vigente desde.');
    if ($('#hBloqueo').value && !$('#hMotivo').value.trim()) return setErr($('#hMotivo'), 'El campo Motivo del bloqueo es obligatorio.');
    saveHorario();
  });

  // Pagos
  $('#btnBuscarCita').onclick = async () => {
    const n = $('#pCita').value.trim().toUpperCase(), el = $('#pCita');
    if (!/^CT-\d{4}-\d{6}$/.test(n)) return setErr(el, 'N.° de cita no tiene el formato correcto. Formato esperado: CT-9999-999999.');
    const r = await api('/citas/buscar?numero=' + n); PAGO = null;
    if (!r.id) return setErr(el, r.mensaje || 'La cita no existe.');
    if (r.estado === 'Cancelada' || r.balance <= 0) return setErr(el, 'La cita está cancelada o ya fue pagada.');
    PAGO = r; setErr(el, ''); $('#pPaciente').value = r.paciente; $('#pMonto').value = money(r.balance); $('#pBalance').value = money(r.balance);
  };
  $('#pRecibido').addEventListener('input', () => { if (PAGO) $('#pBalance').value = money(Math.max(PAGO.balance - num($('#pRecibido').value), 0)); });
  $('#pRecibido').addEventListener('blur', e => { if (e.target.value) e.target.value = money(num(e.target.value)); });
  $('#frmPago').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target; if (!validate(f)) return;
    if (!PAGO) return setErr($('#pCita'), 'Busque una cita válida antes de registrar el pago.');
    const m = num($('#pRecibido').value);
    if (m <= 0 || m > PAGO.balance) return setErr($('#pRecibido'), `El monto debe ser mayor que 0 y no superar ${money(PAGO.balance)}.`);
    if ($('#pMetodo').value !== 'Efectivo' && !$('#pRef').value.trim()) return setErr($('#pRef'), 'El campo Referencia es obligatorio para Tarjeta o Transferencia.');
    const r = await api('/pagos', 'POST', { id_cita: PAGO.id, metodo: $('#pMetodo').value, referencia: $('#pRef').value.trim(), monto: m });
    if (r.ok) { toast(`Pago registrado. Recibo ${r.numero || ''}`, 'success'); if (m < PAGO.balance) toast(`El pago no cubre el total. Balance pendiente: ${money(PAGO.balance - m)}.`, 'warning'); f.reset(); PAGO = null; loadPagos(); }
    else toast(r.mensaje || 'No se pudo registrar el pago.', 'danger');
  });

  // Reportes y configuración
  $('#frmReporte').addEventListener('submit', e => { e.preventDefault(); if (validate(e.target)) generarReporte(); });
  $('#btnImprimir').onclick = () => window.print();
  $('#frmConfig').addEventListener('submit', async e => {
    e.preventDefault(); if (!validate(e.target)) return;
    if ($('#cfCierre').value <= $('#cfApertura').value) return setErr($('#cfCierre'), 'La hora de fin debe ser mayor que la de inicio.');
    const file = $('#cfLogo').files[0];
    if (file && (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 1048576)) return setErr($('#cfLogo'), 'El logo debe ser PNG o JPG y no superar 1 MB.');
    const d = {}; for (const [id, k] of Object.entries(CFGMAP)) d[k] = $('#' + id).value.trim();
    const r = await api('/config', 'POST', d);
    if (file && r.ok) { const fd = new FormData(); fd.append('logo', file); await fetch('/api/config/logo', { method: 'POST', body: fd, credentials: 'same-origin' }); }
    r.ok ? (toast('Configuración guardada correctamente.', 'success'), loadConfig()) : toast(r.mensaje || 'No se pudo guardar la configuración.', 'danger');
  });

  addEventListener('hashchange', route); route(); notif();
  setInterval(notif, 60000); setInterval(() => { if ($('#mod-dashboard').classList.contains('active')) loadDash(); }, 60000);
}

if (!initLogin()) init();
})();
