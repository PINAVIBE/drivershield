"use strict";
const USERS_KEY = 'ds_usuarios';
const SESSION_KEY = 'ds_session';

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Crear usuario admin por defecto si no existe ninguno
function initDefaultUser() {
  const users = getUsers();
  if (users.length === 0) {
    saveUsers([{
      id: 'default-admin',
      nombre: 'Administrador',
      apellido: 'Sistema',
      email: 'admin@drivershield.com',
      password: 'admin123',
      rol: 'admin',
      createdAt: Date.now()
    }]);
  }
}

function switchAuthView(view) {
  document.getElementById('view-login').classList.toggle('active', view === 'login');
  document.getElementById('view-register').classList.toggle('active', view === 'register');
  clearAuthErrors();
}

function clearAuthErrors() {
  ['login-error', 'reg-error'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = '';
    el.classList.remove('show');
  });
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
}

function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

function doLogin() {
  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showAuthError('login-error', 'Por favor completa todos los campos'); return;
  }

  const users = getUsers();
  const user  = users.find(u => u.email.toLowerCase() === email && u.password === password);

  if (!user) {
    showAuthError('login-error', 'Correo o contraseña incorrectos'); return;
  }

  setSession(user);
  enterApp(user);
}

function doRegister() {
  const nombre   = document.getElementById('reg-nombre').value.trim();
  const apellido = document.getElementById('reg-apellido').value.trim();
  const email    = document.getElementById('reg-email').value.trim().toLowerCase();
  const pass1    = document.getElementById('reg-password').value;
  const pass2    = document.getElementById('reg-password2').value;
  const rol      = document.getElementById('reg-rol').value;

  if (!nombre || !apellido || !email || !pass1 || !pass2) {
    showAuthError('reg-error', 'Todos los campos marcados con * son obligatorios'); return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAuthError('reg-error', 'Ingresa un correo electrónico válido'); return;
  }

  if (pass1.length < 6) {
    showAuthError('reg-error', 'La contraseña debe tener mínimo 6 caracteres'); return;
  }

  if (pass1 !== pass2) {
    showAuthError('reg-error', 'Las contraseñas no coinciden'); return;
  }

  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email)) {
    showAuthError('reg-error', 'Ya existe una cuenta con ese correo'); return;
  }

  const newUser = {
    id: uid(),
    nombre, apellido, email,
    password: pass1,
    rol,
    createdAt: Date.now()
  };

  users.push(newUser);
  saveUsers(users);
  setSession(newUser);
  enterApp(newUser);
}

function enterApp(user) {
  // Actualizar UI con datos del usuario
  const initials = (user.nombre[0] + (user.apellido?.[0] || '')).toUpperCase();
  const fullName = user.nombre + ' ' + (user.apellido || '');
  const rolLabel = { admin: 'Administrador', agente: 'Agente', consultor: 'Consultor' }[user.rol] || user.rol;

  document.getElementById('sidebar-avatar').textContent   = initials;
  document.getElementById('sidebar-username').textContent = fullName;
  document.getElementById('sidebar-userrole').textContent = rolLabel;
  document.getElementById('topbar-avatar').textContent    = initials;
  document.getElementById('topbar-uname').textContent     = user.nombre;
  document.getElementById('dd-name').textContent          = fullName;
  document.getElementById('dd-email').textContent         = user.email;
  document.getElementById('dd-rol').textContent           = rolLabel;

  // Ocultar auth, mostrar app
  document.getElementById('auth-screen').style.display  = 'none';
  document.getElementById('app-wrapper').style.display  = 'flex';

  toast('¡Bienvenido, ' + user.nombre + '!', 'success');
  updateDashboard();
}

function doLogout() {
  clearSession();
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-wrapper').style.display = 'none';
  document.getElementById('user-dropdown').classList.remove('open');
  // Limpiar campos login
  document.getElementById('login-email').value    = '';
  document.getElementById('login-password').value = '';
  clearAuthErrors();
  switchAuthView('login');
  toast('Sesión cerrada', 'info');
}

function toggleUserMenu() {
  const dd = document.getElementById('user-dropdown');
  dd.classList.toggle('open');
}

// Cerrar dropdown al hacer clic fuera
document.addEventListener('click', e => {
  const wrap = e.target.closest('.topbar-user');
  if (!wrap) {
    document.getElementById('user-dropdown')?.classList.remove('open');
  }
});

// ──────────────────────────────────────────────────────
// ESTADO GLOBAL
// ──────────────────────────────────────────────────────
const DB = {
  clientes:  JSON.parse(localStorage.getItem('ds_clientes')  || '[]'),
  vehiculos: JSON.parse(localStorage.getItem('ds_vehiculos') || '[]'),
  polizas:   JSON.parse(localStorage.getItem('ds_polizas')   || '[]'),
  pagos:     JSON.parse(localStorage.getItem('ds_pagos')     || '[]'),
};

let currentReporteTab = 'activas';

// ──────────────────────────────────────────────────────
// PERSISTENCIA
// ──────────────────────────────────────────────────────
function save() {
  localStorage.setItem('ds_clientes',  JSON.stringify(DB.clientes));
  localStorage.setItem('ds_vehiculos', JSON.stringify(DB.vehiculos));
  localStorage.setItem('ds_polizas',   JSON.stringify(DB.polizas));
  localStorage.setItem('ds_pagos',     JSON.stringify(DB.pagos));
}

// ──────────────────────────────────────────────────────
// UTILIDADES
// ──────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtMoney(n) {
  if (!n && n !== 0) return '—';
  return '$' + Number(n).toLocaleString('es-CO');
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function polizaEstadoAuto(p) {
  if (p.estado === 'Cancelada') return 'Cancelada';
  const now = new Date(); now.setHours(0,0,0,0);
  const fin = new Date(p.fechaFin + 'T00:00:00');
  return fin < now ? 'Vencida' : 'Activa';
}

function getNombreCliente(id) {
  const c = DB.clientes.find(x => x.id === id);
  return c ? c.nombre : '—';
}

function getPlacaVehiculo(id) {
  const v = DB.vehiculos.find(x => x.id === id);
  return v ? v.placa + ' ' + v.marca + ' ' + v.modelo : '—';
}

