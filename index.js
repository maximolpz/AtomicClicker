require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require('@discordjs/voice');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const STREAMS = {
  lofi: 'https://streams.ilovemusic.de/iloveradio17.mp3',
  chillhop: 'https://streams.ilovemusic.de/iloveradio21.mp3',
  jazz: 'https://streams.ilovemusic.de/iloveradio31.mp3',
};

let player = null;
let connection = null;
let currentMessage = null;
let readyFired = false;

function playStream(url) {
  const resource = createAudioResource(url);
  player = createAudioPlayer();

  player.on(AudioPlayerStatus.Playing, () => {
    console.log('▶️  Reproduciendo...');
    if (currentMessage && !readyFired) {
      readyFired = true;
      currentMessage.reply('🎵 ¡Lofi radio activada! 🌙');
    }
  });

  player.on(AudioPlayerStatus.Idle, () => {
    console.log('🔄 Reiniciando...');
    setTimeout(() => playStream(url), 3000);
  });

  player.on('error', (err) => {
    console.error('❌ Error player:', err.message);
    setTimeout(() => playStream(url), 5000);
  });

  player.play(resource);
  if (connection) connection.subscribe(player);
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!lofi') {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('❌ Entra a un canal de voz primero.');

    if (connection) {
      connection.destroy();
      connection = null;
    }

    currentMessage = message;
    readyFired = false;

    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    connection.on('stateChange', (oldState, newState) => {
      console.log(`🔊 ${oldState.status} → ${newState.status}`);

      if (newState.status === VoiceConnectionStatus.Ready) {
        console.log('✅ Listo, reproduciendo...');
        playStream(STREAMS.lofi);
      }

      if (newState.status === VoiceConnectionStatus.Disconnected) {
        connection.destroy();
        connection = null;
      }
    });

    connection.on('error', (err) => {
      console.error('❌ Error conexión:', err.message);
    });

    // 🔑 Fix crítico: forzar reconexión si se queda en signalling
    setTimeout(() => {
      if (connection && connection.state.status !== VoiceConnectionStatus.Ready) {
        console.log('⚠️ Forzando reconexión...');
        connection.rejoin();
      }
    }, 5000);
  }

  if (message.content === '!chillhop') {
    if (connection) playStream(STREAMS.chillhop);
  }

  if (message.content === '!jazz') {
    if (connection) playStream(STREAMS.jazz);
  }

  if (message.content === '!stop') {
    if (player) { player.stop(); player = null; }
    if (connection) { connection.destroy(); connection = null; }
    message.reply('⏹️ Detenido.');
  }
});

client.once('ready', () => console.log(`✅ ${client.user.tag} conectado`));

client.login(process.env.DISCORD_TOKEN);