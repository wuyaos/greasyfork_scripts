

const isMTeamHost = () => /(^|\.)m-team\.(cc|io|vip)$/.test(window.location.hostname);

const isMTeamDetail = () => isMTeamHost() && window.location.pathname.startsWith('/detail/');



export { isMTeamDetail, isMTeamHost };
