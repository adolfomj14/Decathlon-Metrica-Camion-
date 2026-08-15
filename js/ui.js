/**
 * js/ui.js
 * Controlador de interfaz de usuario, renderizado de listas, tablas, modales, toasts y gráficos Chart.js.
 */

const AppUI = (() => {

  // Instancias de Gráficos Chart.js
  let chartTiempoDia = null;
  let chartColaboradoresVsTiempo = null;
  let chartEvolucionPermanente = null;

  // Cache de elementos DOM
  const elements = {};

  function initElements() {
    elements.navTabs = document.querySelectorAll('.nav-tab');
    elements.viewPanels = document.querySelectorAll('.view-panel');
    elements.themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    // Dashboard elements
    elements.kpiContainer = document.getElementById('kpi-container');
    elements.tablePermanentesBody = document.querySelector('#table-permanentes tbody');
    elements.tableColaboradoresBody = document.querySelector('#table-colaboradores tbody');
    elements.tableRecentBody = document.querySelector('#table-recent tbody');

    // Form elements
    elements.formRegistro = document.getElementById('form-registro');
    elements.selectPermanente = document.getElementById('reg-permanente');
    elements.inputFecha = document.getElementById('reg-fecha');
    elements.inputHoraInicio = document.getElementById('reg-hora-inicio');
    elements.inputHoraFin = document.getElementById('reg-hora-fin');
    elements.calculatedTimeBadge = document.getElementById('calculated-time-badge');
    elements.inputCantidad = document.getElementById('reg-cantidad');
    elements.inputColaboradores = document.getElementById('reg-colaboradores');
    elements.inputObservaciones = document.getElementById('reg-observaciones');
    elements.btnSaveRegistro = document.getElementById('btn-save-registro');

    // Filtros Dashboard
    elements.filterFechaDesde = document.getElementById('filter-fecha-desde');
    elements.filterFechaHasta = document.getElementById('filter-fecha-hasta');
    elements.filterPermanente = document.getElementById('filter-permanente');
    elements.filterColaboradores = document.getElementById('filter-colaboradores');
    elements.filterDiaSemana = document.getElementById('filter-dia-semana');
    elements.btnResetFilters = document.getElementById('btn-reset-filters');

    // Historial Registros
    elements.tableHistorialBody = document.querySelector('#table-historial tbody');
    elements.historialSearchInput = document.getElementById('historial-search-input');

    // Modales
    elements.modalPermanente = document.getElementById('modal-permanente');
    elements.formPermanente = document.getElementById('form-permanente');
    elements.inputPermanenteNombre = document.getElementById('perm-nombre');
    elements.checkPermanenteActivo = document.getElementById('perm-activo');

    elements.modalDeletePermanente = document.getElementById('modal-delete-permanente');
    elements.formDeletePermanente = document.getElementById('form-delete-permanente');
    elements.deletePermNameLabel = document.getElementById('delete-perm-name-label');
    elements.deletePermPasswordInput = document.getElementById('delete-perm-password');
    elements.deletePermError = document.getElementById('delete-perm-error');
    elements.btnCloseModalDeletePerm = document.getElementById('btn-close-modal-delete-perm');
    elements.btnCancelDeletePerm = document.getElementById('btn-cancel-delete-perm');

    elements.toastContainer = document.getElementById('toast-container');
  }

  // ---------------------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // ---------------------------------------------------------------------------

  function showToast(message, type = 'info') {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';
    if (type === 'warning') icon = 'warning';

    toast.innerHTML = `
      <span class="material-symbols-outlined">${icon}</span>
      <span>${message}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ---------------------------------------------------------------------------
  // NAVEGACIÓN Y CAMBIO DE VISTAS
  // ---------------------------------------------------------------------------

  function switchTab(targetViewId) {
    if (!elements.navTabs) return;

    elements.navTabs.forEach(tab => {
      if (tab.getAttribute('data-view') === targetViewId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    elements.viewPanels.forEach(panel => {
      if (panel.id === targetViewId) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // RENDERIZADO DASHBOARD GENERAL
  // ---------------------------------------------------------------------------

  function renderDashboard(generalStats, statsByPermanente, statsByDay, statsByColab, recentRegistros, callbacks = {}) {
    // 1. Tarjetas KPI
    if (elements.kpiContainer) {
      elements.kpiContainer.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-icon info"><span class="material-symbols-outlined">assignment</span></div>
          <div class="kpi-data">
            <span class="kpi-value">${generalStats.totalRegistros}</span>
            <span class="kpi-label">Total Registros</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon success"><span class="material-symbols-outlined">inventory_2</span></div>
          <div class="kpi-data">
            <span class="kpi-value">${generalStats.totalMercancia.toLocaleString()}</span>
            <span class="kpi-label">Cantidad Total</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon warning"><span class="material-symbols-outlined">schedule</span></div>
          <div class="kpi-data">
            <span class="kpi-value">${generalStats.tiempoPromedioFormateado}</span>
            <span class="kpi-label">Tiempo Promedio</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon"><span class="material-symbols-outlined">speed</span></div>
          <div class="kpi-data">
            <span class="kpi-value">${generalStats.promedioCantidadesPorHora} / h</span>
            <span class="kpi-label">Cantidades / Hora</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon info"><span class="material-symbols-outlined">group</span></div>
          <div class="kpi-data">
            <span class="kpi-value">${generalStats.promedioColaboradores}</span>
            <span class="kpi-label">Colaboradores Prom.</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon success"><span class="material-symbols-outlined">timer_10</span></div>
          <div class="kpi-data">
            <span class="kpi-value">${generalStats.mejorTiempoFormateado}</span>
            <span class="kpi-label">Mejor Tiempo</span>
          </div>
        </div>
      `;
    }

    // 2. Tabla Comparativa por Permanente
    if (elements.tablePermanentesBody) {
      if (statsByPermanente.length === 0) {
        elements.tablePermanentesBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Sin datos para mostrar</td></tr>`;
      } else {
        elements.tablePermanentesBody.innerHTML = statsByPermanente.map(p => `
          <tr>
            <td><strong>${p.nombre}</strong></td>
            <td>${p.count}</td>
            <td>${p.tiempoPromedioFormateado}</td>
            <td>${p.cantPromedio.toLocaleString()}</td>
            <td><strong>${p.cantHoraPromedio}</strong> u/h</td>
            <td>${p.colabPromedio} hab</td>
            <td><span class="badge badge-active">${p.productividadPromedio}</span></td>
          </tr>
        `).join('');
      }
    }

    // 3. Tabla por Número de Colaboradores
    if (elements.tableColaboradoresBody) {
      if (statsByColab.length === 0) {
        elements.tableColaboradoresBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Sin datos para mostrar</td></tr>`;
      } else {
        elements.tableColaboradoresBody.innerHTML = statsByColab.map(c => `
          <tr>
            <td><strong>${c.colaboradores} Colaboradores</strong></td>
            <td>${c.count}</td>
            <td>${c.cantPromedio.toLocaleString()}</td>
            <td>${c.tiempoPromedioFormateado}</td>
            <td><strong>${c.cantHoraPromedio}</strong> u/h</td>
          </tr>
        `).join('');
      }
    }

    // 4. Tabla de Registros Recientes
    if (elements.tableRecentBody) {
      const topRecent = recentRegistros.slice(0, 5);
      if (topRecent.length === 0) {
        elements.tableRecentBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted);">Sin registros aún</td></tr>`;
      } else {
        elements.tableRecentBody.innerHTML = topRecent.map(r => `
          <tr>
            <td>${r.fecha}</td>
            <td><strong>${r.permanenteNombre}</strong></td>
            <td>${r.horaInicio} - ${r.horaFin}</td>
            <td><strong>${r.duracionFormateada}</strong></td>
            <td>${r.cantidad} u</td>
            <td>${r.colaboradores} pers.</td>
            <td><strong>${r.cantidadesPorHora}</strong> u/h</td>
            <td><span style="font-size:0.8rem; color:var(--text-muted);">${r.observaciones || '-'}</span></td>
            <td>
              <button class="btn btn-outlined btn-sm btn-edit-reg" data-id="${r.id}" title="Editar Tiempo u Operación">
                <span class="material-symbols-outlined" style="font-size:16px;">edit</span>
              </button>
              <button class="btn btn-outlined btn-sm btn-delete-reg" data-id="${r.id}" title="Eliminar" style="color:var(--danger); border-color:rgba(239,68,68,0.3);">
                <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
              </button>
            </td>
          </tr>
        `).join('');

        // Event listeners para botones de accion en la tabla reciente
        elements.tableRecentBody.querySelectorAll('.btn-edit-reg').forEach(btn => {
          btn.addEventListener('click', () => callbacks.onEdit && callbacks.onEdit(btn.getAttribute('data-id')));
        });
        elements.tableRecentBody.querySelectorAll('.btn-delete-reg').forEach(btn => {
          btn.addEventListener('click', () => callbacks.onDelete && callbacks.onDelete(btn.getAttribute('data-id')));
        });
      }
    }

    // 5. Renderizar Gráficos Chart.js (Gráficos de Línea)
    renderChartTiempoDia(statsByDay);
    renderChartColaboradores(statsByColab);
  }

  // ---------------------------------------------------------------------------
  // GRÁFICOS DE LÍNEA FLUIDOS CON CHART.JS
  // ---------------------------------------------------------------------------

  function renderChartTiempoDia(statsByDay) {
    const canvas = document.getElementById('chart-tiempo-dia');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = statsByDay.map(d => d.nombreDia);
    const dataTiempos = statsByDay.map(d => d.tiempoPromedioMins);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    if (chartTiempoDia) chartTiempoDia.destroy();

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(0, 130, 195, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 130, 195, 0.01)');

    chartTiempoDia = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Tiempo Promedio (Minutos)',
          data: dataTiempos,
          borderColor: '#0082c3',
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4, // Curva suave
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: '#0082c3',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            padding: 12,
            callbacks: {
              label: (ctx) => ` Tiempo Promedio: ${AppData.formatMinutesToReadable(ctx.raw)}`
            }
          }
        },
        scales: {
          x: { ticks: { color: textColor, font: { weight: '500' } }, grid: { display: false } },
          y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true }
        }
      }
    });
  }

  function renderChartColaboradores(statsByColab) {
    const canvas = document.getElementById('chart-colaboradores');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = statsByColab.map(c => `${c.colaboradores} Personas`);
    const dataTiempos = statsByColab.map(c => c.tiempoPromedioMins);
    const dataCantHora = statsByColab.map(c => c.cantHoraPromedio);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    if (chartColaboradoresVsTiempo) chartColaboradoresVsTiempo.destroy();

    const ctx = canvas.getContext('2d');
    const gradTiempo = ctx.createLinearGradient(0, 0, 0, 280);
    gradTiempo.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradTiempo.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

    const gradCant = ctx.createLinearGradient(0, 0, 0, 280);
    gradCant.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
    gradCant.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

    chartColaboradoresVsTiempo = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Tiempo Promedio (min)',
            data: dataTiempos,
            borderColor: '#3b82f6',
            borderWidth: 3,
            backgroundColor: gradTiempo,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#3b82f6',
            yAxisID: 'y'
          },
          {
            label: 'Cantidades / Hora',
            data: dataCantHora,
            borderColor: '#10b981',
            borderWidth: 3,
            backgroundColor: gradCant,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#10b981',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            padding: 12,
            callbacks: {
              label: (ctx) => ctx.dataset.label.includes('Tiempo') 
                ? ` ${ctx.dataset.label}: ${AppData.formatMinutesToReadable(ctx.raw)}`
                : ` ${ctx.dataset.label}: ${ctx.raw} u/h`
            }
          }
        },
        scales: {
          x: { ticks: { color: textColor, font: { weight: '500' } }, grid: { display: false } },
          y: { type: 'linear', display: true, position: 'left', ticks: { color: textColor }, grid: { color: gridColor } },
          y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: textColor } }
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // HISTORIAL COMPLETO DE REGISTROS
  // ---------------------------------------------------------------------------

  function renderHistorialTable(registros, callbacks = {}) {
    if (!elements.tableHistorialBody) return;

    if (registros.length === 0) {
      elements.tableHistorialBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--text-muted); padding:24px;">No hay registros encontrados.</td></tr>`;
      return;
    }

    elements.tableHistorialBody.innerHTML = registros.map(r => `
      <tr>
        <td>${r.fecha}</td>
        <td><strong>${r.permanenteNombre}</strong></td>
        <td>${r.horaInicio}</td>
        <td>${r.horaFin}</td>
        <td><strong>${r.duracionFormateada}</strong></td>
        <td>${r.cantidad} u</td>
        <td>${r.colaboradores} hab</td>
        <td><strong>${r.cantidadesPorHora}</strong> u/h</td>
        <td><span style="font-size:0.8rem; color:var(--text-muted);">${r.observaciones || '-'}</span></td>
        <td>
          <button class="btn btn-outlined btn-sm btn-edit-reg" data-id="${r.id}" title="Editar">
            <span class="material-symbols-outlined" style="font-size:16px;">edit</span>
          </button>
          <button class="btn btn-outlined btn-sm btn-delete-reg" data-id="${r.id}" title="Eliminar" style="color:var(--danger); border-color:rgba(239,68,68,0.3);">
            <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
          </button>
        </td>
      </tr>
    `).join('');

    // Listener para botones de acción en tabla
    elements.tableHistorialBody.querySelectorAll('.btn-edit-reg').forEach(btn => {
      btn.addEventListener('click', () => callbacks.onEdit && callbacks.onEdit(btn.getAttribute('data-id')));
    });

    elements.tableHistorialBody.querySelectorAll('.btn-delete-reg').forEach(btn => {
      btn.addEventListener('click', () => callbacks.onDelete && callbacks.onDelete(btn.getAttribute('data-id')));
    });
  }

  // ---------------------------------------------------------------------------
  // LISTA Y PERFIL DE PERMANENTES
  // ---------------------------------------------------------------------------

  function populatePermanenteDropdowns(permanentes) {
    const activePermanentes = permanentes.filter(p => p.activo);
    
    // Select de formulario
    if (elements.selectPermanente) {
      elements.selectPermanente.innerHTML = `<option value="">-- Seleccionar Permanente --</option>` +
        activePermanentes.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    }

    // Select de filtro dashboard
    if (elements.filterPermanente) {
      elements.filterPermanente.innerHTML = `<option value="todos">Todos los Permanentes</option>` +
        permanentes.map(p => `<option value="${p.id}">${p.nombre} ${!p.activo ? '(Inactivo)' : ''}</option>`).join('');
    }
  }

  function renderPermanentesList(permanentes, callbacks = {}) {
    const container = document.getElementById('permanentes-grid-container');
    if (!container) return;

    if (permanentes.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:30px;">No existen permanentes registrados aún.</div>`;
      return;
    }

    container.innerHTML = permanentes.map(p => `
      <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div>
            <h3 style="font-size:1.1rem; font-weight:700;">${p.nombre}</h3>
            <span style="font-size:0.75rem; color:var(--text-muted);">Registrado el: ${p.createdAt ? p.createdAt.split('T')[0] : 'N/A'}</span>
          </div>
          <span class="badge ${p.activo ? 'badge-active' : 'badge-inactive'}">
            ${p.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        
        <div style="display:flex; gap:8px; margin-top:16px;">
          <button class="btn btn-outlined btn-sm btn-view-perm-profile" data-id="${p.id}" style="flex:1;" title="Ver Estadísticas">
            <span class="material-symbols-outlined" style="font-size:16px;">analytics</span> Detalle
          </button>
          <button class="btn btn-outlined btn-sm btn-toggle-perm" data-id="${p.id}" data-active="${p.activo}" title="${p.activo ? 'Desactivar' : 'Activar'}">
            <span class="material-symbols-outlined" style="font-size:16px;">${p.activo ? 'toggle_on' : 'toggle_off'}</span>
          </button>
          <button class="btn btn-outlined btn-sm btn-delete-perm" data-id="${p.id}" data-name="${p.nombre}" title="Eliminar Colaborador" style="color:var(--danger); border-color:rgba(239,68,68,0.3);">
            <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-view-perm-profile').forEach(btn => {
      btn.addEventListener('click', () => callbacks.onViewProfile && callbacks.onViewProfile(btn.getAttribute('data-id')));
    });

    container.querySelectorAll('.btn-toggle-perm').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const currentActive = btn.getAttribute('data-active') === 'true';
        callbacks.onToggleStatus && callbacks.onToggleStatus(id, !currentActive);
      });
    });

    container.querySelectorAll('.btn-delete-perm').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        callbacks.onDelete && callbacks.onDelete(id, name);
      });
    });
  }

  return {
    initElements,
    elements,
    showToast,
    switchTab,
    renderDashboard,
    renderHistorialTable,
    populatePermanenteDropdowns,
    renderPermanentesList
  };
})();