// Toast notifications
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> ${msg}`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ──────────────────────────────────────────────────────
// NAVEGACIÓN
// ──────────────────────────────────────────────────────
const TITLES = {
  dashboard: 'Dashboard',
  clientes:  'Clientes',
  vehiculos: 'Vehículos',
  polizas:   'Pólizas',
  pagos:     'Pagos',
  consultas: 'Consultar Información',
  historial: 'Historial de Seguros',
  reportes:  'Reportes',
};

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.querySelector(`[data-section="${name}"]`).classList.add('active');
  document.getElementById('pageTitle').textContent = TITLES[name] || name;

  // Refresh data on show
  if (name === 'dashboard')   updateDashboard();
  if (name === 'clientes')    renderClientes();
  if (name === 'vehiculos')   renderVehiculos();
  if (name === 'polizas')     renderPolizas();
  if (name === 'pagos')       renderPagos();
  if (name === 'historial')   fillHistorialSelect();
  if (name === 'reportes')    renderReporte(currentReporteTab);

  // Close sidebar on mobile
  if (window.innerWidth <= 820) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ──────────────────────────────────────────────────────
// MODALES
// ──────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');

  if (id === 'modal-cliente')  resetClienteForm();
  if (id === 'modal-vehiculo') { resetVehiculoForm(); fillPropietarioSelect(); }
  if (id === 'modal-poliza')   { resetPolizaForm(); fillPolizaClientes(); }
  if (id === 'modal-pago')     { resetPagoForm(); fillPagoPolizas(); }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ──────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────
function updateDashboard() {
  const polizasActivas = DB.polizas.filter(p => polizaEstadoAuto(p) === 'Activa');
  const totalPagado = DB.pagos.reduce((s, p) => s + Number(p.monto), 0);

  document.getElementById('dash-clientes').textContent  = DB.clientes.length;
  document.getElementById('dash-vehiculos').textContent = DB.vehiculos.length;
  document.getElementById('dash-polizas').textContent   = polizasActivas.length;
  document.getElementById('dash-pagos').textContent     = fmtMoney(totalPagado);

  // Bars (max reference)
  const maxC = Math.max(DB.clientes.length, 1);
  document.getElementById('bar-clientes').style.width  = Math.min(100, DB.clientes.length  / maxC * 100) + '%';
  document.getElementById('bar-vehiculos').style.width = Math.min(100, DB.vehiculos.length / maxC * 100) + '%';
  document.getElementById('bar-polizas').style.width   = Math.min(100, polizasActivas.length / Math.max(DB.polizas.length,1) * 100) + '%';

  // Recent polizas
  const listP = document.getElementById('dash-polizas-list');
  const recent = [...DB.polizas].sort((a,b) => b.createdAt - a.createdAt).slice(0, 5);
  if (recent.length === 0) {
    listP.innerHTML = '<div class="empty-state small">No hay pólizas registradas</div>';
  } else {
    listP.innerHTML = recent.map(p => `
      <div class="dash-list-item">
        <div>
          <div style="font-weight:600;font-size:13px;color:var(--text-primary)">${p.numero}</div>
          <div style="font-size:12px;color:var(--text-muted)">${getNombreCliente(p.clienteId)}</div>
        </div>
        <span class="badge badge-${polizaEstadoAuto(p).toLowerCase()}">${polizaEstadoAuto(p)}</span>
      </div>`).join('');
  }

  // Próximas a vencer (30 días)
  const soon = new Date(); soon.setDate(soon.getDate() + 30);
  const prox = DB.polizas.filter(p => {
    const fin = new Date(p.fechaFin + 'T00:00:00');
    const now = new Date(); now.setHours(0,0,0,0);
    return polizaEstadoAuto(p) === 'Activa' && fin <= soon && fin >= now;
  });

  document.getElementById('vencen-badge').textContent = prox.length;
  const listV = document.getElementById('dash-vencen-list');
  if (prox.length === 0) {
    listV.innerHTML = '<div class="empty-state small">Sin pólizas próximas a vencer</div>';
  } else {
    listV.innerHTML = prox.map(p => `
      <div class="dash-list-item">
        <div>
          <div style="font-weight:600;font-size:13px;color:var(--text-primary)">${p.numero}</div>
          <div style="font-size:12px;color:var(--text-muted)">${getNombreCliente(p.clienteId)}</div>
        </div>
        <div style="font-size:12px;color:var(--warn)">Vence: ${fmtDate(p.fechaFin)}</div>
      </div>`).join('');
  }

  // Last payments
  const lastPagos = [...DB.pagos].sort((a,b) => b.createdAt - a.createdAt).slice(0, 6);
  const listPg = document.getElementById('dash-pagos-list');
  if (lastPagos.length === 0) {
    listPg.innerHTML = '<div class="empty-state small">No hay pagos registrados</div>';
  } else {
    listPg.innerHTML = lastPagos.map(pg => {
      const pol = DB.polizas.find(p => p.id === pg.polizaId);
      return `
      <div class="dash-list-item">
        <div>
          <div style="font-weight:600;font-size:13px;color:var(--text-primary)">${fmtMoney(pg.monto)}</div>
          <div style="font-size:12px;color:var(--text-muted)">${pol ? pol.numero : '—'} · ${pg.concepto}</div>
        </div>
        <div style="font-size:12px;color:var(--text-muted)">${fmtDate(pg.fecha)}</div>
      </div>`;
    }).join('');
  }
}

// ──────────────────────────────────────────────────────
// CLIENTES — CRUD
// ──────────────────────────────────────────────────────
function resetClienteForm() {
  document.getElementById('cliente-edit-id').value    = '';
  document.getElementById('cliente-nombre').value     = '';
  document.getElementById('cliente-cedula').value     = '';
  document.getElementById('cliente-telefono').value   = '';
  document.getElementById('cliente-email').value      = '';
  document.getElementById('cliente-ciudad').value     = '';
  document.getElementById('cliente-direccion').value  = '';
  document.getElementById('cliente-fecha-nac').value  = '';
  document.getElementById('modal-cliente-title').textContent = 'Registrar Cliente';
}

function guardarCliente() {
  const nombre    = document.getElementById('cliente-nombre').value.trim();
  const cedula    = document.getElementById('cliente-cedula').value.trim();
  const telefono  = document.getElementById('cliente-telefono').value.trim();
  const email     = document.getElementById('cliente-email').value.trim();
  const ciudad    = document.getElementById('cliente-ciudad').value.trim();
  const direccion = document.getElementById('cliente-direccion').value.trim();
  const fechaNac  = document.getElementById('cliente-fecha-nac').value;
  const editId    = document.getElementById('cliente-edit-id').value;

  if (!nombre || !cedula || !telefono) {
    toast('Nombre, cédula y teléfono son obligatorios', 'error'); return;
  }

  // Verificar cédula única (no repetir en otro registro)
  const dup = DB.clientes.find(c => c.cedula === cedula && c.id !== editId);
  if (dup) { toast('Ya existe un cliente con esa cédula', 'error'); return; }

  if (editId) {
    const idx = DB.clientes.findIndex(c => c.id === editId);
    DB.clientes[idx] = { ...DB.clientes[idx], nombre, cedula, telefono, email, ciudad, direccion, fechaNac };
    toast('Cliente actualizado correctamente');
  } else {
    DB.clientes.push({ id: uid(), nombre, cedula, telefono, email, ciudad, direccion, fechaNac, createdAt: Date.now() });
    toast('Cliente registrado correctamente');
  }

  save();
  closeModal('modal-cliente');
  renderClientes();
  updateDashboard();
}

function renderClientes() {
  const q = (document.getElementById('search-clientes')?.value || '').toLowerCase();
  const rows = DB.clientes
    .filter(c => c.nombre.toLowerCase().includes(q) || c.cedula.includes(q) || (c.email||'').toLowerCase().includes(q))
    .sort((a,b) => b.createdAt - a.createdAt);

  const tbody = document.getElementById('tbody-clientes');
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-td">No hay clientes registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((c, i) => `
    <tr>
      <td class="text-muted">${i+1}</td>
      <td style="font-weight:600;color:var(--text-primary)">${c.nombre}</td>
      <td>${c.cedula}</td>
      <td>${c.telefono}</td>
      <td>${c.email || '—'}</td>
      <td>${c.ciudad || '—'}</td>
      <td class="td-actions">
        <button class="btn-icon" title="Ver detalle" onclick="verDetalleCliente('${c.id}')">☰</button>
        <button class="btn-icon" title="Editar" onclick="editCliente('${c.id}')">✎</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarCliente('${c.id}')">✕</button>
      </td>
    </tr>`).join('');
}

function editCliente(id) {
  const c = DB.clientes.find(x => x.id === id);
  if (!c) return;
  openModal('modal-cliente');
  document.getElementById('cliente-edit-id').value   = c.id;
  document.getElementById('cliente-nombre').value    = c.nombre;
  document.getElementById('cliente-cedula').value    = c.cedula;
  document.getElementById('cliente-telefono').value  = c.telefono;
  document.getElementById('cliente-email').value     = c.email || '';
  document.getElementById('cliente-ciudad').value    = c.ciudad || '';
  document.getElementById('cliente-direccion').value = c.direccion || '';
  document.getElementById('cliente-fecha-nac').value = c.fechaNac || '';
  document.getElementById('modal-cliente-title').textContent = 'Editar Cliente';
}

function eliminarCliente(id) {
  if (!confirm('¿Eliminar este cliente? Se eliminarán también sus vehículos y pólizas.')) return;
  DB.vehiculos = DB.vehiculos.filter(v => v.propietarioId !== id);
  const polIds = DB.polizas.filter(p => p.clienteId === id).map(p => p.id);
  DB.polizas = DB.polizas.filter(p => p.clienteId !== id);
  DB.pagos   = DB.pagos.filter(pg => !polIds.includes(pg.polizaId));
  DB.clientes = DB.clientes.filter(c => c.id !== id);
  save(); renderClientes(); updateDashboard();
  toast('Cliente eliminado', 'warn');
}

function verDetalleCliente(id) {
  const c = DB.clientes.find(x => x.id === id);
  if (!c) return;
  const vehiculos = DB.vehiculos.filter(v => v.propietarioId === id);
  const polizas   = DB.polizas.filter(p => p.clienteId === id);

  document.getElementById('modal-detalle-title').textContent = 'Detalle del Cliente';
  document.getElementById('modal-detalle-body').innerHTML = `
    <div class="result-card">
      <div class="result-card-title">Información Personal</div>
      ${row('Nombre',     c.nombre)}
      ${row('Cédula/NIT', c.cedula)}
      ${row('Teléfono',   c.telefono)}
      ${row('Email',      c.email||'—')}
      ${row('Ciudad',     c.ciudad||'—')}
      ${row('Dirección',  c.direccion||'—')}
      ${row('Nacimiento', fmtDate(c.fechaNac))}
    </div>
    <div class="result-card" style="margin-top:12px">
      <div class="result-card-title">Vehículos (${vehiculos.length})</div>
      ${vehiculos.length === 0 ? '<div class="text-muted" style="font-size:13px">Sin vehículos</div>' :
        vehiculos.map(v => `<div class="result-row"><span class="result-key">${v.placa}</span><span class="result-val">${v.marca} ${v.modelo} ${v.anio}</span></div>`).join('')
      }
    </div>
    <div class="result-card" style="margin-top:12px">
      <div class="result-card-title">Pólizas (${polizas.length})</div>
      ${polizas.length === 0 ? '<div class="text-muted" style="font-size:13px">Sin pólizas</div>' :
        polizas.map(p => `<div class="result-row"><span class="result-key">${p.numero}</span><span class="result-val"><span class="badge badge-${polizaEstadoAuto(p).toLowerCase()}">${polizaEstadoAuto(p)}</span></span></div>`).join('')
      }
    </div>`;
  openModal('modal-detalle');
}

// ──────────────────────────────────────────────────────
// VEHÍCULOS — CRUD
// ──────────────────────────────────────────────────────
function fillPropietarioSelect() {
  const sel = document.getElementById('vehiculo-propietario');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Seleccione cliente —</option>' +
    DB.clientes.map(c => `<option value="${c.id}" ${c.id===cur?'selected':''}>${c.nombre} (${c.cedula})</option>`).join('');
}

function resetVehiculoForm() {
  document.getElementById('vehiculo-edit-id').value    = '';
  document.getElementById('vehiculo-placa').value      = '';
  document.getElementById('vehiculo-marca').value      = '';
  document.getElementById('vehiculo-modelo').value     = '';
  document.getElementById('vehiculo-anio').value       = '';
  document.getElementById('vehiculo-color').value      = '';
  document.getElementById('vehiculo-vin').value        = '';
  document.getElementById('vehiculo-valor').value      = '';
  document.getElementById('vehiculo-tipo').value       = 'Automóvil';
  document.getElementById('vehiculo-propietario').value = '';
  document.getElementById('modal-vehiculo-title').textContent = 'Registrar Vehículo';
}

function guardarVehiculo() {
  const placa       = document.getElementById('vehiculo-placa').value.trim().toUpperCase();
  const propId      = document.getElementById('vehiculo-propietario').value;
  const marca       = document.getElementById('vehiculo-marca').value.trim();
  const modelo      = document.getElementById('vehiculo-modelo').value.trim();
  const anio        = document.getElementById('vehiculo-anio').value;
  const tipo        = document.getElementById('vehiculo-tipo').value;
  const color       = document.getElementById('vehiculo-color').value.trim();
  const vin         = document.getElementById('vehiculo-vin').value.trim();
  const valor       = document.getElementById('vehiculo-valor').value;
  const editId      = document.getElementById('vehiculo-edit-id').value;

  if (!placa || !propId || !marca || !modelo || !anio) {
    toast('Placa, propietario, marca, modelo y año son obligatorios', 'error'); return;
  }

  const dup = DB.vehiculos.find(v => v.placa === placa && v.id !== editId);
  if (dup) { toast('Ya existe un vehículo con esa placa', 'error'); return; }

  if (editId) {
    const idx = DB.vehiculos.findIndex(v => v.id === editId);
    DB.vehiculos[idx] = { ...DB.vehiculos[idx], placa, propietarioId: propId, marca, modelo, anio, tipo, color, vin, valor };
    toast('Vehículo actualizado');
  } else {
    DB.vehiculos.push({ id: uid(), placa, propietarioId: propId, marca, modelo, anio, tipo, color, vin, valor, createdAt: Date.now() });
    toast('Vehículo registrado');
  }

  save(); closeModal('modal-vehiculo'); renderVehiculos(); updateDashboard();
}

function renderVehiculos() {
  const q = (document.getElementById('search-vehiculos')?.value || '').toLowerCase();
  const rows = DB.vehiculos
    .filter(v => {
      const owner = getNombreCliente(v.propietarioId).toLowerCase();
      return v.placa.toLowerCase().includes(q) || v.marca.toLowerCase().includes(q) || owner.includes(q);
    })
    .sort((a,b) => b.createdAt - a.createdAt);

  const tbody = document.getElementById('tbody-vehiculos');
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-td">No hay vehículos registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((v, i) => `
    <tr>
      <td class="text-muted">${i+1}</td>
      <td style="font-weight:700;color:var(--accent);font-family:var(--font-head)">${v.placa}</td>
      <td style="color:var(--text-primary)">${v.marca} ${v.modelo}</td>
      <td>${v.anio}</td>
      <td>${v.tipo}</td>
      <td>${getNombreCliente(v.propietarioId)}</td>
      <td class="td-actions">
        <button class="btn-icon" onclick="verDetalleVehiculo('${v.id}')">☰</button>
        <button class="btn-icon" onclick="editVehiculo('${v.id}')">✎</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarVehiculo('${v.id}')">✕</button>
      </td>
    </tr>`).join('');
}

function editVehiculo(id) {
  const v = DB.vehiculos.find(x => x.id === id);
  if (!v) return;
  fillPropietarioSelect();
  openModal('modal-vehiculo');
  document.getElementById('vehiculo-edit-id').value       = v.id;
  document.getElementById('vehiculo-placa').value         = v.placa;
  document.getElementById('vehiculo-propietario').value   = v.propietarioId;
  document.getElementById('vehiculo-marca').value         = v.marca;
  document.getElementById('vehiculo-modelo').value        = v.modelo;
  document.getElementById('vehiculo-anio').value          = v.anio;
  document.getElementById('vehiculo-tipo').value          = v.tipo;
  document.getElementById('vehiculo-color').value         = v.color || '';
  document.getElementById('vehiculo-vin').value           = v.vin || '';
  document.getElementById('vehiculo-valor').value         = v.valor || '';
  document.getElementById('modal-vehiculo-title').textContent = 'Editar Vehículo';
}

function eliminarVehiculo(id) {
  if (!confirm('¿Eliminar este vehículo?')) return;
  DB.vehiculos = DB.vehiculos.filter(v => v.id !== id);
  save(); renderVehiculos(); updateDashboard();
  toast('Vehículo eliminado', 'warn');
}

function verDetalleVehiculo(id) {
  const v = DB.vehiculos.find(x => x.id === id);
  if (!v) return;
  const polizas = DB.polizas.filter(p => p.vehiculoId === id);
  document.getElementById('modal-detalle-title').textContent = 'Detalle del Vehículo';
  document.getElementById('modal-detalle-body').innerHTML = `
    <div class="result-card">
      <div class="result-card-title">Datos del Vehículo</div>
      ${row('Placa',     v.placa)}
      ${row('Marca',     v.marca)}
      ${row('Modelo',    v.modelo)}
      ${row('Año',       v.anio)}
      ${row('Tipo',      v.tipo)}
      ${row('Color',     v.color||'—')}
      ${row('VIN/Chasis',v.vin||'—')}
      ${row('Valor Comercial', fmtMoney(v.valor))}
      ${row('Propietario', getNombreCliente(v.propietarioId))}
    </div>
    <div class="result-card" style="margin-top:12px">
      <div class="result-card-title">Pólizas Asociadas (${polizas.length})</div>
      ${polizas.length === 0 ? '<div class="text-muted" style="font-size:13px">Sin pólizas</div>' :
        polizas.map(p => `<div class="result-row"><span class="result-key">${p.numero}</span><span class="result-val"><span class="badge badge-${polizaEstadoAuto(p).toLowerCase()}">${polizaEstadoAuto(p)}</span></span></div>`).join('')
      }
    </div>`;
  openModal('modal-detalle');
}

// ──────────────────────────────────────────────────────
// PÓLIZAS — CRUD
// ──────────────────────────────────────────────────────
function genNumPoliza() {
  const n = (DB.polizas.length + 1).toString().padStart(5, '0');
  return 'POL-' + new Date().getFullYear() + '-' + n;
}

function fillPolizaClientes() {
  const sel = document.getElementById('poliza-cliente');
  sel.innerHTML = '<option value="">— Seleccione cliente —</option>' +
    DB.clientes.map(c => `<option value="${c.id}">${c.nombre} (${c.cedula})</option>`).join('');
}

function fillPolizaVehiculos() {
  const clienteId = document.getElementById('poliza-cliente').value;
  const sel = document.getElementById('poliza-vehiculo');
  const vehs = DB.vehiculos.filter(v => v.propietarioId === clienteId);
  sel.innerHTML = vehs.length === 0
    ? '<option value="">— Sin vehículos para este cliente —</option>'
    : vehs.map(v => `<option value="${v.id}">${v.placa} — ${v.marca} ${v.modelo} (${v.anio})</option>`).join('');
}

function resetPolizaForm() {
  document.getElementById('poliza-edit-id').value  = '';
  document.getElementById('poliza-numero').value   = genNumPoliza();
  document.getElementById('poliza-cliente').value  = '';
  document.getElementById('poliza-vehiculo').innerHTML = '<option value="">— Primero seleccione cliente —</option>';
  document.getElementById('poliza-tipo').value     = 'Todo Riesgo';
  document.getElementById('poliza-inicio').value   = today();
  document.getElementById('poliza-fin').value      = '';
  document.getElementById('poliza-prima').value    = '';
  document.getElementById('poliza-cobertura').value= '';
  document.getElementById('poliza-estado').value   = 'Activa';
  document.getElementById('poliza-obs').value      = '';
  document.getElementById('modal-poliza-title').textContent = 'Registrar Póliza';
}

function guardarPoliza() {
  const editId     = document.getElementById('poliza-edit-id').value;
  const numero     = document.getElementById('poliza-numero').value.trim();
  const clienteId  = document.getElementById('poliza-cliente').value;
  const vehiculoId = document.getElementById('poliza-vehiculo').value;
  const tipo       = document.getElementById('poliza-tipo').value;
  const fechaIni   = document.getElementById('poliza-inicio').value;
  const fechaFin   = document.getElementById('poliza-fin').value;
  const prima      = document.getElementById('poliza-prima').value;
  const cobertura  = document.getElementById('poliza-cobertura').value;
  const estado     = document.getElementById('poliza-estado').value;
  const obs        = document.getElementById('poliza-obs').value.trim();

  if (!clienteId || !vehiculoId || !fechaIni || !fechaFin || !prima) {
    toast('Cliente, vehículo, fechas y prima son obligatorios', 'error'); return;
  }
  if (fechaFin <= fechaIni) {
    toast('La fecha de vencimiento debe ser posterior a la de inicio', 'error'); return;
  }

  if (editId) {
    const idx = DB.polizas.findIndex(p => p.id === editId);
    DB.polizas[idx] = { ...DB.polizas[idx], clienteId, vehiculoId, tipo, fechaIni, fechaFin, prima, cobertura, estado, obs };
    toast('Póliza actualizada');
  } else {
    DB.polizas.push({ id: uid(), numero, clienteId, vehiculoId, tipo, fechaIni, fechaFin, prima, cobertura, estado, obs, createdAt: Date.now() });
    toast('Póliza registrada');
  }

  save(); closeModal('modal-poliza'); renderPolizas(); updateDashboard();
}

function renderPolizas() {
  const q       = (document.getElementById('search-polizas')?.value || '').toLowerCase();
  const estado  = document.getElementById('filter-poliza-estado')?.value || '';

  const rows = DB.polizas
    .filter(p => {
      const cli = getNombreCliente(p.clienteId).toLowerCase();
      const matchQ = p.numero.toLowerCase().includes(q) || cli.includes(q);
      const matchE = !estado || polizaEstadoAuto(p) === estado;
      return matchQ && matchE;
    })
    .sort((a,b) => b.createdAt - a.createdAt);

  const tbody = document.getElementById('tbody-polizas');
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-td">No hay pólizas registradas</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(p => {
    const est = polizaEstadoAuto(p);
    return `
    <tr>
      <td style="font-weight:700;color:var(--accent);font-family:var(--font-head);font-size:12px">${p.numero}</td>
      <td style="color:var(--text-primary)">${getNombreCliente(p.clienteId)}</td>
      <td style="font-size:12px">${getPlacaVehiculo(p.vehiculoId)}</td>
      <td>${p.tipo}</td>
      <td>${fmtDate(p.fechaIni)}</td>
      <td>${fmtDate(p.fechaFin)}</td>
      <td style="color:var(--success);font-weight:600">${fmtMoney(p.prima)}</td>
      <td><span class="badge badge-${est.toLowerCase()}">${est}</span></td>
      <td class="td-actions">
        <button class="btn-icon" title="Ver" onclick="verDetallePoliza('${p.id}')">☰</button>
        <button class="btn-icon" title="Editar" onclick="editPoliza('${p.id}')">✎</button>
        <button class="btn-icon" title="Renovar" onclick="abrirRenovar('${p.id}')">↻</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarPoliza('${p.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function editPoliza(id) {
  const p = DB.polizas.find(x => x.id === id);
  if (!p) return;
  fillPolizaClientes();
  openModal('modal-poliza');
  setTimeout(() => {
    document.getElementById('poliza-edit-id').value  = p.id;
    document.getElementById('poliza-numero').value   = p.numero;
    document.getElementById('poliza-cliente').value  = p.clienteId;
    fillPolizaVehiculos();
    setTimeout(() => { document.getElementById('poliza-vehiculo').value = p.vehiculoId; }, 50);
    document.getElementById('poliza-tipo').value     = p.tipo;
    document.getElementById('poliza-inicio').value   = p.fechaIni;
    document.getElementById('poliza-fin').value      = p.fechaFin;
    document.getElementById('poliza-prima').value    = p.prima;
    document.getElementById('poliza-cobertura').value= p.cobertura || '';
    document.getElementById('poliza-estado').value   = p.estado;
    document.getElementById('poliza-obs').value      = p.obs || '';
    document.getElementById('modal-poliza-title').textContent = 'Editar Póliza';
  }, 10);
}

