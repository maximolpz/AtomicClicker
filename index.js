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
} = require('@discordjs/voice');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const LOFI_URL = 'https://ice2.somafm.com/groovesalad-128-mp3';
let player = null;

function playStream(url, connection) {
  const resource = createAudioResource(url, {
    inputType: StreamType.Arbitrary,
    inlineVolume: false,
  });

  player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
    },
  });

  player.on(AudioPlayerStatus.Playing, () => console.log('▶️  AUDIO PLAYING'));
  player.on(AudioPlayerStatus.Buffering, () => console.log('⏳ BUFFERING...'));
  player.on(AudioPlayerStatus.Idle, () => {
    console.log('⏸️  IDLE - reiniciando...');
    setTimeout(() => playStream(url, connection), 3000);
  });
  player.on('error', (err) => {
    console.error('❌ Error player:', err.message);
    setTimeout(() => playStream(url, connection), 5000);
  });

  player.play(resource);
  connection.subscribe(player);
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!lofi') {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('❌ Entra a un canal de voz.');

    const existing = getVoiceConnection(message.guild.id);
    if (existing) existing.destroy();

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    connection.on('stateChange', (oldState, newState) => {
      console.log(`🔊 ${oldState.status} → ${newState.status}`);

      if (oldState.status === newState.status) return;

      if (newState.status === VoiceConnectionStatus.Ready) {
        console.log('✅ Conectado, reproduciendo...');
        playStream(LOFI_URL, connection);
        message.reply('🎵 ¡Lofi activada! 🌙');
      }
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        connection.destroy();
      }
    });

    connection.on('error', (err) => console.error('❌ Error conexión:', err));
  }

  if (message.content === '!stop') {
    if (player) { player.stop(); player = null; }
    const connection = getVoiceConnection(message.guild.id);
    if (connection) connection.destroy();
    message.reply('⏹️ Detenido.');
  }
});

client.once('clientReady', () => console.log(`✅ ${client.user.tag} conectado`));
client.login(process.env.DISCORD_TOKEN);
