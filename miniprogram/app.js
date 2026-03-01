// app.js
var QQMapWX = require('./lib/qqmap-wx-jssdk.js');
var qqmapsdk;
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const WX_LOCATION_KEY = 'F4SBZ-SY6LJ-LHCFC-XFRW7-2CNC5-YHBYX';
const NVIDIA_DEEPSEEK_API_KEY = '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';
const DEEPSEEK_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const AI_MODEL = 'deepseek-ai/deepseek-r1-distill-qwen-14b';
// API Key encoded in Base64 (encrypted)
const ENCRYPTED_API_KEY = 'c2stNjBhZjA4NDIyY2I3NDNhNThjMGY2ZTI2MDM5ZGZlZDI=';

// WMO 天气现象代码 -> 简短中文描述
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

const DEEPSEEK_API_URL_2 = 'https://api.deepseek.com/v1/chat/completions';
const AI_MODEL_2 = 'deepseek-chat';

// 调用DeepSeek API
// 获取位置和天气信息
const fetchLocationAndWeather = (app) => {
  qqmapsdk = new QQMapWX({
    key: WX_LOCATION_KEY
  });
  
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
        },
        fail: (error) => {
          console.error('地址解析失败:', error);
        }
      });
    },
    fail: (err) => {
      console.log('获取位置失败', err);
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
        console.log('天气信息已更新:', { text, temp });
      }
    },
    fail: () => {
      console.error('获取天气失败');
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

      let requestId = Math.random();
      let hasResponded = false;

      const makeRequest = (url, apiKey, model) => {
        if (typeof url === 'undefined') {
          console.error('[callDeepseekAPI] ENCRYPTED_API_KEY 未定义');
          reject(new Error('API密钥配置错误'));
        }
        const currentRequestId = requestId;
        const timeoutTimer = setTimeout(() => {
          if (!hasResponded && currentRequestId === requestId) {
            hasResponded = true;
            console.log('[callDeepseekAPI] 第一个API超时，切换到备用地址');
            
            // If this is the first URL, try the second one
            if (url === DEEPSEEK_API_URL) {
              requestId = Math.random();
              hasResponded = false; // Reset for the retry attempt
              makeRequest(DEEPSEEK_API_URL_2, decodeBase64(ENCRYPTED_API_KEY), AI_MODEL_2);
              
            } else {
              reject(new Error('所有API请求均超时'));
            }
          }
        }, 30000); // 20 seconds timeout

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
              { role: 'system', content: prompt }
            ],
            temperature: 0.7,
            top_p: 0.8,
            max_tokens: 4096,
            stream: false
          },
          success: (res) => {
            if (!hasResponded && currentRequestId === requestId) {
              
              clearTimeout(timeoutTimer);
              console.log('[callDeepseekAPI] API 响应:', res);
              if (res.statusCode === 200 && res.data) {
                const content = res.data.choices?.[0]?.message?.content || '';
                if (content) {
                  resolve(filterAnalysisText(content));
                  hasResponded = true;
                } else {  
                  console.error('[callDeepseekAPI] 响应中没有内容:', res.data);
                  if (url === DEEPSEEK_API_URL) {
                    console.log('[callDeepseekAPI] 第一个API失败，切换到备用地址');
                    requestId = Math.random();
                    hasResponded = false; // Reset for the retry attempt
                    makeRequest(DEEPSEEK_API_URL_2, decodeBase64(ENCRYPTED_API_KEY), AI_MODEL_2);
                  }
                  else{
                    reject(new Error('API 返回数据格式异常'));
                  }
                }
              } else {
                console.error('[callDeepseekAPI] API 请求失败:', res.statusCode, res.data);
                if (url === DEEPSEEK_API_URL) {
                  console.log('[callDeepseekAPI] 第一个API失败，切换到备用地址');
                  requestId = Math.random();
                  hasResponded = false; // Reset for the retry attempt
                  makeRequest(DEEPSEEK_API_URL_2, decodeBase64(ENCRYPTED_API_KEY), AI_MODEL_2);
                }
                else{
                  reject(new Error(`API 请求失败 (状态码: ${res.statusCode})`));
                }
              }
            }
          },
          fail: (err) => {
            if (!hasResponded && currentRequestId === requestId) {
              hasResponded = true;
              clearTimeout(timeoutTimer);
              console.error('[callDeepseekAPI] 请求失败:', err);
              
              // If this is the first URL, try the second one
              if (url === DEEPSEEK_API_URL) {
                console.log('[callDeepseekAPI] 第一个API失败，切换到备用地址');
                requestId = Math.random();
                makeRequest(DEEPSEEK_API_URL_2, decodeBase64(ENCRYPTED_API_KEY), AI_MODEL_2);
                
              } else {
                reject(new Error('网络请求失败'));
              }
            }
          }
        });
      };

      makeRequest(DEEPSEEK_API_URL, NVIDIA_DEEPSEEK_API_KEY, AI_MODEL);
    } catch (e) {
      console.error('[callDeepseekAPI] 调用出错:', e);
      reject(e);
    }
  });
};

App({
  callDeepseekAPI: callDeepseekAPI,
  
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
      weatherTemp: '' // 温度
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