function eliminarPoliza(id) {
  if (!confirm('¿Eliminar esta póliza?')) return;
  DB.polizas = DB.polizas.filter(p => p.id !== id);
  DB.pagos   = DB.pagos.filter(pg => pg.polizaId !== id);
  save(); renderPolizas(); updateDashboard();
  toast('Póliza eliminada', 'warn');
}

function verDetallePoliza(id) {
  const p = DB.polizas.find(x => x.id === id);
  if (!p) return;
  const pagos = DB.pagos.filter(pg => pg.polizaId === id);
  const totalPagado = pagos.reduce((s, pg) => s + Number(pg.monto), 0);
  const est = polizaEstadoAuto(p);

  document.getElementById('modal-detalle-title').textContent = 'Detalle de Póliza — ' + p.numero;
  document.getElementById('modal-detalle-body').innerHTML = `
    <div class="result-card">
      <div class="result-card-title">Datos de la Póliza</div>
      ${row('Número',    p.numero)}
      ${row('Cliente',   getNombreCliente(p.clienteId))}
      ${row('Vehículo',  getPlacaVehiculo(p.vehiculoId))}
      ${row('Tipo',      p.tipo)}
      ${row('Inicio',    fmtDate(p.fechaIni))}
      ${row('Vencimiento', fmtDate(p.fechaFin))}
      ${row('Prima',     fmtMoney(p.prima))}
      ${row('Cobertura', fmtMoney(p.cobertura))}
      ${row('Estado',    `<span class="badge badge-${est.toLowerCase()}">${est}</span>`)}
      ${p.obs ? row('Observaciones', p.obs) : ''}
    </div>
    <div class="result-card" style="margin-top:12px">
      <div class="result-card-title">Pagos Registrados (${pagos.length}) — Total: ${fmtMoney(totalPagado)}</div>
      ${pagos.length === 0 ? '<div class="text-muted" style="font-size:13px">Sin pagos registrados</div>' :
        pagos.map(pg => `<div class="result-row">
          <span class="result-key">${fmtDate(pg.fecha)} · ${pg.metodo}</span>
          <span class="result-val" style="color:var(--success)">${fmtMoney(pg.monto)}</span>
        </div>`).join('')
      }
    </div>`;
  openModal('modal-detalle');
}

