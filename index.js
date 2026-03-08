require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const player = new Player(client);

client.once('clientReady', async () => {
  console.log(`✅ ${client.user.tag} conectado`);
  console.log('Node version:', process.version);
  
  // Cargar solo el extractor de streams directos
  const { StreamExtractor } = await import('@discord-player/extractor');
  await player.extractors.register(StreamExtractor, {});
  console.log('🎵 StreamExtractor cargado');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!lofi') {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('❌ Entra a un canal de voz primero.');

    try {
      await player.play(voiceChannel, 'https://streams.ilovemusic.de/iloveradio17.mp3', {
        nodeOptions: {
          selfDeaf: false,
          leaveOnEmpty: false,
          leaveOnEnd: false,
        },
      });
      message.reply('🎵 ¡Lofi activada! 🌙');
    } catch (err) {
      console.error('❌ Error:', err.message);
      message.reply('❌ Error al reproducir.');
    }
  }

  if (message.content === '!stop') {
    player.nodes.get(message.guild.id)?.delete();
    message.reply('⏹️ Detenido.');
  }
});

client.login(process.env.DISCORD_TOKEN);
