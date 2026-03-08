require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const { 
  YouTubeExtractor,
  AttachmentExtractor
} = require('@discord-player/extractor');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const player = new Player(client);

(async () => {
  try {
    await player.extractors.register(AttachmentExtractor, {});
    await player.extractors.register(YouTubeExtractor, {});
    console.log(`🎵 Extractores cargados: ${player.extractors.store.size}`);
  } catch (e) {
    console.error('❌ Error extractores:', e.message);
  }

  client.once('clientReady', () => {
    console.log(`✅ ${client.user.tag} conectado`);
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!lofi') {
      const voiceChannel = message.member?.voice?.channel;
      if (!voiceChannel) return message.reply('❌ Entra a un canal de voz.');

      try {
        console.log('🔍 Intentando reproducir stream...');
        await player.play(voiceChannel, 'lofi hip hop radio beats to relax/study to', {
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

  await client.login(process.env.DISCORD_TOKEN);
})();
