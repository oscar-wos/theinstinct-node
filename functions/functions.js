const fs = require('fs');
const util = require('util');
const { MessageEmbed } = require('discord.js');

const checkType = {
  ALL: 'all',
  GUILD: 'guild'
}

const messageType = {
  NORMAL: 'type_normal',
  CODE: 'type_code',
  SUCCESS: 'type_success',
  ERROR: 'type_error',
  EMBED: 'type_embed',
  USAGE: 'type_usage'
}

module.exports.logLengthCheck = function(string) {
  if (string.length < 500 && string.split('\n').length < 5) return true;
  return false;
}

module.exports.fetchAuditLog = function(guild, type) {
  return new Promise(async (resolve, reject) => {
    try {
      let log = await guild.fetchAuditLogs({ type: type, limit: 1 });
      resolve(log.entries.first());
    } catch (e) { reject(e); }
  })
}

module.exports.loadGuildHooks = async function(client, guild) {
  guild.hook = { logs: null, files: null, blogs: null }

  if (guild.db.logs.webhook.id != null) {
    try { guild.hook.logs = await client.fetchWebhook(guild.db.logs.webhook.id, guild.db.logs.webhook.token);
    } catch { }
  }

  if (guild.db.files.webhook.id != null) {
    try { guild.hook.files = await client.fetchWebhook(guild.db.files.webhook.id, guild.db.files.webhook.token);
    } catch { }
  }
  
  if (guild.db.blogs.webhook.id != null) {
    try { guild.hook.blogs = await client.fetchWebhook(guild.db.blogs.webhook.id, guild.db.blogs.webhook.token);
    } catch { }
  }
}

module.exports.setupWebhook = function(channel, name) {
  return new Promise(async (resolve, reject) => {
    try {
      let webhooks = await channel.fetchWebhooks();
      let webhook = webhooks.find(webhook => webhook.name == name && webhook.owner == channel.guild.me.user);

      if (webhook) return resolve(webhook);
      resolve(await channel.createWebhook(name, { avatar: './avatar.png' }));
    } catch (e) { reject(e); }
  })
}

module.exports.resolveUser = function(message, id, type, checkString = false) {
  return new Promise(async (resolve, reject) => {
    id = id.replace('!', '');
    if (id.startsWith('<@')) id = id.slice(2, id.length - 1);

    try {
      resolve(await message.client.users.fetch(id));
    } catch (e) {
      if (!checkString) return reject(e);

      try { resolve(await resolveUserString(message, id, type));
      } catch (e) { reject(e); }
    }
  })
}

module.exports.resolveChannel = function(message, id, type, checkString = false) {
  return new Promise(async (resolve, reject) => {
    if (id.startsWith('<#')) id = id.slice(2, id.length - 1);

    try {
      resolve(await message.client.channels.fetch(id));
    } catch (e) {
      if (!checkString) return reject(e);

      try { resolve(await resolveChannelString(message, id, type));
      } catch (e) { reject(e); }
    }
  })
}

function resolveUserString(message, string, type) {
  return new Promise(async (resolve, reject) => {
    var users;
    string = string.toLowerCase();

    if (type == checkType.ALL) users = message.client.users.cache;
    else {
      try { users = await message.guild.members.fetch();
      } catch (e) { reject(e); }

      users = users.mapValues(member => member.user);
    }

    users = users.filter(user => {
      if (message.guild) {
        let member = message.guild.member(user);
        if (member && member.displayName.toLowerCase().includes(string)) return user;
      }

      if (user.tag.toLowerCase().includes(string)) return user;
      return;
    }).array();

    let reply = '';
    for (let i = 0; i < users.length; i++) {
      let user = users[i];

      if (reply.length > 0) reply += '\n';
      reply += `[${i}] ${formatDisplayName(user, message.guild ? message.guild.member(user) : null)} ${user.id}`;
    }

    try { resolve(await awaitResolveMessage(message, reply, string, users));
    } catch (e) { reject(e); }
  })
}

function resolveChannelString(message, string, type) {
  return new Promise(async (resolve, reject) => {
    var channels = message.guild.channels.cache.filter(channel => channel.name.toLowerCase().includes(string) && channel.type == type).array();
    string = string.toLowerCase();

    let reply = '';
    for (let i = 0; i < channels.length; i++) {
      let channel = channels[i];

      if (reply.length > 0) reply += '\n';
      reply += `[${i}] ${channel.name} [${channel.type}] (${channel.id})`;
    }

    try { resolve(await awaitResolveMessage(message, reply, string, channels));
    } catch (e) { reject(e); }
  })
}

