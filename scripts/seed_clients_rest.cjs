#!/usr/bin/env node
// Seed script that uses Supabase PostgREST REST API via Node's https module.
// Works without extra dependencies and without relying on global fetch/Headers.
const https = require('https')
const { URL } = require('url')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_KEY in environment')
  process.exit(1)
}

const sample = [
  { name: 'Maria Silva', phone: '11987654321', email: 'maria@example.com', notes: 'Prefere produtos oil-free', address: 'Av. Paulista, 1000', instagram: '@maria.s' },
  { name: 'Ana Costa', phone: '11991234567', email: 'ana@example.com', notes: 'Evento dia 20', address: 'Rua das Flores, 45', instagram: '@anacosta' },
  { name: 'Julia Santos', phone: '11999887766', email: 'julia@example.com', notes: '', address: 'R. do Mercado, 12', instagram: '@julias' }
]

function postClients(clients) {
  return new Promise((resolve, reject) => {
    const restUrl = new URL('/rest/v1/clients', SUPABASE_URL)
    const body = JSON.stringify(clients)

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation'
      }
    }

    const req = https.request(restUrl, options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data || 'null')
            resolve(parsed)
          } catch (err) {
            resolve(data)
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', (err) => reject(err))
    req.write(body)
    req.end()
  })
}

postClients(sample)
  .then(result => {
    console.log('Seeded clients:', result)
  })
  .catch(err => {
    console.error('Error seeding clients:', err)
    process.exit(1)
  })
