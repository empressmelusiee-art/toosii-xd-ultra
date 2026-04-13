require('dotenv').config();

  // Hardcoded creator numbers — always have access on ANY deployment
  const CREATORS = ['254748340864', '254746677793'];

  module.exports = {
      SESSION_ID:      process.env.SESSION_ID      || '',
      OWNER_NUMBER:    process.env.OWNER_NUMBER    || '',
      PREFIX:          process.env.PREFIX          || '.',
      BOT_NAME:        process.env.BOT_NAME        || 'TOOSII-XD ULTRA',
      OWNER_NAME:      process.env.OWNER_NAME      || 'TOOSII',
      MODE:            process.env.MODE            || 'public',
      TIME_ZONE:       process.env.TIME_ZONE       || 'Africa/Nairobi',
      PORT:            parseInt(process.env.PORT)  || 3000,
      // WhatsApp Channel JID — menu appears as "Forwarded from <channel>"
      // Get yours: open any WhatsApp Channel → copy the invite link → extract the JID
      // Format: 120363XXXXXXXXXX@newsletter
      NEWSLETTER_JID:  process.env.NEWSLETTER_JID  || '',
      CREATORS,
  };
  