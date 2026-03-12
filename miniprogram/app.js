// app.js
var QQMapWX = require('./lib/qqmap-wx-jssdk.js');
var qqmapsdk;
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const WX_LOCATION_KEY = 'F4SBZ-SY6LJ-LHCFC-XFRW7-2CNC5-YHBYX';

// 测试环境配置
const IS_TEST_ENV = true; // 设置为 false 使用生产环境

// 生产环境配置
const DEEPSEEK_API_URL_PROD = 'https://api.deepseek.com/v1/chat/completions';
const AI_MODEL_PROD = 'deepseek-chat';
const ENCRYPTED_API_KEY_PROD = 'c2stNjBhZjA4NDIyY2I3NDNhNThjMGY2ZTI2MDM5ZGZlZDI=';

// 测试环境配置
const DEEPSEEK_API_URL_TEST = 'https://integrate.api.nvidia.com/v1/chat/completions';
const AI_MODEL_TEST = 'deepseek-ai/deepseek-v3.1';
const DEEPSEEK_API_KEY_TEST = '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';

// 根据环境选择配置
const DEEPSEEK_API_URL = IS_TEST_ENV ? DEEPSEEK_API_URL_TEST : DEEPSEEK_API_URL_PROD;
const AI_MODEL = IS_TEST_ENV ? AI_MODEL_TEST : AI_MODEL_PROD;

// Helper function to decode Base64
const decodeBase64 = (encoded) => {
  try {
    return wx.getStorageSync('_temp_' + Math.random()) ? '' : atob(encoded);
  } catch (e) {
    // Fallback for WeChat mini program
    const binaryString = wx.getStorageSync('_b64_' + encoded);
    if (binaryString) return binaryString;
    
    let binary = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    for (let i = 0; i < encoded.length; i++) {
      const bit1 = chars.indexOf(encoded.charAt(i));
      const bit2 = chars.indexOf(encoded.charAt(++i));
      const bit3 = chars.indexOf(encoded.charAt(++i));
      const bit4 = chars.indexOf(encoded.charAt(++i));
      
      const b1 = (bit1 << 2) | (bit2 >> 4);
      const b2 = ((bit2 & 0xF) << 4) | (bit3 >> 2);
      const b3 = ((bit3 & 0x3) << 6) | bit4;
      
      binary += String.fromCharCode(b1);
      if (bit3 !== 64) binary += String.fromCharCode(b2);
      if (bit4 !== 64) binary += String.fromCharCode(b3);
    }
    return binary;
  }
};

function weatherCodeToText(code) {
  if (code == null) return '—';
  const map = {
    0: '晴',
    1: '大部晴朗',
    2: '局部多云',
    3: '阴',
    45: '雾',
    48: '雾凇',
    51: '毛毛雨',
    53: '毛毛雨',
    55: '毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    66: '冻雨',
    67: '冻雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '雪粒',
    80: '小阵雨',
    81: '阵雨',
    82: '大阵雨',
    85: '小阵雪',
    86: '阵雪',
    95: '雷雨',
    96: '雷雨伴冰雹',
    99: '强雷雨伴冰雹'
  };
  return map[code] || '—';
}

// 过滤 API 响应文本
// 1. 移除 </think> 及之前的所有内容
// 2. 移除全是英文的段落
function filterAnalysisText(text) {
  if (!text) return text;

  // 第一步：移除 </think> 及之前的所有内容
  const thinkIndex = text.indexOf('</think>');
  if (thinkIndex !== -1) {
    text = text.substring(thinkIndex + 8); // 8 是 '</think>'.length
  }

  // 第二步：移除全是英文的段落
  // 将文本按段落分割（以换行符或句号等分割）
  const paragraphs = text.split(/(\n\n+)/); // 保留分隔符
  const filteredParagraphs = paragraphs.map((para) => {
    if (para.match(/^\n+$/)) return para; // 保留空行分隔符
    // 检查段落是否是全英文（只包含英文字母、数字、标点等，没有中文）
    const hasChinese = /[\u4e00-\u9fff\u3400-\u4dbf]/g.test(para);
    
    if (!hasChinese && para.trim().length > 0) {
      // 这个段落全是英文，移除它
      return '';
    }
    return para;
  });

  // 拼接回来，并清理多余的空行
  const result = filteredParagraphs.join('').replace(/\n\n\n+/g, '\n\n').trim();
  return result;
}

