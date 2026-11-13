// Exact aliases only: the user supplies release territory, never track language.
const normalize = value => value.trim().toLowerCase().replace(/[.\s_-]+/g, '');
const territories = [
  ['德国', 'R2 Europe', 'B', ['GER', 'DEU', 'DE', 'Germany', '德国', '德國']],
  ['日本', 'R2 Japan', 'A', ['JPN', 'JP', 'Japan', '日本']],
  ['美国', 'R1', 'A', ['USA', 'US', 'United States', 'United States of America', '美国', '美國']],
  ['加拿大', 'R1', 'A', ['CAN', 'CA', 'Canada', '加拿大']],
  ['中国大陆', 'R6', 'C', ['CHN', 'CN', 'China', 'Mainland China', '中国', '中國', '中国大陆', '中國大陸']],
  ['香港', 'R3', 'A', ['HKG', 'HK', 'Hong Kong', '香港']],
  ['台湾', 'R3', 'A', ['TWN', 'TW', 'Taiwan', '台湾', '台灣']],
  ['韩国', 'R3', 'A', ['KOR', 'KR', 'South Korea', '韩国', '韓國']],
  ['澳大利亚', 'R4', 'B', ['AUS', 'AU', 'Australia', '澳大利亚', '澳大利亞', '澳洲']],
  ['新西兰', 'R4', 'B', ['NZL', 'NZ', 'New Zealand', '新西兰', '紐西蘭']],
  ['英国', 'R2 Europe', 'B', ['GBR', 'GB', 'UK', 'United Kingdom', '英国', '英國']],
  ['法国', 'R2 Europe', 'B', ['FRA', 'FR', 'France', '法国', '法國']],
  ['意大利', 'R2 Europe', 'B', ['ITA', 'IT', 'Italy', '意大利']],
  ['西班牙', 'R2 Europe', 'B', ['ESP', 'ES', 'Spain', '西班牙']],
  ['欧洲', 'R2 Europe', 'B', ['Europe', '欧洲', '歐洲']],
  ['俄罗斯', 'R5', 'C', ['RUS', 'RU', 'Russia', '俄罗斯', '俄羅斯']],
  ['印度', 'R5', 'C', ['IND', 'IN', 'India', '印度']],
  ['蒙古', 'R5', 'C', ['MNG', 'MN', 'Mongolia', '蒙古']],
  ['南非', 'R2 Europe', 'B', ['ZAF', 'ZA', 'South Africa', '南非']],
  ['埃及', 'R2 Europe', 'B', ['EGY', 'EG', 'Egypt', '埃及']],
  ['巴西', 'R4', 'A', ['BRA', 'BR', 'Brazil', '巴西']],
  ['墨西哥', 'R4', 'A', ['MEX', 'MX', 'Mexico', '墨西哥']],
  ['新加坡', 'R3', 'A', ['SGP', 'SG', 'Singapore', '新加坡']],
  ['马来西亚', 'R3', 'A', ['MYS', 'MY', 'Malaysia', '马来西亚', '馬來西亞']],
  ['泰国', 'R3', 'A', ['THA', 'TH', 'Thailand', '泰国', '泰國']],
];

export function matchRegion(input, media) {
  if (!['DVD', 'Blu-ray'].includes(media)) return { reason: '请先选择 Media 为 DVD 或 Blu-ray；其他介质不套用本地区码表。' };
  const token = normalize(input);
  if (!token) return { reason: '请输入发行地区或明确的区码。' };
  const codes = media === 'DVD' ? ['R1', 'R2 Japan', 'R2 Europe', 'R3', 'R4', 'R5', 'R6'] : ['A', 'B', 'C'];
  const code = codes.find(v => normalize(v) === token);
  if (code) return { value: code, label: code };
  // R2 Europe is the site's option label; do not equate non-European R2 territories to it.
  const found = territories.find(row => row[3].some(alias => normalize(alias) === token));
  if (found) {
    if (media === 'DVD' && ['南非', '埃及'].includes(found[0])) return { reason: '该地区属于 DVD R2，但本站只有 R2 Japan / R2 Europe；请按本站规则手动核实。' };
    return { value: found[media === 'DVD' ? 1 : 2], label: found[0] };
  }
  return { reason: '未匹配到唯一的站点区码，请检查拼写、Media 或手动选择；R2、ALL、ABC、多地区输入不会自动填写。' };
}
