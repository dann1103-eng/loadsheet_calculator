const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const loadsheets = new Map();

router.post('/', (req, res) => {
  const id = crypto.randomUUID();
  const ls = { id, ...req.body, status: 'pending', createdAt: new Date().toISOString() };
  loadsheets.set(id, ls);
  res.status(201).json(ls);
});

router.get('/:id', (req, res) => {
  const ls = loadsheets.get(req.params.id);
  if (!ls) return res.status(404).json({ error: 'Load sheet not found' });
  res.json(ls);
});

router.patch('/:id/approve', (req, res) => {
  const ls = loadsheets.get(req.params.id);
  if (!ls) return res.status(404).json({ error: 'Load sheet not found' });
  ls.status = 'approved';
  ls.approvedAt = new Date().toISOString();
  res.json(ls);
});

router.patch('/:id/reject', (req, res) => {
  const ls = loadsheets.get(req.params.id);
  if (!ls) return res.status(404).json({ error: 'Load sheet not found' });
  ls.status = 'rejected';
  ls.rejectedAt = new Date().toISOString();
  ls.rejectComment = req.body.comment || '';
  res.json(ls);
});

module.exports = router;
