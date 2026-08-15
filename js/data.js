/**
 * js/data.js
 * Motor de cálculos automáticos, métricas de rendimiento y agregación estadística.
 */

const AppData = (() => {

  // ---------------------------------------------------------------------------
  // CÁLCULOS DE TIEMPO Y FÓRMULAS INDIVIDUALES
  // ---------------------------------------------------------------------------

  /**
   * Calcula la diferencia en minutos entre dos horas en formato "HH:MM".
   */
  function calculateDurationMinutes(horaInicio, horaFin) {
    if (!horaInicio || !horaFin) return 0;
    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    
    let mins1 = h1 * 60 + m1;
    let mins2 = h2 * 60 + m2;
    
    if (mins2 < mins1) {
      mins2 += 24 * 60; // Operación nocturna pasando medianoche
    }
    
    return mins2 - mins1;
  }

  /**
   * Convierte minutos enteros a formato ejecutable entendible (ej: 110 => "1 h 50 min").
   */
  function formatMinutesToReadable(totalMinutes) {
    if (totalMinutes == null || isNaN(totalMinutes) || totalMinutes < 0) return '0 min';
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} h`;
    return `${hours} h ${mins} min`;
  }

  /**
   * Calcula todas las métricas derivadas para un registro.
   */
  function enrichRegistroWithMetrics(registro) {
    const duracionMinutos = registro.duracionMinutos || calculateDurationMinutes(registro.horaInicio, registro.horaFin);
    const horasTrabajadas = duracionMinutos / 60;
    const cantidad = parseFloat(registro.cantidad) || 0;
    const colaboradores = parseFloat(registro.colaboradores) || 1;

    const cantidadesPorHora = horasTrabajadas > 0 ? (cantidad / horasTrabajadas) : 0;
    const minutosPorCantidad = cantidad > 0 ? (duracionMinutos / cantidad) : 0;
    const segundosPorCantidad = minutosPorCantidad * 60;
    const cantidadPorMano = colaboradores > 0 ? (cantidad / colaboradores) : 0;
    const productividadPorMano = colaboradores > 0 ? (cantidadesPorHora / colaboradores) : 0;

    // Día de la semana (0: Domingo, 1: Lunes, ..., 6: Sábado)
    let fechaObj = new Date(registro.fecha + 'T00:00:00');
    const diaSemanaIndex = isNaN(fechaObj.getTime()) ? 0 : fechaObj.getDay();
    const diasNombre = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return {
      ...registro,
      duracionMinutos,
      duracionFormateada: formatMinutesToReadable(duracionMinutos),
      cantidadesPorHora: Math.round(cantidadesPorHora * 10) / 10,
      minutosPorCantidad: Math.round(minutosPorCantidad * 100) / 100,
      segundosPorCantidad: Math.round(segundosPorCantidad),
      cantidadPorMano: Math.round(cantidadPorMano * 10) / 10,
      productividadPorMano: Math.round(productividadPorMano * 10) / 10,
      diaSemanaNombre: diasNombre[diaSemanaIndex],
      diaSemanaIndex
    };
  }

  // ---------------------------------------------------------------------------
  // FILTRADO DE DATOS
  // ---------------------------------------------------------------------------

  function filterRegistros(registros, filters = {}) {
    const enriched = registros.map(enrichRegistroWithMetrics);

    return enriched.filter(r => {
      // Filtro por Fecha Desde
      if (filters.fechaDesde && r.fecha < filters.fechaDesde) return false;
      // Filtro por Fecha Hasta
      if (filters.fechaHasta && r.fecha > filters.fechaHasta) return false;
      // Filtro por Permanente
      if (filters.permanenteId && filters.permanenteId !== 'todos' && r.permanenteId !== filters.permanenteId) return false;
      // Filtro por Colaboradores
      if (filters.colaboradores && filters.colaboradores !== 'todos' && parseInt(r.colaboradores) !== parseInt(filters.colaboradores)) return false;
      // Filtro por Día de la Semana
      if (filters.diaSemana && filters.diaSemana !== 'todos' && parseInt(filters.diaSemana) !== r.diaSemanaIndex) return false;
      
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // ESTADÍSTICAS GENERALES Y KPI DASHBOARD
  // ---------------------------------------------------------------------------

  function getGeneralStats(filteredRegistros) {
    if (!filteredRegistros || filteredRegistros.length === 0) {
      return {
        totalRegistros: 0,
        totalMercancia: 0,
        tiempoPromedioMins: 0,
        tiempoPromedioFormateado: '0 min',
        promedioCantidad: 0,
        promedioColaboradores: 0,
        promedioCantidadesPorHora: 0,
        mejorTiempoFormateado: '0 min',
        mayorTiempoFormateado: '0 min'
      };
    }

    const count = filteredRegistros.length;
    const totalMercancia = filteredRegistros.reduce((acc, r) => acc + r.cantidad, 0);
    const totalMinutos = filteredRegistros.reduce((acc, r) => acc + r.duracionMinutos, 0);
    const totalColaboradores = filteredRegistros.reduce((acc, r) => acc + r.colaboradores, 0);
    const totalCantidadesPorHora = filteredRegistros.reduce((acc, r) => acc + r.cantidadesPorHora, 0);

    const duraciones = filteredRegistros.map(r => r.duracionMinutos);
    const mejorTiempoMins = Math.min(...duraciones);
    const mayorTiempoMins = Math.max(...duraciones);

    return {
      totalRegistros: count,
      totalMercancia,
      tiempoPromedioMins: Math.round(totalMinutos / count),
      tiempoPromedioFormateado: formatMinutesToReadable(totalMinutos / count),
      promedioCantidad: Math.round(totalMercancia / count),
      promedioColaboradores: (totalColaboradores / count).toFixed(1),
      promedioCantidadesPorHora: Math.round(totalCantidadesPorHora / count),
      mejorTiempoFormateado: formatMinutesToReadable(mejorTiempoMins),
      mayorTiempoFormateado: formatMinutesToReadable(mayorTiempoMins)
    };
  }

  // ---------------------------------------------------------------------------
  // ESTADÍSTICAS AGRUPADAS POR PERMANENTE
  // ---------------------------------------------------------------------------

  function getStatsByPermanente(filteredRegistros, allPermanentes) {
    const statsMap = {};

    // Inicializar permanentes conocidos
    allPermanentes.forEach(p => {
      statsMap[p.id] = {
        permanenteId: p.id,
        nombre: p.nombre,
        activo: p.activo,
        registros: [],
        count: 0
      };
    });

    filteredRegistros.forEach(r => {
      if (!statsMap[r.permanenteId]) {
        statsMap[r.permanenteId] = {
          permanenteId: r.permanenteId,
          nombre: r.permanenteNombre,
          activo: true,
          registros: [],
          count: 0
        };
      }
      statsMap[r.permanenteId].registros.push(r);
      statsMap[r.permanenteId].count++;
    });

    return Object.values(statsMap)
      .filter(item => item.count > 0)
      .map(item => {
        const regs = item.registros;
        const count = regs.length;
        const totalMinutos = regs.reduce((a, r) => a + r.duracionMinutos, 0);
        const totalCantidad = regs.reduce((a, r) => a + r.cantidad, 0);
        const totalCantHora = regs.reduce((a, r) => a + r.cantidadesPorHora, 0);
        const totalColab = regs.reduce((a, r) => a + r.colaboradores, 0);

        const tiempoPromedioMins = Math.round(totalMinutos / count);
        const cantPromedio = Math.round(totalCantidad / count);
        const cantHoraPromedio = Math.round(totalCantHora / count);
        const colabPromedio = parseFloat((totalColab / count).toFixed(1));
        const productividadPromedio = colabPromedio > 0 ? (cantHoraPromedio / colabPromedio).toFixed(1) : 0;

        return {
          permanenteId: item.permanenteId,
          nombre: item.nombre,
          activo: item.activo,
          count,
          tiempoPromedioMins,
          tiempoPromedioFormateado: formatMinutesToReadable(tiempoPromedioMins),
          cantPromedio,
          cantHoraPromedio,
          colabPromedio,
          productividadPromedio
        };
      })
      .sort((a, b) => b.cantHoraPromedio - a.cantHoraPromedio);
  }

  // ---------------------------------------------------------------------------
  // ANÁLISIS POR DÍA DE LA SEMANA (Lunes a Domingo)
  // ---------------------------------------------------------------------------

  function getStatsByDayOfWeek(filteredRegistros) {
    const ordenDias = [1, 2, 3, 4, 5, 6, 0]; // Lunes a Domingo
    const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return ordenDias.map(dayIndex => {
      const regs = filteredRegistros.filter(r => r.diaSemanaIndex === dayIndex);
      const count = regs.length;
      if (count === 0) {
        return {
          diaIndex: dayIndex,
          nombreDia: nombresDias[dayIndex],
          count: 0,
          tiempoPromedioMins: 0,
          tiempoPromedioFormateado: '0 min',
          cantPromedio: 0,
          cantHoraPromedio: 0
        };
      }

      const totalMinutos = regs.reduce((a, r) => a + r.duracionMinutos, 0);
      const totalCantidad = regs.reduce((a, r) => a + r.cantidad, 0);
      const totalCantHora = regs.reduce((a, r) => a + r.cantidadesPorHora, 0);

      const tiempoProm = Math.round(totalMinutos / count);

      return {
        diaIndex: dayIndex,
        nombreDia: nombresDias[dayIndex],
        count,
        tiempoPromedioMins: tiempoProm,
        tiempoPromedioFormateado: formatMinutesToReadable(tiempoProm),
        cantPromedio: Math.round(totalCantidad / count),
        cantHoraPromedio: Math.round(totalCantHora / count)
      };
    });
  }

  // ---------------------------------------------------------------------------
  // ANÁLISIS POR NÚMERO DE COLABORADORES
  // ---------------------------------------------------------------------------

  function getStatsByColaboradores(filteredRegistros) {
    const map = {};

    filteredRegistros.forEach(r => {
      const colab = r.colaboradores;
      if (!map[colab]) {
        map[colab] = [];
      }
      map[colab].push(r);
    });

    return Object.keys(map)
      .map(Number)
      .sort((a, b) => a - b)
      .map(colab => {
        const regs = map[colab];
        const count = regs.length;
        const totalMinutos = regs.reduce((a, r) => a + r.duracionMinutos, 0);
        const totalCantidad = regs.reduce((a, r) => a + r.cantidad, 0);
        const totalCantHora = regs.reduce((a, r) => a + r.cantidadesPorHora, 0);

        const tiempoProm = Math.round(totalMinutos / count);

        return {
          colaboradores: colab,
          count,
          tiempoPromedioMins: tiempoProm,
          tiempoPromedioFormateado: formatMinutesToReadable(tiempoProm),
          cantPromedio: Math.round(totalCantidad / count),
          cantHoraPromedio: Math.round(totalCantHora / count)
        };
      });
  }

  // ---------------------------------------------------------------------------
  // PERFIL INDIVIDUAL DE PERMANENTE
  // ---------------------------------------------------------------------------

  function getPermanenteProfile(filteredRegistros, permanenteId) {
    const regs = filteredRegistros
      .filter(r => r.permanenteId === permanenteId)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    if (regs.length === 0) {
      return {
        count: 0,
        totalMercancia: 0,
        tiempoPromedioFormateado: '0 min',
        mejorTiempoFormateado: '0 min',
        peorTiempoFormateado: '0 min',
        medianaTiempoFormateado: '0 min',
        cantPromedio: 0,
        colabPromedio: 0,
        cantHoraPromedio: 0,
        segundosPorCantidadPromedio: 0,
        registros: []
      };
    }

    const count = regs.length;
    const totalMercancia = regs.reduce((a, r) => a + r.cantidad, 0);
    const totalMinutos = regs.reduce((a, r) => a + r.duracionMinutos, 0);
    const totalColab = regs.reduce((a, r) => a + r.colaboradores, 0);
    const totalCantHora = regs.reduce((a, r) => a + r.cantidadesPorHora, 0);

    const duraciones = regs.map(r => r.duracionMinutos).sort((a, b) => a - b);
    const mejorMin = duraciones[0];
    const peorMin = duraciones[duraciones.length - 1];

    // Mediana
    let medianaMin = 0;
    const mid = Math.floor(duraciones.length / 2);
    if (duraciones.length % 2 !== 0) {
      medianaMin = duraciones[mid];
    } else {
      medianaMin = Math.round((duraciones[mid - 1] + duraciones[mid]) / 2);
    }

    return {
      count,
      totalMercancia,
      tiempoPromedioMins: Math.round(totalMinutos / count),
      tiempoPromedioFormateado: formatMinutesToReadable(totalMinutos / count),
      mejorTiempoFormateado: formatMinutesToReadable(mejorMin),
      peorTiempoFormateado: formatMinutesToReadable(peorMin),
      medianaTiempoFormateado: formatMinutesToReadable(medianaMin),
      cantPromedio: Math.round(totalMercancia / count),
      colabPromedio: (totalColab / count).toFixed(1),
      cantHoraPromedio: Math.round(totalCantHora / count),
      registros: regs
    };
  }

  return {
    calculateDurationMinutes,
    formatMinutesToReadable,
    enrichRegistroWithMetrics,
    filterRegistros,
    getGeneralStats,
    getStatsByPermanente,
    getStatsByDayOfWeek,
    getStatsByColaboradores,
    getPermanenteProfile
  };
})();