// ──────────────────────────────────────────────────────
// RENOVAR PÓLIZAS
// ──────────────────────────────────────────────────────
function abrirRenovar(id) {
  const p = DB.polizas.find(x => x.id === id);
  if (!p) return;
  document.getElementById('renovar-id').value  = p.id;
  document.getElementById('renovar-info').value = `${p.numero} — ${getNombreCliente(p.clienteId)} — ${p.tipo}`;
  document.getElementById('renovar-inicio').value = p.fechaFin; // nueva inicio = antiguo fin
  document.getElementById('renovar-fin').value    = '';
  document.getElementById('renovar-prima').value  = '';
  openModal('modal-renovar');
}

function confirmarRenovar() {
  const id      = document.getElementById('renovar-id').value;
  const inicio  = document.getElementById('renovar-inicio').value;
  const fin     = document.getElementById('renovar-fin').value;
  const prima   = document.getElementById('renovar-prima').value;

  if (!inicio || !fin) { toast('Fechas requeridas', 'error'); return; }
  if (fin <= inicio)   { toast('La fecha fin debe ser posterior al inicio', 'error'); return; }

  const idx = DB.polizas.findIndex(p => p.id === id);
  if (idx < 0) return;

  DB.polizas[idx].fechaIni = inicio;
  DB.polizas[idx].fechaFin = fin;
  DB.polizas[idx].estado   = 'Activa';
  if (prima) DB.polizas[idx].prima = prima;

  save(); closeModal('modal-renovar'); renderPolizas(); updateDashboard();
  toast('Póliza renovada correctamente', 'success');
}

