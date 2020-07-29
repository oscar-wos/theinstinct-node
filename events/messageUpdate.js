const log = require('../log.js');

module.exports = async (client, oldMessage, newMessage) => {
  if (oldMessage.cleanContent == newMessage.cleanContent) return;
  if (!newMessage.hasOwnProperty('changes')) newMessage.changes = [];
  newMessage.changes.push(oldMessage);
  newMessage.createdTimestamp = new Date();

  try { log.send(newMessage.guild, { old: oldMessage, new: newMessage }, log.Type.MESSAGE_UPDATE); }
  catch { }
}