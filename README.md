# Load Sheet CAAA

Sistema digital de load sheets (hojas de peso y balance) para el **Centro de Adiestramiento Aereo Academico (CAAA)**, El Salvador.

## Descripcion

Aplicacion web que permite a los alumnos de aviacion llenar digitalmente sus load sheets antes de cada vuelo. Incluye:

- Calculo automatico de peso y balance con graficas de envolvente CG
- Planificacion de navegacion y combustible
- Datos operacionales (salida, destino, alternado)
- Hoja imprimible oficial
- Flujo de aprobacion por instructor

## Aeronaves soportadas

| Matricula | Modelo | Tipo |
|---|---|---|
| YS-334-PE | PA-28R-180 | Piper Arrow |
| YS-333-PE | PA-28-180 | Piper Cherokee |
| YS-270-PE | PA-28-180 | Piper Cherokee |
| YS-127-P | C-152 II | Cessna 152 |
| YS-259-P | PA-38 Tomahawk | Piper Tomahawk |

## Stack Tecnico

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Node.js + Express
- **Estado:** React Context API
- **Graficas:** Canvas API nativa
- **Deploy:** Vercel

## Instalacion

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd loadsheet_calculator

# Instalar dependencias del servidor
cd server
npm install

# Instalar dependencias del cliente
cd ../client
npm install
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

1. Subir el repositorio a GitHub
2. En Vercel, importar el repositorio desde GitHub
3. El archivo `vercel.json` ya tiene la configuracion necesaria:
   - Build: `cd client && npm install && npm run build`
   - Output: `client/dist`
   - API routes: rewrites a `/server/index.js`
4. No requiere configuracion adicional

## Flujo de Aprobacion

```
Alumno llena y envia el load sheet
        |
   status: pending
        |
Instructor revisa --> aprueba o rechaza
        |
   status: approved / rejected
        |
Solo si approved --> alumno puede volar
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
