/**
 * BOT ASTRONORTE (CSV + NASA API + TRADUCCION)
 * Ejecutar: node Bot_Astronorte.js
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const translate = require('translate-google');

// CONFIG
const CSV_FILE = 'Datos Cumples Astronorte.csv';
const GRUPO_ID = "120363401185331944@g.us";
const IMG_PATH = "./nasa.jpg";
const NASA_API_KEY = "DEMO_KEY";

// CLIENTE
const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
  console.log('\nEscanea el QR:\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Bot conectado');
});

// LEER CSV
function leerCSV() {
  return new Promise((resolve, reject) => {
    const resultados = [];

    fs.createReadStream(CSV_FILE)
      .pipe(csv({
        separator: ';',
        mapHeaders: ({ header }) => header.trim()
      }))
      .on('data', (row) => {
        try {
          if (!row["Nombre"] || !row["tele"] || !row["cumple"]) return;

          const fechaRaw = row["cumple"].split(" ")[0];
          const [dia, mes] = fechaRaw.split("/");

          let numero = row["tele"].trim();
          if (!numero.startsWith("57")) numero = "57" + numero;

          resultados.push({
            nombre: row["Nombre"].trim(),
            numero: numero,
            fecha: `${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
          });

        } catch (e) {
          console.log("Error fila:", row);
        }
      })
      .on('end', () => resolve(resultados))
      .on('error', reject);
  });
}

// NASA API CON TRADUCCION
async function obtenerImagenNASA(reintentos = 3) {
  try {
    const url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;

    const response = await axios.get(url);
    const data = response.data;

    if (data.media_type !== "image") {
      console.log("NASA devolvio video, no imagen");
      return null;
    }

    console.log("Imagen NASA:", data.url);

    const img = await axios.get(data.url, {
      responseType: 'arraybuffer'
    });

    fs.writeFileSync(IMG_PATH, img.data);

    const tituloES = await translate(data.title, { to: 'es' });
    const descripcionES = await translate(data.explanation, { to: 'es' });

    return {
      titulo: tituloES,
      descripcion: descripcionES
    };

  } catch (error) {

    if (reintentos > 0) {
      console.log("Reintentando NASA...");
      await new Promise(res => setTimeout(res, 2000));
      return obtenerImagenNASA(reintentos - 1);
    }

    console.log("Error NASA final:", error.message);
    return null;
  }
}

// FUNCION PRINCIPAL
async function revisarCumpleanos() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  const fechaHoy = `${mes}-${dia}`;

  console.log(`Hoy: ${fechaHoy}`);

  const lista = await leerCSV();

  const nasaData = await obtenerImagenNASA();

  for (const persona of lista) {

    // Para pruebas usar (true)
    if (persona.fecha === fechaHoy) {

      const numeroID = persona.numero + "@c.us";

      try {
        const existe = await client.isRegisteredUser(numeroID);
        if (!existe) continue;

        let mensaje = `🚀✨ *ALERTA ASTRONORTE* ✨🚀

🌟 Hoy celebramos a @${persona.numero} 🌟  
🎂 ¡Feliz cumpleaños *${persona.nombre}*!  

🪐 ¡Muchos éxitos en este nuevo ciclo! 🚀`;

        if (nasaData) {
          mensaje += `

🌌 *${nasaData.titulo}*

📖 ${nasaData.descripcion.substring(0, 300)}...`;
        }

        if (nasaData && fs.existsSync(IMG_PATH)) {

          const media = MessageMedia.fromFilePath(IMG_PATH);

          await client.sendMessage(GRUPO_ID, media, {
            caption: mensaje,
            mentions: [numeroID]
          });

        } else {

          await client.sendMessage(GRUPO_ID, mensaje, {
            mentions: [numeroID]
          });
        }

        console.log(`Enviado a ${persona.nombre}`);

      } catch (e) {
        console.log(`Error con ${persona.nombre}:`, e.message);
      }
    }
  }
}

// CRON

cron.schedule('0 8 * * *', () => {
  revisarCumpleanos();
});

// PRUEBA (eliminar despues)
cron.schedule('* * * * *', () => {
  console.log('\nPrueba...');
  revisarCumpleanos();
});

// INICIAR
client.initialize();