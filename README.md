# Control de Descarga y Surtida — Decathlon La Flora

Aplicación Progressive Web App (PWA) desarrollada específicamente para **Decathlon La Flora** para llevar un registro sistemático y análisis estadístico de los tiempos de descarga de camión, segregación y surtida de mercancía en tienda.

---

## 🎯 Objetivos Operativos

1. **Registrar de forma veloz**: Permitir a los encargados (*Permanentes*) registrar cada proceso en menos de 30 segundos.
2. **Medición automática de productividad**: Calcular tiempos totales, cantidades por hora, minutos por cantidad y productividad por colaboradores (*manos*).
3. **Analítica de decisiones**:
   - Comparar el rendimiento entre diferentes *Permanentes*.
   - Analizar el impacto real de utilizar 2, 3, 4 o más *Colaboradores*.
   - Identificar días de la semana con mayor o menor eficiencia.

---

## 🛠️ Estructura del Proyecto

```
control-descarga-surtida/
├── index.html               # SPA principal y estructura de vistas
├── manifest.json            # Configuración PWA (Colores institucionales Decathlon)
├── sw.js                    # Service Worker para cacheo y uso sin conexión
├── supabase_schema.sql      # Script de base de datos para Supabase
├── css/
│   └── style.css            # Sistema de diseño UI, variables CSS y modo claro/oscuro
├── js/
│   ├── supabase.js          # Inicialización cliente Supabase
│   ├── storage.js           # Persistencia: Supabase (Principal) + LocalStorage (Backup)
│   ├── data.js              # Motor de cálculos automáticos y agregaciones
│   ├── ui.js                # Renderizado DOM y gráficos con Chart.js
│   └── app.js               # Controlador de eventos y ciclo de vida de la app
└── README.md                # Este documento
```

---

## 🗄️ Configuración de Supabase (Base de Datos Principal)

> **Nota:** Supabase es la **fuente primaria de verdad** (`Primary Source of Truth`). `localStorage` opera como respaldo/cache secundario para situaciones sin internet.

Para conectar tu instancia de Supabase:

1. Ejecuta el archivo [`supabase_schema.sql`](file:///C:/Users/USER/.gemini/antigravity/scratch/control-descarga-surtida/supabase_schema.sql) en el **SQL Editor** de tu proyecto Supabase.
2. Abre `js/supabase.js` e introduce tus credenciales:

```javascript
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key';
```

---

## 🚀 Servir Localmente

Puedes servir la aplicación con cualquier servidor estático HTTPS o HTTP local:

```bash
# Python
python -m http.server 8000

# Node.js
npx http-server -p 8000
```

Accede desde tu navegador en: `http://localhost:8000`.

---

## 📱 Instalación PWA

En dispositivos móviles (Android / iOS) o PC:
1. Abre la aplicación en Chrome, Edge o Safari.
2. Selecciona **"Instalar aplicación"** o **"Agregar a la pantalla de inicio"**.
3. La aplicación funcionará sin conexión mediante el Service Worker integrado.
