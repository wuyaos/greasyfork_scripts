import { normalizeSiteKey } from './config.js';



const AUTO_FEED_SITE_DEFS = [
        { url: 'https://1ptba.com/', aliases: ['1ptba'] },
        { url: 'https://audiences.me/', aliases: ['audiences'] },
        { url: 'https://beyond-hd.me/', aliases: ['bhd', 'beyondhd'] },
        { url: 'https://broadcasthe.net/', aliases: ['btn'] },
        { url: 'https://byr.pt/', aliases: ['byr'] },
        { url: 'https://pt.btschool.club/', aliases: ['btschool'] },
        { url: 'https://carpt.net/', aliases: ['carpt'] },
        { url: 'https://springsunday.net/', aliases: ['cmct'] },
        { url: 'https://ptchdbits.co/', aliases: ['chdbits'] },
        { url: 'https://cspt.top/', aliases: ['cspt', '财神'] },
        { url: 'https://discfan.net/', aliases: ['discfan'] },
        { url: 'https://eiga.moi/', aliases: ['eiga', 'acm'] },
        { url: 'https://filelist.io/', aliases: ['filelist'] },
        { url: 'https://pt.0ff.cc/', aliases: ['freefarm'] },
        { url: 'https://greatposterwall.com/', aliases: ['gpw', 'greatposterwall'] },
        { url: 'https://www.haidan.video/', aliases: ['haidan'] },
        { url: 'https://hdarea.club/', aliases: ['hdarea'] },
        { url: 'https://hdbits.org/', aliases: ['hdb', 'hdbits'] },
        { url: 'https://hdcity.city/', aliases: ['hdcity'] },
        { url: 'https://www.hddolby.com/', aliases: ['hddolby'] },
        { url: 'http://hdfans.org/', aliases: ['hdfans'] },
        { url: 'https://hdhome.org/', aliases: ['hdhome'] },
        { url: 'https://hdsky.me/', aliases: ['hdsky'] },
        { url: 'https://hd-space.org/', aliases: ['hdspace', 'hd-space'] },
        { url: 'https://hdtime.org/', aliases: ['hdtime'] },
        { url: 'https://pt.upxin.net/', aliases: ['hdu'] },
        { url: 'https://hudbt.hust.edu.cn/', aliases: ['hudbt'] },
        { url: 'https://iptorrents.com/', aliases: ['ipt', 'iptorrents'] },
        { url: 'https://monikadesign.uk/', aliases: ['monika', 'monikadesign'] },
        { url: 'https://kp.m-team.cc/', aliases: ['mteam', 'm-team', '馒头', 'mt'], hosts: ['m-team.cc', 'm-team.io', 'm-team.vip'] },
        { url: 'https://nanyangpt.com/', aliases: ['nanyang'] },
        { url: 'https://ourbits.club/', aliases: ['ourbits'] },
        { url: 'https://pterclub.net/', aliases: ['pter', 'pterclub'] },
        { url: 'https://www.pthome.net/', aliases: ['pthome'] },
        { url: 'https://ptsbao.club/', aliases: ['ptsbao'] },
        { url: 'https://www.pttime.org/', aliases: ['ptt'] },
        { url: 'https://pt.sjtu.edu.cn/', aliases: ['putao'] },
        { url: 'https://www.qingwapt.org/', aliases: ['qingwa', 'qingwapt', '青蛙'], hosts: ['qingwapt.com', 'qingwapt.org'] },
        { url: 'https://rousi.pro/', aliases: ['rousi'] },
        { url: 'https://et8.org/', aliases: ['tccf'] },
        { url: 'https://www.tjupt.org/', aliases: ['tjupt'] },
        { url: 'http://pt.eastgame.org/', aliases: ['tlfbits'] },
        { url: 'https://totheglory.im/', aliases: ['ttg'] },
        { url: 'https://ubits.club/', aliases: ['ubits'] },
        { url: 'https://www.yemapt.org/', aliases: ['yemapt'] },
        { url: 'https://zmpt.cc/', aliases: ['zmpt'] },
        { url: 'https://zhuque.in/', aliases: ['zhuque', '朱雀'] }
    ];

const normalizedHost = raw => {
        try {
            const text = String(raw || '');
            const url = /^https?:\/\//i.test(text) ? new URL(text) : new URL(`https://${text}`);
            return url.hostname.replace(/^www\./, '').toLowerCase();
        } catch (_) {
            return String(raw || '').replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0].toLowerCase();
        }
    };

const AUTO_FEED_SITE_URLS = Object.fromEntries(AUTO_FEED_SITE_DEFS.flatMap(def => (def.aliases || []).flatMap(alias => [
        [String(alias || '').toLowerCase(), def.url],
        [normalizeSiteKey(alias), def.url]
    ]).filter(([key]) => key)));

const AUTO_FEED_HOST_URLS = Object.fromEntries(AUTO_FEED_SITE_DEFS.flatMap(def => [def.url, ...(def.hosts || [])].map(raw => [normalizedHost(raw), def.url]).filter(([host]) => host)));

const AUTO_FEED_CANONICAL_HOSTS = Object.fromEntries(AUTO_FEED_SITE_DEFS.flatMap(def => {
        const canonical = normalizeSiteKey((def.aliases || [])[0]) || normalizedHost(def.url);
        return [def.url, ...(def.hosts || [])].map(raw => [normalizedHost(raw), canonical]).filter(([host]) => host);
    }));



export { AUTO_FEED_CANONICAL_HOSTS, AUTO_FEED_HOST_URLS, AUTO_FEED_SITE_DEFS, AUTO_FEED_SITE_URLS };