// 获取位置和天气信息
const fetchLocationAndWeather = (app) => {
  qqmapsdk = new QQMapWX({
    key: WX_LOCATION_KEY
  });
  
  app.globalData.cityLoading = true;
  app.globalData.weatherLoading = true;
  
  wx.getLocation({
    type: 'gcj02',
    success: (res) => {
      const latitude = res.latitude;
      const longitude = res.longitude;
      
      console.log('纬度：', latitude);
      console.log('经度：', longitude);
      
      // 获取天气
      callOpenMeteo(latitude, longitude, app);
      
      // 获取地址信息
      qqmapsdk.reverseGeocoder({
        location: {
          latitude: latitude,
          longitude: longitude
        },
        success: (addressRes) => {
          const addressComponent = addressRes.result.address_component || {};
          const city = addressComponent.city || '';
          const district = addressComponent.district || '';
          const displayName = district ? (city + district) : city;
          console.log('解析后的地址:', displayName);
          app.globalData.cityName = displayName || '';
          app.globalData.cityLoading = false;
        },
        fail: (error) => {
          console.error('地址解析失败:', error);
          app.globalData.cityLoading = false;
        }
      });
    },
    fail: (err) => {
      console.log('获取位置失败', err);
      app.globalData.cityLoading = false;
      app.globalData.weatherLoading = false;
    }
  });
};

// 调用OpenMeteo获取天气
const callOpenMeteo = (latitude, longitude, app) => {
  const url = `${OPEN_METEO_BASE}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code`;
  wx.request({
    url,
    method: 'GET',
    success: (res) => {
      if (res.statusCode === 200 && res.data && res.data.current) {
        const cur = res.data.current;
        const temp = cur.temperature_2m != null ? Math.round(cur.temperature_2m) + '°C' : '';
        const text = weatherCodeToText(cur.weather_code);
        app.globalData.weatherText = text;
        app.globalData.weatherTemp = temp;
        app.globalData.weatherLoading = false;
        console.log('天气信息已更新:', { text, temp });
      } else {
        app.globalData.weatherLoading = false;
      }
    },
    fail: () => {
      console.error('获取天气失败');
      app.globalData.weatherLoading = false;
    }
  });
};

const callDeepseekAPI = (prompt, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      if (!wx || !wx.request) {
        reject(new Error('小程序环境不支持'));
        return;
      }

      const url = DEEPSEEK_API_URL;
      const model = AI_MODEL;
      
      // 根据环境获取 API Key
      let apiKey;
      if (IS_TEST_ENV) {
        apiKey = DEEPSEEK_API_KEY_TEST;
      } else {
        apiKey = decodeBase64(ENCRYPTED_API_KEY_PROD);
      }

      let hasResponded = false;
      const timeoutTimer = setTimeout(() => {
        if (!hasResponded) {
          hasResponded = true;
          console.error('[callDeepseekAPI] API 请求超时');
          reject(new Error('API 请求超时'));
        }
      }, 60000);

      wx.request({
        url: url,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          top_p: 0.8,
          max_tokens: 4096,
          stream: false
        },
        success: (res) => {
          if (!hasResponded) {
            clearTimeout(timeoutTimer);
            console.log('[callDeepseekAPI] API 响应:', res);
            if (res.statusCode === 200 && res.data) {
              const content = res.data.choices?.[0]?.message?.content || '';
              if (content) {
                resolve(filterAnalysisText(content));
              } else {
                console.error('[callDeepseekAPI] 响应中没有内容:', res.data);
                reject(new Error('API 返回数据格式异常'));
              }
            } else {
              console.error('[callDeepseekAPI] API 请求失败:', res.statusCode, res.data);
              reject(new Error(`API 请求失败 (状态码: ${res.statusCode})`));
            }
            hasResponded = true;
          }
        },
        fail: (err) => {
          if (!hasResponded) {
            clearTimeout(timeoutTimer);
            hasResponded = true;
            console.error('[callDeepseekAPI] 请求失败:', err);
            reject(new Error('网络请求失败'));
          }
        }
      });
    } catch (e) {
      console.error('[callDeepseekAPI] 调用出错:', e);
      reject(e);
    }
  });
};

