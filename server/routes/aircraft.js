const express = require('express');
const router = express.Router();
const aircraft = require('../data/aircraft.json');

router.get('/', (req, res) => {
  res.json(aircraft);
});

router.get('/:id', (req, res) => {
  const ac = aircraft[req.params.id];
  if (!ac) return res.status(404).json({ error: 'Aircraft not found' });
  res.json(ac);
});

module.exports = router;
