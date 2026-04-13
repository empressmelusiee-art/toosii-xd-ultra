'use strict';

let _channelMode = false;
let _setBy       = null;
let _channelInfo = { name: 'TOOSII-XD ULTRA', jid: null };

function isChannelModeEnabled()       { return _channelMode; }
function setChannelMode(val, who)     { _channelMode = !!val; _setBy = who || null; }
function getChannelModeSetBy()        { return _setBy; }
function getChannelInfo()             { return { ..._channelInfo }; }
function setChannelInfo(jid, name)    { _channelInfo = { jid: jid || null, name: name || 'TOOSII-XD ULTRA' }; }

module.exports = { isChannelModeEnabled, setChannelMode, getChannelModeSetBy, getChannelInfo, setChannelInfo };
