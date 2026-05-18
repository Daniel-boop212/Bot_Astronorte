/**
 * ==========================================
 * BOT ASTRONORTE (RENDER READY)
 * ==========================================
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

process.env.PUPPETEER_CACHE_DIR =
  process.env.PUPPETEER_CACHE_DIR || path.join(__dirname, '.cache', 'puppeteer');

const express = require('express');
const {
  Client,
  LocalAuth,
  MessageMedia
} = require('whatsapp-web.js');

const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const cron = require('node-cron');
const csv = require('csv-parser');
const axios = require('axios');
const translate = require('translate-google');

function resolverChrome() {
  try {
    const executablePath = buscarChromeInstalado() ||
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      require('whatsapp-web.js/node_modules/puppeteer').executablePath();

    if (fs.existsSync(executablePath)) return executablePath;

    console.log('Chrome no existe en la ruta esperada. Instalando Chrome...');

    const install = spawnSync(
      process.execPath,
      [
        path.join(
          __dirname,
          'node_modules',
          'whatsapp-web.js',
          'node_modules',
          'puppeteer',
          'lib',
          'cjs',
          'puppeteer',
          'node',
          'cli.js'
        ),
        'browsers',
        'install',
        'chrome'
      ],
      {
        stdio: 'inherit',
        env: process.env
      }
    );

    if (install.status !== 0) {
      throw new Error(`No se pudo instalar Chrome. Codigo: ${install.status}`);
    }

    const installedPath = buscarChromeInstalado();
    if (installedPath) {
      console.log('Chrome instalado en:', installedPath);
      return installedPath;
    }

    throw new Error(`Chrome se instalo, pero no aparece en: ${process.env.PUPPETEER_CACHE_DIR}`);
  } catch (error) {
    console.log('No se pudo resolver Chrome automaticamente:', error.message);
    return undefined;
  }
}

function buscarChromeInstalado(dir = process.env.PUPPETEER_CACHE_DIR) {
  if (!dir || !fs.existsSync(dir)) return null;

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      const found = buscarChromeInstalado(fullPath);
      if (found) return found;
      continue;
    }

    if (process.platform === 'win32' && item.name === 'chrome.exe') {
      return fullPath;
    }

    if (process.platform !== 'win32' && item.name === 'chrome') {
      return fullPath;
    }
  }

  return null;
}

const chromeExecutablePath = resolverChrome();

// ==========================================
// EXPRESS (IMPORTANTE PARA RENDER)
// ==========================================

const app = express();
let ultimoQr = null;
let estadoWhatsapp = 'iniciando';

app.get('/', (req, res) => {
  res.send('🚀 Bot Astronorte activo');
});

app.get('/qr', async (req, res) => {
  if (!ultimoQr) {
    res.send(`
      <h1>QR no disponible</h1>
      <p>Estado WhatsApp: <strong>${estadoWhatsapp}</strong></p>
      <p>Si el bot ya esta listo, no necesita QR. Si no, espera unos segundos y recarga esta pagina.</p>
      <script>setTimeout(() => location.reload(), 5000);</script>
    `);
    return;
  }

  const qrImage = await qrcode.toDataURL(ultimoQr, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8
  });

  res.send(`
    <h1>Escanea este QR con WhatsApp</h1>
    <p>Estado WhatsApp: <strong>${estadoWhatsapp}</strong></p>
    <img src="${qrImage}" alt="QR de WhatsApp" style="width: min(90vw, 420px); height: auto;" />
    <p>El QR expira rapido. Si falla, recarga esta pagina.</p>
    <script>setTimeout(() => location.reload(), 20000);</script>
  `);
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
    executablePath: chromeExecutablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-notifications',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  }
});

// ==========================================
// QR
// ==========================================

client.on('qr', qr => {
  console.clear();
  ultimoQr = qr;
  estadoWhatsapp = 'esperando_qr';
  console.log('ESCANEA QR');
  console.log('Abre esta URL para escanearlo mejor: https://bot-astronorte.onrender.com/qr');
  qrcodeTerminal.generate(qr, { small: true });
});

client.on('loading_screen', (percent, message) => {
  estadoWhatsapp = `cargando ${percent}%`;
  console.log(`Cargando WhatsApp: ${percent}% - ${message}`);
});

client.on('authenticated', () => {
  estadoWhatsapp = 'autenticado';
  ultimoQr = null;
  console.log('WhatsApp autenticado correctamente');
});

client.on('auth_failure', message => {
  estadoWhatsapp = 'fallo_autenticacion';
  console.log('Fallo de autenticacion de WhatsApp:', message);
});

client.on('change_state', state => {
  estadoWhatsapp = state;
  console.log('Estado de WhatsApp:', state);
});

client.on('remote_session_saved', () => {
  console.log('Sesion remota guardada');
});

// ==========================================
// READY
// ==========================================

client.on('ready', () => {
  estadoWhatsapp = 'listo';
  ultimoQr = null;
  console.log('Grupo junta configurado:', GRUPO_JUNTA);
  console.log('✅ BOT ASTRONORTE LISTO');
});

client.on('disconnected', async reason => {
  estadoWhatsapp = 'desconectado';
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

setInterval(() => {
  const memory = process.memoryUsage();
  const rssMb = Math.round(memory.rss / 1024 / 1024);
  const heapMb = Math.round(memory.heapUsed / 1024 / 1024);
  console.log(`Memoria Node: RSS ${rssMb} MB | Heap ${heapMb} MB`);
}, 60000);
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
    await client.sendMessage(GRUPO_JUNTA, 'ping: bot activo');
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
