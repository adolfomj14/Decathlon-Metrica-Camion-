/**
 * js/storage.js
 * Capa de persistencia asíncrona.
 * SUPABASE ES LA FUENTE PRINCIPAL DE VERDAD (PRIMARY SOURCE OF TRUTH).
 * localStorage se utiliza únicamente como respaldo secundario y cache offline.
 */

const AppStorage = (() => {
  const LOCAL_STORAGE_PERMANENTES = 'decathlon_laflora_permanentes';
  const LOCAL_STORAGE_REGISTROS = 'decathlon_laflora_registros';

  // ---------------------------------------------------------------------------
  // Helpers Internos
  // ---------------------------------------------------------------------------
  function getSupabaseClient() {
    return window.supabaseClient || null;
  }

  function getLocalData(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`[AppStorage] Error leyendo localStorage (${key}):`, e);
      return [];
    }
  }

  function setLocalData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`[AppStorage] Error guardando en localStorage (${key}):`, e);
    }
  }

  // ---------------------------------------------------------------------------
  // API DE PERMANENTES
  // ---------------------------------------------------------------------------

  /**
   * Obtiene todos los permanentes.
   * Prioridad 1: Supabase DB.
   * Fallback 2: LocalStorage (solo si Supabase falla o no está configurado).
   */
  async function getAllPermanentes() {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('permanentes')
          .select('*')
          .order('nombre', { ascending: true });
        
        if (!error && data) {
          // Normalizar formato de Supabase
          const list = data.map(p => ({
            id: p.id,
            nombre: p.nombre,
            activo: p.activo,
            createdAt: p.created_at
          }));
          // Sincronizar cache secundario local
          setLocalData(LOCAL_STORAGE_PERMANENTES, list);
          return list;
        }
      } catch (err) {
        console.warn('[AppStorage] Supabase no disponible para permanentes, usando cache local:', err);
      }
    }
    // Fallback a localStorage (limpio y vacío por defecto)
    let local = getLocalData(LOCAL_STORAGE_PERMANENTES);
    if (local && local.some(p => p.id && p.id.startsWith('perm_'))) {
      local = [];
      setLocalData(LOCAL_STORAGE_PERMANENTES, []);
    }
    return local || [];
  }

  /**
   * Guarda o actualiza un permanente.
   */
  async function savePermanente(permanenteData) {
    const client = getSupabaseClient();
    const isNew = !permanenteData.id;
    const payload = {
      nombre: permanenteData.nombre,
      activo: permanenteData.activo !== undefined ? permanenteData.activo : true
    };

    if (client) {
      try {
        let result;
        if (isNew) {
          result = await client.from('permanentes').insert([payload]).select();
        } else {
          result = await client.from('permanentes').update(payload).eq('id', permanenteData.id).select();
        }

        if (result.error) throw result.error;
        const saved = result.data[0];
        const normalized = {
          id: saved.id,
          nombre: saved.nombre,
          activo: saved.activo,
          createdAt: saved.created_at
        };

        // Actualizar cache local
        const local = getLocalData(LOCAL_STORAGE_PERMANENTES);
        const index = local.findIndex(p => p.id === normalized.id);
        if (index >= 0) local[index] = normalized;
        else local.push(normalized);
        setLocalData(LOCAL_STORAGE_PERMANENTES, local);

        return normalized;
      } catch (err) {
        console.error('[AppStorage] Error guardando en Supabase:', err);
        throw err;
      }
    }

    // Fallback LocalStorage si no hay cliente Supabase activo
    const local = getLocalData(LOCAL_STORAGE_PERMANENTES);
    const id = permanenteData.id || ('local_' + Date.now());
    const normalized = {
      id,
      nombre: permanenteData.nombre,
      activo: permanenteData.activo !== undefined ? permanenteData.activo : true,
      createdAt: permanenteData.createdAt || new Date().toISOString()
    };
    const index = local.findIndex(p => p.id === id);
    if (index >= 0) local[index] = normalized;
    else local.push(normalized);
    setLocalData(LOCAL_STORAGE_PERMANENTES, local);
    return normalized;
  }

  /**
   * Cambia el estado activo/inactivo de un permanente.
   */
  async function togglePermanenteStatus(id, newStatus) {
    const permanentes = await getAllPermanentes();
    const target = permanentes.find(p => p.id === id);
    if (target) {
      target.activo = newStatus;
      return await savePermanente(target);
    }
  }

  /**
   * Elimina un permanente y sus referencias.
   */
  async function deletePermanente(id) {
    const client = getSupabaseClient();
    if (client) {
      try {
        // Eliminar registros asociados en Supabase si existen
        await client.from('registros_descarga').delete().eq('permanente_id', id);
        const { error } = await client.from('permanentes').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('[AppStorage] Error borrando permanente en Supabase:', err);
        throw err;
      }
    }

    // Actualizar cache local
    const localPerms = getLocalData(LOCAL_STORAGE_PERMANENTES);
    const filteredPerms = localPerms.filter(p => p.id !== id);
    setLocalData(LOCAL_STORAGE_PERMANENTES, filteredPerms);

    const localRegs = getLocalData(LOCAL_STORAGE_REGISTROS);
    const filteredRegs = localRegs.filter(r => r.permanenteId !== id);
    setLocalData(LOCAL_STORAGE_REGISTROS, filteredRegs);

    return true;
  }

  // ---------------------------------------------------------------------------
  // API DE REGISTROS DE DESCARGA
  // ---------------------------------------------------------------------------

  /**
   * Obtiene todos los registros de descarga y surtida.
   * Prioridad 1: Supabase DB.
   * Fallback 2: LocalStorage.
   */
  async function getAllRegistros() {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('registros_descarga')
          .select(`
            *,
            permanentes ( id, nombre, activo )
          `)
          .order('fecha', { ascending: false })
          .order('hora_inicio', { ascending: false });

        if (!error && data) {
          const list = data.map(r => ({
            id: r.id,
            permanenteId: r.permanente_id,
            permanenteNombre: r.permanentes ? r.permanentes.nombre : 'Desconocido',
            fecha: r.fecha,
            horaInicio: r.hora_inicio,
            horaFin: r.hora_fin,
            duracionMinutos: r.duracion_minutos,
            cantidad: r.cantidad,
            colaboradores: r.colaboradores,
            observaciones: r.observaciones || '',
            createdAt: r.created_at
          }));
          setLocalData(LOCAL_STORAGE_REGISTROS, list);
          return list;
        }
      } catch (err) {
        console.warn('[AppStorage] Supabase no disponible para registros, usando cache local:', err);
      }
    }
    let localRegs = getLocalData(LOCAL_STORAGE_REGISTROS);
    if (localRegs && localRegs.some(r => r.id && r.id.startsWith('reg_demo_'))) {
      localRegs = [];
      setLocalData(LOCAL_STORAGE_REGISTROS, []);
    }
    return localRegs || [];
  }

  /**
   * Guarda o edita un registro de descarga.
   */
  async function saveRegistro(registroData) {
    const client = getSupabaseClient();
    const isNew = !registroData.id;

    const payload = {
      permanente_id: registroData.permanenteId,
      fecha: registroData.fecha,
      hora_inicio: registroData.horaInicio,
      hora_fin: registroData.horaFin,
      duracion_minutos: registroData.duracionMinutos,
      cantidad: parseInt(registroData.cantidad, 10),
      colaboradores: parseInt(registroData.colaboradores, 10),
      observaciones: registroData.observaciones || ''
    };

    if (client) {
      try {
        let result;
        if (isNew) {
          result = await client.from('registros_descarga').insert([payload]).select(`*, permanentes(id, nombre)`);
        } else {
          result = await client.from('registros_descarga').update(payload).eq('id', registroData.id).select(`*, permanentes(id, nombre)`);
        }

        if (result.error) throw result.error;
        const saved = result.data[0];
        const normalized = {
          id: saved.id,
          permanenteId: saved.permanente_id,
          permanenteNombre: saved.permanentes ? saved.permanentes.nombre : registroData.permanenteNombre,
          fecha: saved.fecha,
          horaInicio: saved.hora_inicio,
          horaFin: saved.hora_fin,
          duracionMinutos: saved.duracion_minutos,
          cantidad: saved.cantidad,
          colaboradores: saved.colaboradores,
          observaciones: saved.observaciones,
          createdAt: saved.created_at
        };

        const local = getLocalData(LOCAL_STORAGE_REGISTROS);
        const index = local.findIndex(r => r.id === normalized.id);
        if (index >= 0) local[index] = normalized;
        else local.unshift(normalized);
        setLocalData(LOCAL_STORAGE_REGISTROS, local);

        return normalized;
      } catch (err) {
        console.error('[AppStorage] Error guardando registro en Supabase:', err);
        throw err;
      }
    }

    // Fallback LocalStorage
    const local = getLocalData(LOCAL_STORAGE_REGISTROS);
    const id = registroData.id || ('rec_' + Date.now());
    const normalized = {
      id,
      permanenteId: registroData.permanenteId,
      permanenteNombre: registroData.permanenteNombre || 'Permanente',
      fecha: registroData.fecha,
      horaInicio: registroData.horaInicio,
      horaFin: registroData.horaFin,
      duracionMinutos: registroData.duracionMinutos,
      cantidad: parseInt(registroData.cantidad, 10),
      colaboradores: parseInt(registroData.colaboradores, 10),
      observaciones: registroData.observaciones || '',
      createdAt: registroData.createdAt || new Date().toISOString()
    };

    const index = local.findIndex(r => r.id === id);
    if (index >= 0) local[index] = normalized;
    else local.unshift(normalized);
    setLocalData(LOCAL_STORAGE_REGISTROS, local);
    return normalized;
  }

  /**
   * Elimina un registro de descarga.
   */
  async function deleteRegistro(id) {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('registros_descarga').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('[AppStorage] Error borrando registro de Supabase:', err);
        throw err;
      }
    }
    const local = getLocalData(LOCAL_STORAGE_REGISTROS);
    const filtered = local.filter(r => r.id !== id);
    setLocalData(LOCAL_STORAGE_REGISTROS, filtered);
    return true;
  }

  return {
    getAllPermanentes,
    savePermanente,
    togglePermanenteStatus,
    deletePermanente,
    getAllRegistros,
    saveRegistro,
    deleteRegistro
  };
})();
