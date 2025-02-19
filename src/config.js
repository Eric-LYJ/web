import utils from "utils";
const config = {
    Trinity_Domain: process.env.REACT_APP_DOMAIN,
    Trinity_API: process.env.REACT_APP_API_URL,
    BasePath: process.env.REACT_APP_BASE_PATH,
    AmisTheme: 'cxd',
    AmisLocale: ({ 'S': 'zh-CN', 'T': 'zh-TW', 'E': 'en-US' })[utils.getUserLanguageCode()] || 'zh-CN'
 }
 export default config;