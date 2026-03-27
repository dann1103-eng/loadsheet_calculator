# Load Sheet CAAA

Sistema digital de load sheets (hojas de peso y balance) para el **Centro de Adiestramiento Aereo Academico (CAAA)**, El Salvador.

## Descripcion

Aplicacion web que permite a los alumnos de aviacion llenar digitalmente sus load sheets antes de cada vuelo. El flujo completo cubre 5 pasos:

1. **Aeronave & Vuelo** — Seleccion de aeronave, fecha, hora UTC y datos del alumno/instructor
2. **Peso & Balance** — Tabla interactiva con calculo automatico de CG, graficas de envolvente, quema estimada, totales de despegue y aterrizaje
3. **Navegacion & Combustible** — Plan de navegacion multi-tramo con columnas ETE, fuel required y fuel actual en cascada; tabla de combustible (TAXI, TRIP, R/R 5%, ALT 1, ALT 2, FINAL RESERVE, MIN REQUIRED, EXTRA, TFOB)
4. **Operaciones** — Datos de salida, destino y alternado (pista, aproximacion, visibilidad, techo, ruta/remarks)
5. **Resumen & Envio** — Vista previa imprimible, descarga de PDF (A4 landscape) y envio al instructor

## Aeronaves soportadas

| Matricula | Modelo | Consumo |
|---|---|---|
| YS-127-P | PA-28R-180 (Piper Arrow) | 10 gal/hr |
| YS-270-P | PA-28-180 (Piper Cherokee) | 8 gal/hr |
| YS-333-PE | C-152 II (Cessna 152) | 6 gal/hr |
| YS-334-PE | PA-38 Tomahawk (Piper Tomahawk) | 6 gal/hr |

> Power setting por defecto: 75% en todas las aeronaves.

## Funcionalidades destacadas

- Calculo automatico de peso y balance con grafica de envolvente CG (despegue y aterrizaje)
- Auto-relleno de Power Setting y Fuel Flow al seleccionar aeronave
- Tabla de combustible: todos los tiempos son inputs del alumno; TFOB viene del W&B; EXTRA = TFOB − MIN REQUIRED
- Plan de navegacion con columna ETE y fuel actual en cascada (cada fila = anterior − required)
- Totales de NM y fuel sin errores de punto flotante
- Validacion de campos obligatorios con advertencia visible antes de mostrar LISTO
- Descarga de PDF con nombre dinamico: `loadsheet-{alumno}-{aeronave}-{fecha}.pdf`
- 3 firmas: Alumno, Instructor, Flight Dispatch (Turno)
- Hora UTC forzada a formato 24h

## Stack Tecnico

- **Frontend:** React 19 + Vite 8 + Tailwind CSS 4
- **Backend:** Node.js + Express
- **Estado global:** React Context API + useReducer
- **Graficas:** Canvas API nativa
- **PDF:** jsPDF + html-to-image
- **Deploy:** Vercel

## Instalacion

```bash
git clone https://github.com/dann1103-eng/loadsheet_calculator.git
cd loadsheet_calculator

# Instalar dependencias del servidor
cd server && npm install

# Instalar dependencias del cliente
cd ../client && npm install
```

## Desarrollo

```bash
# Terminal 1: Servidor (puerto 3001)
cd server
node index.js

# Terminal 2: Cliente (puerto 5173)
cd client
npm run dev
```

El cliente tiene un proxy configurado para redirigir `/api` al servidor en puerto 3001.

## Deploy en Vercel

1. Importar el repositorio desde GitHub en Vercel
2. El archivo `vercel.json` ya tiene la configuracion necesaria:
   - Build: `cd client && npm install && npm run build`
   - Output: `client/dist`
   - API routes: rewrites a `/server/index.js`
3. No requiere configuracion adicional de variables de entorno

## Flujo de Aprobacion

```
Alumno llena y envia el load sheet
        |
   status: pending
        |
Instructor revisa --> aprueba o rechaza
        |
   status: approved / rejected
```

## API

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/aircraft` | Lista todas las aeronaves |
| GET | `/api/aircraft/:id` | Detalle de una aeronave |
| POST | `/api/loadsheets` | Crear load sheet (status: pending) |
| GET | `/api/loadsheets/:id` | Obtener load sheet por ID |
| PATCH | `/api/loadsheets/:id/approve` | Aprobar load sheet |
| PATCH | `/api/loadsheets/:id/reject` | Rechazar load sheet |
