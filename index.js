require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  StreamType,
  getVoiceConnection,
  entersState,
} = require('@discordjs/voice');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const dns = require('dns');

// PARCHE 1: Forzar IPv4 para evitar problemas de resolución en datacenters
dns.setDefaultResultOrder('ipv4first');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Usamos una URL directa y robusta de FIP Radio (Lofi/Chill)
const LOFI_URL = 'http://icecast.radiofrance.fr/fip-midfi.mp3';
let player = null;
let currentFfmpeg = null;

/**
 * Función para gestionar la reproducción del stream vía FFmpeg
 */
function playStream(url, connection) {
  if (currentFfmpeg) {
    currentFfmpeg.kill();
    currentFfmpeg = null;
  }

  // Banderas de FFmpeg optimizadas para reconexión y bajo consumo
  const ffmpeg = spawn(ffmpegPath, [
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-i', url,
    '-analyzeduration', '0',
    '-loglevel', '0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1'
  ]);

  currentFfmpeg = ffmpeg;

  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.Raw,
    inlineVolume: false,
  });

  player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });

  player.on(AudioPlayerStatus.Playing, () => console.log('▶️ AUDIO PLAYING'));
  
  player.on(AudioPlayerStatus.Idle, () => {
    console.log('⏸️ IDLE - Reiniciando stream...');
    ffmpeg.kill();
    setTimeout(() => {
        if (getVoiceConnection(connection.joinConfig.guildId)) {
            playStream(url, connection);
        }
    }, 3000);
  });

  player.on('error', (err) => {
    console.error('❌ Error en el reproductor:', err.message);
    ffmpeg.kill();
  });

  player.play(resource);
  connection.subscribe(player);
}

/**
 * Lógica principal de comandos
 */
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!lofi') {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('❌ Debes estar en un canal de voz.');

    // Limpiar conexión previa si existe
    const existing = getVoiceConnection(message.guild.id);
    if (existing) existing.destroy();

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    try {
      // PARCHE 2: Esperar activamente a que la conexión esté lista (Máximo 15 seg)
      console.log('⏳ Intentando conectar al canal de voz...');
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      
      console.log('✅ Conexión establecida con éxito.');
      playStream(LOFI_URL, connection);
      message.reply('🎵 **Lofi 24/7 activada.** ¡A disfrutar!');
      
    } catch (error) {
      console.error('❌ Error de conexión (Timeout):', error);
      connection.destroy();
      message.reply('❌ No se pudo conectar. Discord o Railway están bloqueando la conexión UDP.');
    }

    // Monitor de estado
    connection.on('stateChange', (oldState, newState) => {
      console.log(`🔊 Estado: ${oldState.status} → ${newState.status}`);
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        connection.destroy();
      }
    });
  }

  if (message.content === '!stop') {
    if (currentFfmpeg) currentFfmpeg.kill();
    const connection = getVoiceConnection(message.guild.id);
    if (connection) connection.destroy();
    message.reply('⏹️ Bot desconectado.');
  }
});

client.once('ready', () => {
  console.log(`✅ Logueado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
