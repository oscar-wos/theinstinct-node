const functions = require('../functions/functions.js');
const log = require('../functions/log.js');

module.exports = async (client, message) => {
  if (!message.member) return;

  let guild = message.guild;
  let audit = null;
  let executor = null;

  if (guild.me.permissions.has('VIEW_AUDIT_LOG')) {
    try { audit = await checkAuditEntry(guild, message);
    } catch { }
  }

  if (message.author.bot || message.botDelete) return;
  if (audit) executor = guild.member(audit.executor);

  try { await log.send(guild, { message, executor }, log.Type.MESSAGE_DELETE);
  } catch { } 
}

function checkAuditEntry(guild, message) {
  return new Promise(async (resolve, reject) => {
    try {
      let auditLog = await functions.fetchAuditLog(guild, 'MESSAGE_DELETE');
      if (!auditLog) return resolve(null);

      let lastMessageAudit = guild.audit.message;
      guild.audit.message = auditLog;

      if (auditLog.target.id != message.author.id) return resolve(null);

      if (lastMessageAudit) {
        if (lastMessageAudit.id == auditLog.id && lastMessageAudit.extra.count == auditLog.extra.count) return resolve(null);
      }

      return resolve(auditLog);
    } catch { resolve(null); }
  })
}