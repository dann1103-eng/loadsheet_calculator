require('dotenv').config()
const express = require('express')
const nodemailer = require('nodemailer')
const router = express.Router()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

router.post('/send-loadsheet', async (req, res) => {
  const { pdfBase64, filename, student, date, aircraft } = req.body
  if (!pdfBase64) return res.status(400).json({ error: 'PDF requerido' })

  try {
    await transporter.sendMail({
      from: `"CAAA Load Sheet" <${process.env.GMAIL_USER}>`,
      to: process.env.RECIPIENT_EMAIL,
      subject: `Load Sheet — ${student || 'Alumno'} — ${aircraft || ''} — ${date || ''}`,
      text: `Se adjunta el load sheet de ${student || 'el alumno'} para el vuelo del ${date || ''} en aeronave ${aircraft || ''}.`,
      attachments: [
        {
          filename: filename || 'loadsheet.pdf',
          content: pdfBase64,
          encoding: 'base64',
          contentType: 'application/pdf',
        },
      ],
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('Email error:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