// ──────────────────────────────────────────────────────
// PAGOS
// ──────────────────────────────────────────────────────
function fillPagoPolizas() {
  const sel = document.getElementById('pago-poliza');
  sel.innerHTML = '<option value="">— Seleccione póliza —</option>' +
    DB.polizas
      .filter(p => polizaEstadoAuto(p) === 'Activa')
      .map(p => `<option value="${p.id}">${p.numero} — ${getNombreCliente(p.clienteId)}</option>`)
      .join('');
}

function resetPagoForm() {
  document.getElementById('pago-poliza').value     = '';
  document.getElementById('pago-monto').value      = '';
  document.getElementById('pago-fecha').value      = today();
  document.getElementById('pago-metodo').value     = 'Efectivo';
  document.getElementById('pago-concepto').value   = 'Prima mensual';
  document.getElementById('pago-referencia').value = '';
}

function guardarPago() {
  const polizaId  = document.getElementById('pago-poliza').value;
  const monto     = document.getElementById('pago-monto').value;
  const fecha     = document.getElementById('pago-fecha').value;
  const metodo    = document.getElementById('pago-metodo').value;
  const concepto  = document.getElementById('pago-concepto').value;
  const referencia= document.getElementById('pago-referencia').value.trim();

  if (!polizaId || !monto || !fecha) {
    toast('Póliza, monto y fecha son obligatorios', 'error'); return;
  }

  DB.pagos.push({ id: uid(), polizaId, monto, fecha, metodo, concepto, referencia, createdAt: Date.now() });
  save(); closeModal('modal-pago'); renderPagos(); updateDashboard();
  toast('Pago registrado correctamente');
}

