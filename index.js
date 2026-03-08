require('dotenv').config();
const Eris = require('eris');
const fs = require('fs');
const https = require('https');
const path = require('path');

const bot = new Eris(process.env.DISCORD_TOKEN, {
  intents: ['guilds', 'guildVoiceStates', 'guildMessages', 'messageContent'],
});

const LOFI_URL = 'https://streams.ilovemusic.de/iloveradio17.mp3';

bot.on('ready', () => {
  console.log(`✅ ${bot.user.username} conectado`);
});

bot.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.guildID) return;

  if (msg.content === '!lofi') {
    const guild = bot.guilds.get(msg.guildID);
    const member = guild.members.get(msg.author.id);
    const voiceChannelID = member?.voiceState?.channelID;

    if (!voiceChannelID) {
      return bot.createMessage(msg.channelID, '❌ Entra a un canal de voz primero.');
    }

    try {
      console.log('📡 Conectando al canal de voz...');
      const connection = await bot.joinVoiceChannel(voiceChannelID);
      console.log('✅ Conectado, iniciando stream...');

      connection.play(LOFI_URL, { format: 'mp3', inlineVolume: true });
      connection.setVolume(1);

      connection.on('end', () => {
        console.log('🔄 Stream terminado, reiniciando...');
        setTimeout(() => connection.play(LOFI_URL, { format: 'mp3' }), 3000);
      });

      connection.on('error', (err) => {
        console.error('❌ Error stream:', err.message);
        setTimeout(() => connection.play(LOFI_URL, { format: 'mp3' }), 5000);
      });

      bot.createMessage(msg.channelID, '🎵 ¡Lofi radio activada! 🌙');

    } catch (err) {
      console.error('❌ Error al conectar:', err.message);
      bot.createMessage(msg.channelID, '❌ No pude conectarme al canal.');
    }
  }

  if (msg.content === '!stop') {
    const guild = bot.guilds.get(msg.guildID);
    const member = guild.members.get(msg.author.id);
    const voiceChannelID = member?.voiceState?.channelID;
    if (voiceChannelID) bot.leaveVoiceChannel(voiceChannelID);
    bot.createMessage(msg.channelID, '⏹️ Detenido.');
  }
});

bot.connect();
