const constants = require('../helpers/constants.js');
const functions = require('../helpers/functions.js');
const log = require('../helpers/log.js');

module.exports = (client, guild, user) => {
  const member = guild.members.resolve(user);
  member.banned = true;

  if (!user.banned) user.banned = {};
  user.banned[guild.id] = true;

  setTimeout(async (guild, member) => {
    const audit = await checkBanEntry(guild, member);

    try {
      await log.send(guild, constants.Log.BAN, {member, executor: audit ? guild.members.resolve(audit.executor) : null, reason: audit.reason});
    } catch { }
  }, process.env.delay, guild, member);
};

checkBanEntry = async (guild, member) => {
  try {
    const auditLog = await functions.fetchAuditLog(guild, 'MEMBER_BAN_ADD');
    if (!auditLog) return;

    const lastBanAudit = guild.audit.ban;
    guild.audit.ban = auditLog;

    if (auditLog.target.id !== member.id) return;
    if (lastBanAudit && lastBanAudit.id === auditLog.id) return;

    return auditLog;
  } catch {
    return;
  }
};
