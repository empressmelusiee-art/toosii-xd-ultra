async function handleChannelReact(sock, msg) {}
async function discoverNewsletters(sock) {}
const channelReactManager = {
    isEnabled: () => false,
    registerNewsletter: () => {},
    unregisterNewsletter: () => {},
};
module.exports = { handleChannelReact, discoverNewsletters, channelReactManager };