// ===== Destiny Page Data and Utilities =====
const DESTINY_STORIES = [
  {
    id: 'hongloumeng',
    name: '红楼梦',
    icon: '🏮',
    desc: '四大名著之首，封建社会的百科全书'
  },
  {
    id: 'zhenhuanzhuan',
    name: '甄嬛传',
    icon: '👑',
    desc: '宫廷权谋，女性成长史诗'
  },
  {
    id: 'zhifou',
    name: '知否知否应是绿肥红瘦',
    icon: '🌸',
    desc: '古代女性的智慧与抉择'
  }
];

const DESTINY_CHARACTERS = {
  hongloumeng: {
    name: '红楼梦',
    characters: [
      { id: 'lind', name: '林黛玉', avatar: '🌺', desc: '才华横溢，敏感多情' },
      { id: 'baoc', name: '贾宝玉', avatar: '💎', desc: '叛逆不羁，情深意重' },
      { id: 'xueb', name: '薛宝钗', avatar: '🦋', desc: '端庄贤淑，处事圆融' },
      { id: 'wangx', name: '王熙凤', avatar: '👸', desc: '精明能干，权谋高手' }
    ]
  },
  zhenhuanzhuan: {
    name: '甄嬛传',
    characters: [
      { id: 'zhenh', name: '甄嬛', avatar: '👑', desc: '从天真到成熟的蜕变' },
      { id: 'huanghou', name: '皇后', avatar: '🦚', desc: '高贵冷艳，心机深沉' },
      { id: 'huafei', name: '华妃', avatar: '🔥', desc: '骄纵跋扈，爱恨分明' },
      { id: 'jingfei', name: '敬妃', avatar: '🌙', desc: '温柔善良，隐忍坚韧' }
    ]
  },
  zhifou: {
    name: '知否知否应是绿肥红瘦',
    characters: [
      { id: 'minglan', name: '盛明兰', avatar: '🌸', desc: '聪慧隐忍，步步为营' },
      { id: 'molan', name: '盛墨兰', avatar: '🥀', desc: '野心勃勃，不择手段' },
      { id: 'rulan', name: '盛如兰', avatar: '🌼', desc: '直率真诚，敢爱敢恨' },
      { id: 'hualan', name: '盛华兰', avatar: '🌹', desc: '温婉大气，持家有道' }
    ]
  }
};

const DESTINY_CHARACTER_INFO = {
  hongloumeng: {
    lind: { name: '林黛玉', desc: '才华横溢、敏感多情的女子，红楼梦中的悲剧人物' },
    baoc: { name: '贾宝玉', desc: '木石前盟的痴情公子，反叛传统但又不得不接受命运' },
    xueb: { name: '薛宝钗', desc: '端庄贤淑、处事圆融的公侯千金' },
    wangx: { name: '王熙凤', desc: '精明能干、权谋高手、贾府的实际管理者' }
  },
  zhenhuanzhuan: {
    zhenh: { name: '甄嬛', desc: '从天真少女到后宫之主的蜕变者，经历过陷害、复仇與权谋' },
    huanghou: { name: '皇后', desc: '高贵冷艳、心机深沉的皇后，为维护地位不惜一切' },
    huafei: { name: '华妃', desc: '骄纵跋扈、爱恨分明的妃嫔，权势者的悲剧' },
    jingfei: { name: '敬妃', desc: '温柔善良、隐忍坚韧的妃嫔，沉默中蕴含力量' }
  },
  zhifou: {
    minglan: { name: '盛明兰', desc: '聪慧隐忍、步步为营的庶女，用智慧改变命运' },
    molan: { name: '盛墨兰', desc: '野心勃勃、不择手段的庶女，最终为所作所为付出代价' },
    rulan: { name: '盛如兰', desc: '直率真诚、敢爱敢恨的二女儿' },
    hualan: { name: '盛华兰', desc: '温婉大气、持家有道的长女' }
  }
};

const DESTINY_STORY_NAMES = {
  hongloumeng: '红楼梦',
  zhenhuanzhuan: '甄嬛传',
  zhifou: '知否知否应是绿肥红瘦'
};