function renderPagos() {
  const q = (document.getElementById('search-pagos')?.value || '').toLowerCase();
  const rows = DB.pagos
    .filter(pg => {
      const pol = DB.polizas.find(p => p.id === pg.polizaId);
      const cli = pol ? getNombreCliente(pol.clienteId).toLowerCase() : '';
      return (pol ? pol.numero.toLowerCase().includes(q) : false) || cli.includes(q);
    })
    .sort((a,b) => b.createdAt - a.createdAt);

  const tbody = document.getElementById('tbody-pagos');
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-td">No hay pagos registrados</td></tr>`;
    return;
  }

  let counter = rows.length;
  tbody.innerHTML = rows.map(pg => {
    const pol = DB.polizas.find(p => p.id === pg.polizaId);
    const cliente = pol ? getNombreCliente(pol.clienteId) : '—';
    return `
    <tr>
      <td class="text-muted" style="font-size:12px">PAG-${String(counter--).padStart(4,'0')}</td>
      <td style="font-weight:700;color:var(--accent);font-size:12px">${pol ? pol.numero : '—'}</td>
      <td>${cliente}</td>
      <td style="color:var(--success);font-weight:600">${fmtMoney(pg.monto)}</td>
      <td>${fmtDate(pg.fecha)}</td>
      <td>${pg.metodo}</td>
      <td>${pg.concepto}${pg.referencia ? ' <span class="text-muted" style="font-size:11px">· '+pg.referencia+'</span>' : ''}</td>
    </tr>`;
  }).join('');
}

