const express = require('express');
const cors = require('cors');
const aircraftRoutes = require('./routes/aircraft');
const loadsheetsRoutes = require('./routes/loadsheets');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/aircraft', aircraftRoutes);
app.use('/api/loadsheets', loadsheetsRoutes);

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
