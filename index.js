require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  entersState,
} = require('@discordjs/voice');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const LOFI_URL = 'https://streams.ilovemusic.de/iloveradio17.mp3';
let player = null;

function playStream(url, connection) {
  const resource = createAudioResource(url);
  player = createAudioPlayer();

  player.on(AudioPlayerStatus.Playing, () => console.log('▶️  Reproduciendo...'));
  player.on(AudioPlayerStatus.Idle, () => {
    console.log('🔄 Reiniciando...');
    setTimeout(() => playStream(url, connection), 3000);
  });
  player.on('error', (err) => {
    console.error('❌ Error player:', err.message);
    setTimeout(() => playStream(url, connection), 5000);
  });

  player.play(resource);
  connection.subscribe(player);
}

// 🔑 Adapter manual que parchea el problema de discord.js v14
function createDiscordJSAdapter(channel) {
  return (methods) => {
    const onVoiceServerUpdate = (payload) => {
      if (payload.guild_id !== channel.guild.id) return;
      methods.onVoiceServerUpdate(payload);
    };

    const onVoiceStateUpdate = (oldState, newState) => {
      if (newState.guild.id !== channel.guild.id) return;
      if (newState.id !== client.user.id) return;
      methods.onVoiceStateUpdate(newState);
    };

    client.ws.on('VOICE_SERVER_UPDATE', onVoiceServerUpdate);
    client.on(Events.VoiceStateUpdate, onVoiceStateUpdate);

    return {
      sendPayload(payload) {
        if (channel.guild.shard.status !== 0) return false;
        channel.guild.shard.send(payload);
        return true;
      },
      destroy() {
        client.ws.off('VOICE_SERVER_UPDATE', onVoiceServerUpdate);
        client.off(Events.VoiceStateUpdate, onVoiceStateUpdate);
      },
    };
  };
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!lofi') {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('❌ Entra a un canal de voz primero.');

    const existingConnection = getVoiceConnection(message.guild.id);
    if (existingConnection) existingConnection.destroy();

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: createDiscordJSAdapter(voiceChannel), // 🔑 adapter manual
      selfDeaf: false,
      selfMute: false,
    });

    connection.on('stateChange', (oldState, newState) => {
      console.log(`🔊 ${oldState.status} → ${newState.status}`);
      if (newState.status === VoiceConnectionStatus.Ready) {
        console.log('✅ Listo, reproduciendo...');
        playStream(LOFI_URL, connection);
        message.reply('🎵 ¡Lofi radio activada! 🌙');
      }
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        connection.destroy();
      }
    });

    connection.on('error', (err) => console.error('❌ Error:', err));
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