// ──────────────────────────────────────────────────────
// CONSULTAS
// ──────────────────────────────────────────────────────
function consultarCliente() {
  const q = document.getElementById('consulta-cliente-q').value.trim().toLowerCase();
  const div = document.getElementById('consulta-cliente-result');
  if (!q) { div.innerHTML = '<div class="text-muted" style="font-size:13px">Ingrese un término de búsqueda</div>'; return; }

  const found = DB.clientes.filter(c =>
    c.nombre.toLowerCase().includes(q) || c.cedula.includes(q) || (c.email||'').toLowerCase().includes(q)
  );

  if (found.length === 0) {
    div.innerHTML = '<div class="text-muted" style="font-size:13px">No se encontraron clientes</div>'; return;
  }

  div.innerHTML = found.map(c => {
    const vehs  = DB.vehiculos.filter(v => v.propietarioId === c.id).length;
    const pols  = DB.polizas.filter(p => p.clienteId === c.id).length;
    const activas = DB.polizas.filter(p => p.clienteId === c.id && polizaEstadoAuto(p) === 'Activa').length;
    return `
    <div class="result-card">
      <div class="result-card-title">${c.nombre}</div>
      ${row('Cédula/NIT', c.cedula)}
      ${row('Teléfono',   c.telefono)}
      ${row('Email',      c.email||'—')}
      ${row('Ciudad',     c.ciudad||'—')}
      ${row('Vehículos',  vehs)}
      ${row('Pólizas',    pols + ' total / <span style="color:var(--success)">' + activas + ' activas</span>')}
    </div>`;
  }).join('');
}

function consultarVehiculo() {
  const q = document.getElementById('consulta-vehiculo-q').value.trim().toLowerCase();
  const div = document.getElementById('consulta-vehiculo-result');
  if (!q) { div.innerHTML = '<div class="text-muted" style="font-size:13px">Ingrese un término de búsqueda</div>'; return; }

  const found = DB.vehiculos.filter(v =>
    v.placa.toLowerCase().includes(q) || v.marca.toLowerCase().includes(q) ||
    v.modelo.toLowerCase().includes(q) || getNombreCliente(v.propietarioId).toLowerCase().includes(q)
  );

  if (found.length === 0) {
    div.innerHTML = '<div class="text-muted" style="font-size:13px">No se encontraron vehículos</div>'; return;
  }

  div.innerHTML = found.map(v => {
    const pols = DB.polizas.filter(p => p.vehiculoId === v.id);
    const activa = pols.find(p => polizaEstadoAuto(p) === 'Activa');
    return `
    <div class="result-card">
      <div class="result-card-title">${v.placa} — ${v.marca} ${v.modelo}</div>
      ${row('Tipo',        v.tipo)}
      ${row('Año',         v.anio)}
      ${row('Color',       v.color||'—')}
      ${row('VIN',         v.vin||'—')}
      ${row('Propietario', getNombreCliente(v.propietarioId))}
      ${row('Valor',       fmtMoney(v.valor))}
      ${row('Póliza Activa', activa ? `<span class="badge badge-activa">${activa.numero}</span>` : '<span class="badge badge-vencida">Sin póliza activa</span>')}
    </div>`;
  }).join('');
}

// ──────────────────────────────────────────────────────
// HISTORIAL
// ──────────────────────────────────────────────────────
function fillHistorialSelect() {
  const sel = document.getElementById('historial-cliente-sel');
  sel.innerHTML = '<option value="">— Seleccione un cliente —</option>' +
    DB.clientes.map(c => `<option value="${c.id}">${c.nombre} (${c.cedula})</option>`).join('');
}