const DESTINY_DEFAULT_QUESTIONS = [
  { question: '面对生活中的重大抉择，你会？', options: ['顺从本心', '听从劝告', '寻求平衡', '倾听直觉'] },
  { question: '在利益与信念冲突时，你选择？', options: ['坚守信念', '权衡利益', '寻求折中', '随遇而安'] },
  { question: '面对误解和指责，你会？', options: ['直言相对', '沉默承受', '冷静化解', '远离喧嚣'] },
  { question: '在感情与责任之间，你更看重？', options: ['追求感情', '肩负责任', '两者兼顾', '保持独立'] },
  { question: '面对未知的未来，你的态度是？', options: ['勇敢前行', '谨慎筹谋', '珍惜当下', '接纳变化'] }
];

const getIconByTitle = (title) => {
  if (title.includes('勇') || title.includes('开拓') || title.includes('进取')) return '🌟';
  if (title.includes('智') || title.includes('谋') || title.includes('慧')) return '🌙';
  if (title.includes('平衡') || title.includes('和') || title.includes('圆满')) return '🌸';
  if (title.includes('安') || title.includes('静') || title.includes('淡')) return '🍃';
  if (title.includes('权') || title.includes('势') || title.includes('强')) return '👑';
  if (title.includes('情') || title.includes('爱') || title.includes('心')) return '💖';
  if (title.includes('悲') || title.includes('苦') || title.includes('难')) return '🥀';
  if (title.includes('福') || title.includes('喜') || title.includes('乐')) return '🌺';
  return '✨';
};

const parseAnalysisResponse = (response) => {
  const lines = response.split('\n');
  let title = '';
  let content = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('标题：') || line.startsWith('标题:')) {
      title = line.replace(/^标题[：:]/, '').trim();
    } else if (line.startsWith('分析：') || line.startsWith('分析:')) {
      content = line.replace(/^分析[：:]/, '').trim();
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim()) {
          content += '\n' + lines[j].trim();
        }
      }
      break;
    }
  }

  if (!title || !content) {
    const parts = response.split('\n\n');
    if (parts.length >= 2) {
      title = parts[0].replace(/^标题[：:]/, '').trim();
      content = parts.slice(1).join('\n\n').replace(/^分析[：:]/, '').trim();
    } else {
      title = '命运之轮';
      content = response;
    }
  }

  return { title, content };
};

App({
  callDeepseekAPI: callDeepseekAPI,
  destinyStories: DESTINY_STORIES,
  destinyCharacters: DESTINY_CHARACTERS,
  destinyCharacterInfo: DESTINY_CHARACTER_INFO,
  destinyStoryNames: DESTINY_STORY_NAMES,
  destinyDefaultQuestions: DESTINY_DEFAULT_QUESTIONS,
  getIconByTitle: getIconByTitle,
  parseAnalysisResponse: parseAnalysisResponse,
  
  onLaunch: function () {
    // 计算当前日期和季节（北半球）
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let currentSeasonEn = 'winter';
    let currentSeasonZh = '冬季';
    if (month === 3 || month === 4 || month === 5) {
      currentSeasonEn = 'spring';
      currentSeasonZh = '春季';
    } else if (month === 6 || month === 7 || month === 8) {
      currentSeasonEn = 'summer';
      currentSeasonZh = '夏季';
    } else if (month === 9 || month === 10 || month === 11) {
      currentSeasonEn = 'autumn';
      currentSeasonZh = '秋季';
    } else {
      currentSeasonEn = 'winter';
      currentSeasonZh = '冬季';
    }

    this.globalData = {
      // env 参数说明：
      //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
      //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
      //   如不填则使用默认环境（第一个创建的环境）
      env: "",
      lastAnalysis: '', // 存储解析内容
      currentDateStr,
      currentSeasonEn,
      currentSeasonZh,
      cityName: '', // 地区
      weatherText: '', // 天气描述
      weatherTemp: '', // 温度
      cityLoading: true, // 地区解析加载状态
      weatherLoading: true // 天气解析加载状态
    };
    
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
    
    // 获取位置和天气信息
    fetchLocationAndWeather(this);
  }
});
