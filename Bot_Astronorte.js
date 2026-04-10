/**
 * 🎂 WhatsApp Birthday Bot
 * Requiere: Node.js 18+
 * Instalar: npm install whatsapp-web.js qrcode-terminal node-cron fs-extra
 * Ejecutar: node index.js
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');

//Archivo donde guardar cumpleaños
const DATA_FILE = path.join(__dirname, 'cumpleanos.json');

// Crear archivo si no existe
if (!fs.existsSync(DATA_FILE)) {
  fs.writeJsonSync(DATA_FILE, [
    {
      nombre: "Juan",
      numero: "573001234567",
      fecha: "04-10" // MM-DD
    }
  ], { spaces: 2 });
}

//Cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth()
});

//QR
client.on('qr', (qr) => {
  console.log('\nEscanea este QR con tu WhatsApp:\n');
  qrcode.generate(qr, { small: true });
});

//Conectado
client.on('ready', async () => {
  console.log('✅ Bot conectado a WhatsApp');

  // 🔍 (OPCIONAL) Mostrar grupos para copiar ID
  //const chats = await client.getChats();
  //console.log('\n📌 TUS GRUPOS:\n');
  //chats.forEach(chat => {
    //if (chat.isGroup) {
      //console.log(`➡️ ${chat.name} → ${chat.id._serialized}`);
    //}
  //});

  console.log('\n📅 Bot de cumpleaños activo...\n');
});

// 🎂 FUNCIÓN PRINCIPAL
async function revisarCumpleanos() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  const fechaHoy = `${mes}-${dia}`;

  const lista = fs.readJsonSync(DATA_FILE);

  for (const persona of lista) {
    if (persona.fecha === fechaHoy) {

      const GRUPO_ID = "120363401185331944@g.us";

      //Formatear número para mención
      const numeroFormateado = persona.numero + "@c.us";

      //Mensaje estilo Astronorte con mención
      const mensaje = `🚀✨ *ALERTA ASTRONORTE* ✨🚀

🌟 Hoy celebramos una órbita más de @${persona.numero} 🌟  
🎂 ¡Feliz cumpleaños! Que tu vida esté llena de estrellas, descubrimientos y galaxias por explorar 🌌  

🪐 ¡Que este nuevo ciclo esté lleno de éxitos cósmicos! 🚀`;

      try {
        await client.sendMessage(GRUPO_ID, mensaje, {
          mentions: [numeroFormateado]
        });

        console.log(`🎂 Felicitación enviada para ${persona.nombre}`);
      } catch (e) {
        console.log(`❌ Error enviando a ${persona.nombre}:`, e.message);
      }
    }
  }
}

//Ejecutar todos los días (ahora cada minuto para prueba)
cron.schedule('* * * * *', () => {
  console.log('\n⏳ Revisando cumpleaños...');
  revisarCumpleanos();
});

//Iniciar
client.initialize();