function verHistorial() {
  const clienteId = document.getElementById('historial-cliente-sel').value;
  const div = document.getElementById('historial-result');
  if (!clienteId) { div.innerHTML = '<div class="empty-state">Seleccione un cliente</div>'; return; }

  const cliente = DB.clientes.find(c => c.id === clienteId);
  const polizas = DB.polizas
    .filter(p => p.clienteId === clienteId)
    .sort((a,b) => new Date(b.fechaIni) - new Date(a.fechaIni));

  if (polizas.length === 0) {
    div.innerHTML = `<div class="empty-state">El cliente <strong>${cliente.nombre}</strong> no tiene historial de seguros</div>`;
    return;
  }

  const items = polizas.map(p => {
    const pagos = DB.pagos.filter(pg => pg.polizaId === p.id);
    const totalPagado = pagos.reduce((s, pg) => s + Number(pg.monto), 0);
    const est = polizaEstadoAuto(p);
    const veh = DB.vehiculos.find(v => v.id === p.vehiculoId);
    return `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-card">
        <div class="timeline-card-header">
          <span class="timeline-num">${p.numero}</span>
          <span class="badge badge-${est.toLowerCase()}">${est}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:13px">
          <div>${row('Tipo', p.tipo)}</div>
          <div>${row('Prima', fmtMoney(p.prima))}</div>
          <div>${row('Inicio', fmtDate(p.fechaIni))}</div>
          <div>${row('Vencimiento', fmtDate(p.fechaFin))}</div>
          <div>${row('Vehículo', veh ? veh.placa + ' ' + veh.marca : '—')}</div>
          <div>${row('Pagos', pagos.length + ' · ' + fmtMoney(totalPagado))}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  div.innerHTML = `
    <div style="margin-bottom:16px">
      <h3 style="font-family:var(--font-head);font-size:16px;color:var(--text-primary)">
        Historial de ${cliente.nombre}
      </h3>
      <div style="font-size:13px;color:var(--text-muted)">${polizas.length} póliza(s) registradas</div>
    </div>
    <div class="historial-timeline">${items}</div>`;
}

// ──────────────────────────────────────────────────────
// REPORTES
// ──────────────────────────────────────────────────────
function setReporteTab(tab, el) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  currentReporteTab = tab;
  renderReporte(tab);
}

function renderReporte(tab) {
  const container = document.getElementById('reporte-container');
  const fecha = new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' });

  if (tab === 'activas') {
    const rows = DB.polizas.filter(p => polizaEstadoAuto(p) === 'Activa');
    container.innerHTML = reporteHeader('Pólizas Activas', `${rows.length} registros · ${fecha}`) +
      `<div style="overflow-x:auto"><table class="data-table"><thead><tr>
        <th>#Póliza</th><th>Cliente</th><th>Vehículo</th><th>Tipo</th><th>Vencimiento</th><th>Prima</th>
      </tr></thead><tbody>` +
      (rows.length === 0 ? `<tr><td colspan="6" class="empty-td">Sin pólizas activas</td></tr>` :
        rows.map(p => `<tr>
          <td style="font-weight:700;color:var(--accent);font-size:12px">${p.numero}</td>
          <td>${getNombreCliente(p.clienteId)}</td>
          <td>${getPlacaVehiculo(p.vehiculoId)}</td>
          <td>${p.tipo}</td>
          <td>${fmtDate(p.fechaFin)}</td>
          <td style="color:var(--success);font-weight:600">${fmtMoney(p.prima)}</td>
        </tr>`).join('')
      ) + `</tbody></table></div>`;

  } else if (tab === 'vencidas') {
    const rows = DB.polizas.filter(p => polizaEstadoAuto(p) === 'Vencida' || p.estado === 'Cancelada');
    container.innerHTML = reporteHeader('Pólizas Vencidas / Canceladas', `${rows.length} registros · ${fecha}`) +
      `<div style="overflow-x:auto"><table class="data-table"><thead><tr>
        <th>#Póliza</th><th>Cliente</th><th>Tipo</th><th>Vencimiento</th><th>Estado</th>
      </tr></thead><tbody>` +
      (rows.length === 0 ? `<tr><td colspan="5" class="empty-td">Sin pólizas vencidas</td></tr>` :
        rows.map(p => `<tr>
          <td style="font-weight:700;color:var(--text-muted);font-size:12px">${p.numero}</td>
          <td>${getNombreCliente(p.clienteId)}</td>
          <td>${p.tipo}</td>
          <td>${fmtDate(p.fechaFin)}</td>
          <td><span class="badge badge-${polizaEstadoAuto(p).toLowerCase()}">${polizaEstadoAuto(p)}</span></td>
        </tr>`).join('')
      ) + `</tbody></table></div>`;

  } else if (tab === 'pagos') {
    const rows = [...DB.pagos].sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    const total = rows.reduce((s, p) => s + Number(p.monto), 0);
    container.innerHTML = reporteHeader('Reporte de Pagos', `${rows.length} pagos · Total: ${fmtMoney(total)} · ${fecha}`) +
      `<div style="overflow-x:auto"><table class="data-table"><thead><tr>
        <th>Póliza</th><th>Cliente</th><th>Monto</th><th>Fecha</th><th>Método</th><th>Concepto</th>
      </tr></thead><tbody>` +
      (rows.length === 0 ? `<tr><td colspan="6" class="empty-td">Sin pagos registrados</td></tr>` :
        rows.map(pg => {
          const pol = DB.polizas.find(p => p.id === pg.polizaId);
          return `<tr>
            <td style="font-size:12px;color:var(--accent)">${pol ? pol.numero : '—'}</td>
            <td>${pol ? getNombreCliente(pol.clienteId) : '—'}</td>
            <td style="color:var(--success);font-weight:600">${fmtMoney(pg.monto)}</td>
            <td>${fmtDate(pg.fecha)}</td>
            <td>${pg.metodo}</td>
            <td>${pg.concepto}</td>
          </tr>`;
        }).join('')
      ) + `</tbody></table></div>`;

  } else if (tab === 'clientes') {
    container.innerHTML = reporteHeader('Reporte de Clientes', `${DB.clientes.length} clientes · ${fecha}`) +
      `<div style="overflow-x:auto"><table class="data-table"><thead><tr>
        <th>Nombre</th><th>Cédula</th><th>Teléfono</th><th>Ciudad</th><th>Vehículos</th><th>Pólizas Activas</th>
      </tr></thead><tbody>` +
      (DB.clientes.length === 0 ? `<tr><td colspan="6" class="empty-td">Sin clientes registrados</td></tr>` :
        DB.clientes.map(c => {
          const vehs   = DB.vehiculos.filter(v => v.propietarioId === c.id).length;
          const activas = DB.polizas.filter(p => p.clienteId === c.id && polizaEstadoAuto(p) === 'Activa').length;
          return `<tr>
            <td style="font-weight:600;color:var(--text-primary)">${c.nombre}</td>
            <td>${c.cedula}</td>
            <td>${c.telefono}</td>
            <td>${c.ciudad||'—'}</td>
            <td style="text-align:center">${vehs}</td>
            <td style="text-align:center;color:var(--success);font-weight:600">${activas}</td>
          </tr>`;
        }).join('')
      ) + `</tbody></table></div>`;
  }
}

function reporteHeader(title, meta) {
  return `<div class="reporte-header">
    <div>
      <div class="reporte-title">${title}</div>
      <div class="reporte-meta">${meta}</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <div class="brand-icon" style="width:32px;height:32px;font-size:11px">DS</div>
      <span style="font-family:var(--font-head);font-size:13px;font-weight:700;color:var(--text-primary)">DriverShield</span>
    </div>
  </div>`;
}

function imprimirReporte() { window.print(); }

// ──────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────
function row(key, val) {
  return `<div class="result-row">
    <span class="result-key">${key}</span>
    <span class="result-val">${val}</span>
  </div>`;
}

// ──────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Fecha en topbar
  const now = new Date();
  document.getElementById('topbarDate').textContent =
    now.toLocaleDateString('es-CO', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });

  // Set default fecha pago
  const pd = document.getElementById('pago-fecha');
  if (pd) pd.value = today();

  // Auto-update polizas estado
  DB.polizas.forEach(p => {
    const auto = polizaEstadoAuto(p);
    if (p.estado !== 'Cancelada' && p.estado !== auto) p.estado = auto;
  });
  save();

  // Init dashboard
  updateDashboard();
  showSection('dashboard');
});
