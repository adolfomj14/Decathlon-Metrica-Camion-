/**
 * js/app.js
 * Controlador principal de la aplicación. Enlaza eventos DOM, ciclo de vida de datos y lógica de interfaz.
 */

document.addEventListener('DOMContentLoaded', () => {

  const AppState = {
    registros: [],
    permanentes: [],
    filters: {
      fechaDesde: '',
      fechaHasta: '',
      permanenteId: 'todos',
      colaboradores: 'todos',
      diaSemana: 'todos'
    },
    editingRegistroId: null,
    theme: localStorage.getItem('decathlon_theme') || 'system'
  };

  // ---------------------------------------------------------------------------
  // INICIALIZACIÓN
  // ---------------------------------------------------------------------------

  async function init() {
    AppUI.initElements();
    initTheme();
    bindTabNavigation();
    bindFormEvents();
    bindFilterEvents();
    bindPermanenteEvents();
    registerServiceWorker();

    await loadDataAndRender();
  }

  // ---------------------------------------------------------------------------
  // TEMA Y APARIENCIA
  // ---------------------------------------------------------------------------

  function initTheme() {
    applyTheme(AppState.theme);

    AppUI.elements.themeToggleBtn?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      AppState.theme = nextTheme;
      localStorage.setItem('decathlon_theme', nextTheme);
      applyTheme(nextTheme);
    });
  }

  function applyTheme(theme) {
    let effective = theme;
    if (theme === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effective);
    const icon = AppUI.elements.themeToggleBtn?.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = effective === 'dark' ? 'light_mode' : 'dark_mode';
  }

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS Y RENDERIZADO PRINCIPAL
  // ---------------------------------------------------------------------------

  async function loadDataAndRender() {
    try {
      // Supabase es la fuente primaria de datos (PRIMARY SOURCE OF TRUTH)
      AppState.permanentes = await AppStorage.getAllPermanentes();
      AppState.registros = await AppStorage.getAllRegistros();

      // Rellenar dropdowns de permanentes
      AppUI.populatePermanenteDropdowns(AppState.permanentes);

      // Renderizar Dashboard y Vistas
      refreshDashboard();
      refreshHistorial();
      refreshPermanentesView();
    } catch (err) {
      console.error('[App] Error cargando datos:', err);
      AppUI.showToast('Error al conectar con la base de datos: ' + err.message, 'error');
    }
  }

  function refreshDashboard() {
    // Filtrar registros según los filtros activos del dashboard
    const filtered = AppData.filterRegistros(AppState.registros, AppState.filters);

    const generalStats = AppData.getGeneralStats(filtered);
    const statsByPermanente = AppData.getStatsByPermanente(filtered, AppState.permanentes);
    const statsByDay = AppData.getStatsByDayOfWeek(filtered);
    const statsByColab = AppData.getStatsByColaboradores(filtered);

    AppUI.renderDashboard(
      generalStats,
      statsByPermanente,
      statsByDay,
      statsByColab,
      AppState.registros,
      {
        onEdit: (id) => editRegistro(id),
        onDelete: (id) => confirmDeleteRegistro(id)
      }
    );
  }

  function refreshHistorial() {
    const searchVal = (AppUI.elements.historialSearchInput?.value || '').toLowerCase().trim();
    let list = AppData.filterRegistros(AppState.registros, AppState.filters);

    if (searchVal) {
      list = list.filter(r => 
        r.permanenteNombre.toLowerCase().includes(searchVal) ||
        (r.observaciones && r.observaciones.toLowerCase().includes(searchVal)) ||
        r.fecha.includes(searchVal)
      );
    }

    AppUI.renderHistorialTable(list, {
      onEdit: (id) => editRegistro(id),
      onDelete: (id) => confirmDeleteRegistro(id)
    });
  }

  function refreshPermanentesView() {
    AppUI.renderPermanentesList(AppState.permanentes, {
      onViewProfile: (id) => openPermanenteProfile(id),
      onToggleStatus: (id, newStatus) => togglePermanenteStatus(id, newStatus),
      onDelete: (id, name) => openDeletePermanenteModal(id, name)
    });
  }

  // ---------------------------------------------------------------------------
  // NAVEGACIÓN ENTRE PESTAÑAS
  // ---------------------------------------------------------------------------

  function bindTabNavigation() {
    AppUI.elements.navTabs?.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetViewId = tab.getAttribute('data-view');
        AppUI.switchTab(targetViewId);
        
        if (targetViewId === 'view-dashboard') refreshDashboard();
        if (targetViewId === 'view-historial') refreshHistorial();
        if (targetViewId === 'view-permanentes') refreshPermanentesView();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // FORMULARIO NUEVO REGISTRO / EDICIÓN DE TIEMPO
  // ---------------------------------------------------------------------------

  let updateLiveTimeFn = null;

  function bindFormEvents() {
    // Establecer fecha de hoy por defecto
    if (AppUI.elements.inputFecha && !AppUI.elements.inputFecha.value) {
      AppUI.elements.inputFecha.value = new Date().toISOString().split('T')[0];
    }

    // Cálculo dinámico en vivo del tiempo al cambiar hora inicio o fin
    updateLiveTimeFn = () => {
      const hInicio = AppUI.elements.inputHoraInicio?.value;
      const hFin = AppUI.elements.inputHoraFin?.value;

      if (hInicio && hFin) {
        const mins = AppData.calculateDurationMinutes(hInicio, hFin);
        if (mins < 0) {
          AppUI.elements.calculatedTimeBadge.textContent = 'La hora final no puede ser anterior a la hora inicial.';
          AppUI.elements.calculatedTimeBadge.style.color = 'var(--danger)';
        } else {
          AppUI.elements.calculatedTimeBadge.textContent = `⏱️ Tiempo Calculado: ${AppData.formatMinutesToReadable(mins)} (${mins} minutos)`;
          AppUI.elements.calculatedTimeBadge.style.color = 'var(--primary)';
        }
      } else {
        AppUI.elements.calculatedTimeBadge.textContent = '';
      }
    };

    AppUI.elements.inputHoraInicio?.addEventListener('change', updateLiveTimeFn);
    AppUI.elements.inputHoraFin?.addEventListener('change', updateLiveTimeFn);

    // Botón cancelar edición
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    btnCancelEdit?.addEventListener('click', () => {
      resetFormState();
      AppUI.showToast('Edición cancelada.', 'info');
    });

    // Sugerencias de chips de observaciones
    document.querySelectorAll('.chip-obs').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-obs');
        const current = AppUI.elements.inputObservaciones.value;
        if (current) {
          AppUI.elements.inputObservaciones.value = current + '. ' + text;
        } else {
          AppUI.elements.inputObservaciones.value = text;
        }
      });
    });

    // Envío del formulario
    AppUI.elements.formRegistro?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitRegistroForm();
    });
  }

  function resetFormState() {
    AppState.editingRegistroId = null;
    AppUI.elements.formRegistro.reset();
    AppUI.elements.inputFecha.value = new Date().toISOString().split('T')[0];
    AppUI.elements.calculatedTimeBadge.textContent = '';
    AppUI.elements.btnSaveRegistro.textContent = 'Guardar Registro';

    const formTitle = document.getElementById('form-title');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    if (formTitle) {
      formTitle.innerHTML = `<span class="material-symbols-outlined" style="color:var(--primary);">edit_note</span> Registrar Operación de Descarga y Surtida`;
    }
    if (btnCancelEdit) btnCancelEdit.classList.add('hidden');
  }

  async function submitRegistroForm() {
    const permanenteId = AppUI.elements.selectPermanente.value;
    const fecha = AppUI.elements.inputFecha.value;
    const horaInicio = AppUI.elements.inputHoraInicio.value;
    const horaFin = AppUI.elements.inputHoraFin.value;
    const cantidad = parseInt(AppUI.elements.inputCantidad.value, 10);
    const colaboradores = parseInt(AppUI.elements.inputColaboradores.value, 10);
    const observaciones = AppUI.elements.inputObservaciones.value;

    // VALIDACIONES EXPLICITAS
    if (!permanenteId) {
      AppUI.showToast('Debes seleccionar un permanente responsable.', 'warning');
      return;
    }
    if (!fecha) {
      AppUI.showToast('La fecha es obligatoria.', 'warning');
      return;
    }
    if (!horaInicio || !horaFin) {
      AppUI.showToast('Las horas de inicio y fin son obligatorias.', 'warning');
      return;
    }

    const duracionMinutos = AppData.calculateDurationMinutes(horaInicio, horaFin);
    if (duracionMinutos <= 0) {
      AppUI.showToast('La hora final debe ser posterior a la hora de inicio.', 'error');
      return;
    }
    if (isNaN(cantidad) || cantidad <= 0) {
      AppUI.showToast('La cantidad de mercancía debe ser mayor que 0.', 'warning');
      return;
    }
    if (isNaN(colaboradores) || colaboradores <= 0) {
      AppUI.showToast('El número de colaboradores debe ser mayor que 0.', 'warning');
      return;
    }

    const permanenteObj = AppState.permanentes.find(p => p.id === permanenteId);

    const payload = {
      id: AppState.editingRegistroId,
      permanenteId,
      permanenteNombre: permanenteObj ? permanenteObj.nombre : 'Desconocido',
      fecha,
      horaInicio,
      horaFin,
      duracionMinutos,
      cantidad,
      colaboradores,
      observaciones
    };

    try {
      AppUI.elements.btnSaveRegistro.disabled = true;
      AppUI.elements.btnSaveRegistro.textContent = 'Guardando...';

      await AppStorage.saveRegistro(payload);

      AppUI.showToast(AppState.editingRegistroId ? 'Registro y tiempos actualizados correctamente.' : 'Operación de descarga registrada con éxito.', 'success');

      // Limpiar formulario y restablecer estado de edición
      resetFormState();

      // Recargar datos y cambiar a Dashboard
      await loadDataAndRender();
      AppUI.switchTab('view-dashboard');
    } catch (err) {
      AppUI.showToast('Error al guardar el registro: ' + err.message, 'error');
    } finally {
      AppUI.elements.btnSaveRegistro.disabled = false;
      if (!AppState.editingRegistroId) AppUI.elements.btnSaveRegistro.textContent = 'Guardar Registro';
    }
  }

  function editRegistro(id) {
    const reg = AppState.registros.find(r => r.id === id);
    if (!reg) return;

    AppState.editingRegistroId = reg.id;
    AppUI.elements.selectPermanente.value = reg.permanenteId;
    AppUI.elements.inputFecha.value = reg.fecha;
    AppUI.elements.inputHoraInicio.value = reg.horaInicio;
    AppUI.elements.inputHoraFin.value = reg.horaFin;
    AppUI.elements.inputCantidad.value = reg.cantidad;
    AppUI.elements.inputColaboradores.value = reg.colaboradores;
    AppUI.elements.inputObservaciones.value = reg.observaciones || '';
    
    // Disparar cálculo de tiempo visible
    if (updateLiveTimeFn) updateLiveTimeFn();

    const formTitle = document.getElementById('form-title');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    if (formTitle) {
      formTitle.innerHTML = `<span class="material-symbols-outlined" style="color:var(--warning);">edit</span> Editar Tiempos y Operación de Descarga`;
    }
    if (btnCancelEdit) btnCancelEdit.classList.remove('hidden');

    AppUI.elements.btnSaveRegistro.textContent = 'Actualizar Registro y Tiempos';
    AppUI.switchTab('view-form');
    AppUI.showToast('Modo edición activo. Puedes cambiar las horas de inicio/fin o datos y presionar Actualizar.', 'info');
  }

  async function confirmDeleteRegistro(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este registro de descarga?')) {
      try {
        await AppStorage.deleteRegistro(id);
        AppUI.showToast('Registro eliminado.', 'success');
        await loadDataAndRender();
      } catch (err) {
        AppUI.showToast('Error al eliminar registro: ' + err.message, 'error');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // EVENTOS DE FILTROS DASHBOARD
  // ---------------------------------------------------------------------------

  function bindFilterEvents() {
    const triggerFilterUpdate = () => {
      AppState.filters.fechaDesde = AppUI.elements.filterFechaDesde?.value || '';
      AppState.filters.fechaHasta = AppUI.elements.filterFechaHasta?.value || '';
      AppState.filters.permanenteId = AppUI.elements.filterPermanente?.value || 'todos';
      AppState.filters.colaboradores = AppUI.elements.filterColaboradores?.value || 'todos';
      AppState.filters.diaSemana = AppUI.elements.filterDiaSemana?.value || 'todos';

      refreshDashboard();
      refreshHistorial();
    };

    AppUI.elements.filterFechaDesde?.addEventListener('change', triggerFilterUpdate);
    AppUI.elements.filterFechaHasta?.addEventListener('change', triggerFilterUpdate);
    AppUI.elements.filterPermanente?.addEventListener('change', triggerFilterUpdate);
    AppUI.elements.filterColaboradores?.addEventListener('change', triggerFilterUpdate);
    AppUI.elements.filterDiaSemana?.addEventListener('change', triggerFilterUpdate);

    AppUI.elements.historialSearchInput?.addEventListener('input', refreshHistorial);

    AppUI.elements.btnResetFilters?.addEventListener('click', () => {
      if (AppUI.elements.filterFechaDesde) AppUI.elements.filterFechaDesde.value = '';
      if (AppUI.elements.filterFechaHasta) AppUI.elements.filterFechaHasta.value = '';
      if (AppUI.elements.filterPermanente) AppUI.elements.filterPermanente.value = 'todos';
      if (AppUI.elements.filterColaboradores) AppUI.elements.filterColaboradores.value = 'todos';
      if (AppUI.elements.filterDiaSemana) AppUI.elements.filterDiaSemana.value = 'todos';

      triggerFilterUpdate();
      AppUI.showToast('Filtros restablecidos.', 'info');
    });
  }

  // ---------------------------------------------------------------------------
  // GESTIÓN DE PERMANENTES (CRUD & ELIMINACIÓN CON CONTRASEÑA)
  // ---------------------------------------------------------------------------

  let targetDeletePermanenteId = null;

  function bindPermanenteEvents() {
    // Modal Crear Permanente
    document.getElementById('btn-add-permanente')?.addEventListener('click', () => {
      AppUI.elements.formPermanente.reset();
      AppUI.elements.checkPermanenteActivo.checked = true;
      AppUI.elements.modalPermanente.classList.remove('hidden');
    });

    document.getElementById('btn-close-modal-perm')?.addEventListener('click', () => {
      AppUI.elements.modalPermanente.classList.add('hidden');
    });

    AppUI.elements.formPermanente?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = AppUI.elements.inputPermanenteNombre.value.trim();
      const activo = AppUI.elements.checkPermanenteActivo.checked;

      if (!nombre) {
        AppUI.showToast('El nombre del permanente es obligatorio.', 'warning');
        return;
      }

      try {
        await AppStorage.savePermanente({ nombre, activo });
        AppUI.showToast(`Permanente "${nombre}" guardado correctamente.`, 'success');
        AppUI.elements.modalPermanente.classList.add('hidden');
        await loadDataAndRender();
      } catch (err) {
        AppUI.showToast('Error al guardar permanente: ' + err.message, 'error');
      }
    });

    // Modal Eliminar Permanente con Contraseña
    const closeDeleteModal = () => {
      targetDeletePermanenteId = null;
      if (AppUI.elements.modalDeletePermanente) {
        AppUI.elements.modalDeletePermanente.classList.add('hidden');
        AppUI.elements.formDeletePermanente.reset();
        AppUI.elements.deletePermError.classList.add('hidden');
      }
    };

    AppUI.elements.btnCloseModalDeletePerm?.addEventListener('click', closeDeleteModal);
    AppUI.elements.btnCancelDeletePerm?.addEventListener('click', closeDeleteModal);

    AppUI.elements.formDeletePermanente?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!targetDeletePermanenteId) return;

      const enteredPassword = AppUI.elements.deletePermPasswordInput.value.trim();
      const validPasswords = ['Eliminar', 'eliminar', (localStorage.getItem('admin_delete_password') || '').trim()].filter(Boolean);

      if (!validPasswords.includes(enteredPassword)) {
        AppUI.elements.deletePermError.classList.remove('hidden');
        AppUI.elements.deletePermPasswordInput.focus();
        return;
      }

      try {
        AppUI.elements.deletePermError.classList.add('hidden');
        await AppStorage.deletePermanente(targetDeletePermanenteId);
        AppUI.showToast('Colaborador eliminado con éxito del sistema.', 'success');
        closeDeleteModal();
        await loadDataAndRender();
      } catch (err) {
        AppUI.showToast('Error al eliminar colaborador: ' + err.message, 'error');
      }
    });
  }

  function openDeletePermanenteModal(id, name) {
    targetDeletePermanenteId = id;
    if (AppUI.elements.deletePermNameLabel) {
      AppUI.elements.deletePermNameLabel.textContent = name;
    }
    if (AppUI.elements.deletePermPasswordInput) {
      AppUI.elements.deletePermPasswordInput.value = '';
    }
    if (AppUI.elements.deletePermError) {
      AppUI.elements.deletePermError.classList.add('hidden');
    }
    if (AppUI.elements.modalDeletePermanente) {
      AppUI.elements.modalDeletePermanente.classList.remove('hidden');
      setTimeout(() => AppUI.elements.deletePermPasswordInput?.focus(), 100);
    }
  }

  async function togglePermanenteStatus(id, newStatus) {
    try {
      await AppStorage.togglePermanenteStatus(id, newStatus);
      AppUI.showToast(`Estado del permanente actualizado.`, 'success');
      await loadDataAndRender();
    } catch (err) {
      AppUI.showToast('Error al actualizar estado: ' + err.message, 'error');
    }
  }

  function openPermanenteProfile(id) {
    const permanente = AppState.permanentes.find(p => p.id === id);
    if (!permanente) return;

    const profileData = AppData.getPermanenteProfile(AppState.registros, id);

    alert(`PERFIL Y RENDIMIENTO: ${permanente.nombre}\n` +
      `-------------------------------------------\n` +
      `Registros totales: ${profileData.count}\n` +
      `Tiempo promedio: ${profileData.tiempoPromedioFormateado}\n` +
      `Mejor tiempo: ${profileData.mejorTiempoFormateado}\n` +
      `Peor tiempo: ${profileData.peorTiempoFormateado}\n` +
      `Mediana de tiempo: ${profileData.medianaTiempoFormateado}\n` +
      `Cantidades promedio: ${profileData.cantPromedio} u\n` +
      `Promedio Cant./Hora: ${profileData.cantHoraPromedio} u/h\n` +
      `Colaboradores promedio: ${profileData.colabPromedio} personas`
    );
  }

  // ---------------------------------------------------------------------------
  // SERVICE WORKER PWA
  // ---------------------------------------------------------------------------

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('[ServiceWorker] Registrado exitosamente.'))
        .catch(err => console.warn('[ServiceWorker] Error al registrar:', err));
    }
  }

  // Iniciar aplicación
  init();
});
