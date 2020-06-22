const sql = require('../sql.js');

module.exports = async (client) => {
  for (let guild of client.guilds.cache.values()) {
    try {
      guild.db = await sql.loadGuild(client, guild.id);
      guild.ready = true;

      if (guild.db.log.webhook.id != null) guild.logHook = await client.fetchWebhook(guild.db.log.webhook.id, guild.db.log.webhook.token);
    } catch (e) { console.error(e); }
  }

  console.log(`Ready to serve in ${client.channels.cache.size} channels on ${client.guilds.cache.size} servers, for a total of ${client.users.cache.size} users.`);
}