const client = require('../index.js');
const functions = require('../helpers/functions.js');

const crypto = require('crypto');
const fetch = require('node-fetch');

const guildId = '155454244315463681';
const selfRoleMessage = {channel: '737828092407578697', message: '752861826676686949'};
const regex = new RegExp(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/g);

const selfRoles = [
  {emoji: '🎮', role: '737838305759985764'},
  {emoji: '🤓', role: '737838308314316851'},
  {emoji: '🎨', role: '738207408840507443'},
  {emoji: '🌸', role: '737838465881997322'},
  {emoji: '🥺', role: '738237414543458324'},
  {emoji: '🔞', role: '796216225159577621'},
];

const allowedFormats = [
  'video/x-msvideo',
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'video/mp4',
  'video/mpeg',
  'video/ogg',
  'image/png',
  'image/svg+xml',
  'image/tiff',
  'video/mp2t',
  'video/webm',
  'image/webp',
  'video/3gpp',
  'video/3gpp2',
];

const checksums = ['80c5978d2d9dbe875bad3c43feb4b16b', '70187708c1e2a233f76c93d764b5f9aa', '8d63612246f9d109b1c04bdb54a8b8b9'];

client.on('ready', async () => {
  try {
    await client.channels.cache.get(selfRoleMessage.channel).messages.fetch(selfRoleMessage.message);
  } catch { }
});

client.on('message', async (message) => {
  if (!message.guild || message.guild.id != guildId) return;

  message.embeds.forEach((embed) => {
    if (embed.type === 'video') checkCursedImage(message, embed);
  });

  if (message.channel.id == '746388677978095748') {
    if (message.member.permissions.has('MANAGE_MESSAGES')) return;
    if (!await checksfw(message)) return await functions.deleteMessage(message, true);
  }
});

client.on('messageReactionAdd', async (messageReaction, user) => {
  if (messageReaction.message.id != selfRoleMessage.message) return;
  const member = messageReaction.message.guild.members.resolve(user);
  if (!member) return;

  const role = selfRoles.find((role) => role.emoji == messageReaction.emoji.name);
  if (!role) return;

  if (!member.roles.cache.has(role.role)) {
    try {
      await member.roles.add(role.role);
    } catch { }
  }
});

client.on('messageReactionRemove', async (messageReaction, user) => {
  if (messageReaction.message.id != selfRoleMessage.message) return;
  const member = messageReaction.message.guild.members.resolve(user);
  if (!member) return;

  const role = selfRoles.find((role) => role.emoji == messageReaction.emoji.name);
  if (!role) return;

  if (member.roles.cache.has(role.role)) {
    try {
      await member.roles.remove(role.role);
    } catch { }
  }
});

async function checksfw(message) {
  if (message.embeds.length > 0) {
    const embed = message.embeds[0];
    if (embed.image || embed.video) return true;
  }

  if (message.attachments.size > 0) {
    if (message.attachments.first().height) return true;
  }

  const match = message.cleanContent.match(regex);

  if (match) {
    try {
      const file = await fetch(match[0]);
      if (allowedFormats.includes(file.headers.get('content-type'))) return true;
    } catch { }
  }

  return false;
};

async function checkCursedImage(message, embed) {
  try {
    const file = await fetch(embed.video.proxyURL);
    const buffer = await file.buffer();

    const md5 = crypto.createHash('md5');
    const hash = md5.update(buffer).digest('hex');
    if (checksums.includes(hash)) return await functions.deleteMessage(message, true);
  } catch {}
}
