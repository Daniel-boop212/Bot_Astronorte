/**
 * ==========================================
 * BOT ASTRONORTE (RENDER READY)
 * ==========================================
 */

const express = require('express');
const {
  Client,
  LocalAuth,
  MessageMedia
} = require('whatsapp-web.js');

const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const translate = require('translate-google');

// ==========================================
// EXPRESS (IMPORTANTE PARA RENDER)
// ==========================================

const app = express();

app.get('/', (req, res) => {
  res.send('🚀 Bot Astronorte activo');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor web listo');
});

// ==========================================
// CONFIG
// ==========================================

const CSV_FILE = 'Datos Cumples Astronorte.csv';

const GRUPO_ASTRONORTE = '120363403658710602@g.us';
const GRUPO_JUNTA = '120363304101999775@g.us';

const IMG_PATH = './nasa.jpg';
const NASA_API_KEY = 'DEMO_KEY';

const ADMIN = '57TU_NUMERO@c.us';

// ==========================================
// CLIENTE WHATSAPP
// ==========================================

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
]
    }
});

// ==========================================
// QR
// ==========================================

client.on('qr', qr => {
  console.clear();
  console.log('ESCANEA QR');
  qrcode.generate(qr, { small: true });
});

// ==========================================
// READY
// ==========================================

client.on('ready', () => {
  console.log('✅ BOT ASTRONORTE LISTO');
});

client.on('disconnected', async reason => {
  console.log('⚠ WhatsApp desconectado:', reason);

  setTimeout(() => {
    client.initialize();
  }, 5000);
});

process.on('unhandledRejection', err => {
  console.log('ERROR NO MANEJADO:', err);
});

process.on('uncaughtException', err => {
  console.log('EXCEPCION:', err);
});
// ==========================================
// LEER CSV
// ==========================================

function leerCSV() {
  return new Promise((resolve, reject) => {
    const resultados = [];

    fs.createReadStream(CSV_FILE)
      .pipe(csv({ separator: ';' }))
      .on('data', row => {
        if (!row.Nombre || !row.tele || !row.cumple) return;

        const [dia, mes] = row.cumple.split(' ')[0].split('/');

        let numero = row.tele.trim();
        if (!numero.startsWith('57')) numero = '57' + numero;

        resultados.push({
          nombre: row.Nombre.trim(),
          numero,
          fecha: `${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
        });
      })
      .on('end', () => resolve(resultados))
      .on('error', reject);
  });
}

// ==========================================
// NASA
// ==========================================

async function obtenerImagenNASA() {
  try {
    const url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;

    const res = await axios.get(url);
    const data = res.data;

    if (data.media_type !== 'image') return null;

    const img = await axios.get(data.url, {
      responseType: 'arraybuffer'
    });

    fs.writeFileSync(IMG_PATH, img.data);

    return {
      titulo: await translate(data.title, { to: 'es' }),
      descripcion: await translate(data.explanation, { to: 'es' })
    };

  } catch (e) {
    console.log('ERROR NASA:', e.message);
    return null;
  }
}

// ==========================================
// CUMPLEAÑOS
// ==========================================

async function revisarCumpleanos(grupoDestino) {
  const hoy = new Date();

  const fechaHoy =
    `${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  console.log('🎂 Revisando:', fechaHoy);

  const lista = await leerCSV();
  const nasa = await obtenerImagenNASA();

  for (const persona of lista) {
    if (persona.fecha !== fechaHoy) continue;

    const id = persona.numero + '@c.us';

    let msg = `🚀 *ASTRONORTE* 🚀

🎂 Feliz cumpleaños ${persona.nombre}`;

    if (nasa) {
      msg += `

🌌 ${nasa.titulo}
📖 ${nasa.descripcion.slice(0, 250)}...`;
    }

    if (nasa && fs.existsSync(IMG_PATH)) {
      const media = MessageMedia.fromFilePath(IMG_PATH);

      await client.sendMessage(grupoDestino, media, {
        caption: msg,
        mentions: [id]
      });
    } else {
      await client.sendMessage(grupoDestino, msg, {
        mentions: [id]
      });
    }

    console.log('✔ Enviado a', persona.nombre);
  }
}

// ==========================================
// COMANDOS
// ==========================================

client.on('message', async message => {
  const text = message.body.toLowerCase();

  if (text === 'ping') {
    return message.reply('🏓 activo');
  }

  if (text === 'idgrupo') {
    const chat = await message.getChat();
    return message.reply(chat.id._serialized);
  }

  if (text === 'probarcumple') {
    return revisarCumpleanos(GRUPO_JUNTA);
  }

  if (text === 'enviarcumple') {
    return revisarCumpleanos(GRUPO_ASTRONORTE);
  }

  if (text === 'comandos') {
    return message.reply(`
📌 ping
📌 idgrupo
📌 probarcumple
📌 enviarcumple
    `);
  }
});

// ==========================================
// CRON (8 AM COLOMBIA = 13 UTC)
// ==========================================

cron.schedule('0 13 * * *', () => {
  console.log('⏰ CRON ACTIVADO');
  revisarCumpleanos(GRUPO_ASTRONORTE);
});

// ==========================================
// START
// ==========================================

client.initialize();