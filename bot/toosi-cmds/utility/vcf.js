'use strict';
// ─────────────────────────────────────────────────────────────
//  VCF Command
//   • In a group with no args  → proper .vcf file (tap to import
//     all contacts directly into your phone's contacts app)
//   • With args (anywhere)     → single WhatsApp contact card
// ─────────────────────────────────────────────────────────────

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { resolveDisplayWithName } = require('../../lib/groupUtils');

function e164(digits) { return `+${digits}`; }

function escapeName(n) {
    return (n || '').replace(/[;:,\\]/g, ' ').trim();
}

/** Parse "Name ~ +number" output from resolveDisplayWithName */
function parseDisplayStr(s) {
    const idx = s.indexOf(' ~ *');
    if (idx >= 0) {
        return { phone: s.slice(0, idx).trim(), name: s.slice(idx + 4).replace(/\*$/, '').trim() || null };
    }
    return { phone: s.trim(), name: null };
}

/**
 * Build one vCard entry.
 * FN (display name) = "Name - +number" when name known, else just "+number"
 * This makes the contact easy to identify on import AND directly importable.
 */
function makeVcard(digits, name) {
    const clean  = name ? escapeName(name) : null;
    const fn     = clean ? `${clean} - ${e164(digits)}` : e164(digits);
    const parts  = clean ? clean.split(' ') : [];
    const last   = parts[0] || '';
    const first  = parts.slice(1).join(' ');
    return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${fn}`,
        `N:${last};${first};;;`,
        `TEL;type=CELL;type=VOICE;waid=${digits}:${e164(digits)}`,
        'END:VCARD',
    ].join('\r\n');
}

module.exports = {
    name: 'vcf',
    aliases: ['contact', 'vcard', 'sendcontact', 'groupvcf', 'savecontacts'],
    description: 'Single contact card, or export all group members as an importable .vcf file',
    category: 'utility',

    async execute(sock, msg, args, prefix, ctx) {
        const chatId  = msg.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const raw     = args.join(' ').trim();

        try { await sock.sendMessage(chatId, { react: { text: '📇', key: msg.key } }); } catch {}

        // ── SINGLE CONTACT BUBBLE ─────────────────────────────
        if (raw) {
            const parts  = raw.split(/\s+/);
            const numRaw = parts.find(p => /^[+\d]/.test(p) && p.replace(/\D/g, '').length >= 7);
            const name   = parts.filter(p => p !== numRaw).join(' ').trim();

            if (!numRaw) return sock.sendMessage(chatId, {
                text: `╔═|〔  CONTACT CARD 〕\n║\n║ ▸ ❌ No phone number found\n║ ▸ Include country code: +254...\n║\n║ ▸ *Usage* : ${prefix}vcf <name> <number>\n║ ▸ *Group* : ${prefix}vcf  (no args = export all)\n║\n╚═╝`,
            }, { quoted: msg });

            const digits  = numRaw.replace(/\D/g, '');
            const display = name || e164(digits);

            await sock.sendMessage(chatId, {
                contacts: {
                    displayName: display,
                    contacts: [{ vcard: makeVcard(digits, name || null) }],
                },
            }, { quoted: msg });
            return;
        }

        // ── GROUP BULK EXPORT MODE ────────────────────────────
        if (!isGroup) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  CONTACT CARD 〕\n║\n║ ▸ *Usage* : ${prefix}vcf <name> <number>\n║ ▸ Example : ${prefix}vcf John +254712345678\n║\n║ ▸ In a group (no args):\n║   Exports all members as a .vcf file\n║   Tap the file → Import all contacts\n║\n╚═╝`,
            }, { quoted: msg });
        }

        let meta;
        try {
            meta = await sock.groupMetadata(chatId);
        } catch (e) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  GROUP CONTACTS 〕\n║\n║ ▸ ❌ ${e.message}\n║\n╚═╝`,
            }, { quoted: msg });
        }

        const participants = meta.participants || [];
        if (!participants.length) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  GROUP CONTACTS 〕\n║\n║ ▸ ❌ No members found\n║\n╚═╝`,
            }, { quoted: msg });
        }

        const vcards  = [];
        const skipped = [];

        for (const p of participants) {
            const jid = p.id || p.jid || '';
            if (!jid) continue;
            try {
                const displayStr      = await resolveDisplayWithName(sock, chatId, jid, p.notify || null);
                const { phone, name } = parseDisplayStr(displayStr);
                if (!phone.startsWith('+')) { skipped.push(jid); continue; }
                const digits = phone.replace(/\D/g, '');
                if (digits.length < 7 || digits.length > 15) { skipped.push(jid); continue; }
                vcards.push(makeVcard(digits, name));
            } catch {
                skipped.push(jid);
            }
        }

        if (!vcards.length) {
            return sock.sendMessage(chatId, {
                text: `╔═|〔  GROUP CONTACTS 〕\n║\n║ ▸ ❌ Could not resolve any numbers\n║ ▸ Members : ${participants.length}\n║ ▸ Skipped : ${skipped.length} (unresolved LIDs)\n║\n║ ▸ Tip: Ask members to send a message\n║   so the bot learns their numbers\n║\n╚═╝`,
            }, { quoted: msg });
        }

        const groupName = (meta.subject || 'Group').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Group';
        const fileName  = `${groupName}_contacts.vcf`;
        const tmpPath   = path.join(os.tmpdir(), `vcf_${Date.now()}_${fileName}`);

        fs.writeFileSync(tmpPath, vcards.join('\r\n') + '\r\n', 'utf-8');

        const skipNote = skipped.length ? `\n║ ▸ Skipped  : ${skipped.length} (unresolved)` : '';

        try {
            const buf = fs.readFileSync(tmpPath);
            await sock.sendMessage(chatId, {
                document: buf,
                mimetype: 'text/vcard',
                fileName,
                caption: `╔═|〔  GROUP CONTACTS 〕\n║\n║ ▸ ✅ *${groupName}*\n║ ▸ Contacts : ${vcards.length}/${participants.length}${skipNote}\n║\n║ ▸ 📲 Tap the file → *Import*\n║   to save all numbers at once\n║\n╚═╝`,
            }, { quoted: msg });
        } finally {
            try { fs.unlinkSync(tmpPath); } catch {}
        }
    }
};
