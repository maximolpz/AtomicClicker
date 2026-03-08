require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

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
  try {
    await player.extractors.loadMulti(DefaultExtractors);
    console.log(`🎵 Extractores: ${player.extractors.store.size}`);
  } catch (e) {
    console.error('❌ Error extractores:', e.message);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!lofi') {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('❌ Entra a un canal de voz.');

    try {
      await player.play(voiceChannel, 'https://streams.ilovemusic.de/iloveradio17.mp3', {
        nodeOptions: {
          selfDeaf: false,
          leaveOnEmpty: false,
          leaveOnEnd: false,
          leaveOnStop: false,
        },
      });
      message.reply('🎵 ¡Lofi activada! 🌙');
    } catch (err) {
      console.error('❌ Error completo:', err);
      message.reply('❌ Error al reproducir.');
    }
  }

  if (message.content === '!stop') {
    player.nodes.get(message.guild.id)?.delete();
    message.reply('⏹️ Detenido.');
  }
});

client.login(process.env.DISCORD_TOKEN);