function awaitResolveMessage(message, reply, string, array) {
  return new Promise(async (resolve, reject) => {
    if (array.length == 0) { await sendMessage(message.channel, messageType.ERROR, { content: util.format(translatePhrase('target_notfound', message.guild ? message.guild.db.lang : process.env.lang), string)}); return resolve(null); }
    if (array.length == 1) return resolve(array[0]);

    let code = null;
    try { code = await sendMessage(message.channel, messageType.CODE, { content: reply });
    } catch (e) { return reject(e); }
    if (!code) return resolve(null);

    let collection = null;
    try {
      collection = await message.channel.awaitMessages(m => m.author.id == message.author.id, { max: 1, time: 10000, errors: ['time']});
    } catch (e) { await sendMessage(message.channel, messageType.ERROR, { content: translatePhrase('target_toolong', message.guild ? message.guild.db.lang : process.env.lang)}); return resolve(null);
    } finally {
      if (!message.guild) return;

      code.forEach(async c => {
        try { await deleteMessage(c, true);
        } catch { }
      })
    }
    if (!collection) return resolve(null);

    let first = collection.first();
    try { await deleteMessage(first, true);
    } catch { }
    if (!first) return resolve(null);

    let pick = parseInt(first.content);
    if (isNaN(pick) || pick < 0 || pick > array.length - 1) { await sendMessage(message.channel, messageType.ERROR, { content: util.format(translatePhrase('target_invalid', message.guild ? message.guild.db.lang : process.env.lang), first.content, array.length - 1)}); return resolve(null); }
    resolve(array[pick]);
  })
}

function translatePhrase(phrase, language) {
  const en = require('../translations/en.json');
  var translation = en[phrase];
  
  if (fs.existsSync(`../translations/${language}.json`)) {
    let lang = require(`../translations/${language}.json`);
    if (lang.hasOwnProperty(phrase)) translation = lang[phrase];
  }

  return translation;
}

function sendMessage(channel, type, data = { }) {
  return new Promise(async (resolve, reject) => {
    if (channel.guild && !channel.permissionsFor(channel.guild.me).has('SEND_MESSAGES')) return resolve(null);

    try {
      switch (type) {
        case messageType.NORMAL: return resolve(await message(channel, data.content));
        case messageType.CODE: return resolve(await messageCode(channel, data.content));
        case messageType.EMBED: return resolve(await messageEmbed(channel, data));
        case messageType.SUCCESS: case messageType.ERROR: case messageType.USAGE: {
          switch (type) {
            case messageType.SUCCESS: data.color = 'GREEN'; break;
            case messageType.ERROR: data.color = 'RED'; break;
            case messageType.USAGE: data.color = 'YELLOW'; break;
          }

          return resolve(await messageEmbed(channel, data));
        }
      }
    } catch (e) { reject(e); }
  })
}

function message(channel, message) {
  return new Promise(async (resolve, reject) => {
    try { resolve(await channel.send(message));
    } catch (e) { reject(e); }
  })
}

function messageCode(channel, message) {
  return new Promise(async (resolve, reject) => {
    try { resolve(await channel.send(message, { code: true, split : true }));
    } catch (e) { reject(e); }
  })
}

function messageEmbed(channel, data) {
  return new Promise(async (resolve, reject) => {
    let embed = new MessageEmbed();
    embed.setDescription(data.content);

    if (data.color) embed.setColor(data.color);
    if (data.footer) embed.setFooter(data.footer);

    try {
      if (!channel.guild || channel.permissionsFor(channel.guild.me).has('EMBED_LINKS')) return resolve(await channel.send(embed));
      resolve(await message(channel, data.content));
    } catch (e) { reject(e); }
  })
}

function formatDisplayName(user, member) {
  let displayName = user.tag;

  if (member && user.username != member.displayName) displayName += ` [${member.displayName}]`;
  return displayName;
}

function deleteMessage(message, bot = false) {
  return new Promise(async (resolve, reject) => {
    try {
      await message.delete();
      if (bot) message.botDelete = true;
      resolve();
    } catch (e) { reject(e); }
  })
}

module.exports.checkType = checkType;
module.exports.messageType = messageType;
module.exports.translatePhrase = translatePhrase;
module.exports.sendMessage = sendMessage;
module.exports.formatDisplayName = formatDisplayName;
module.exports.deleteMessage = deleteMessage;