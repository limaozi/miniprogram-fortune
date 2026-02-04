// app.js
export const API_CONFIG = {
    };
export const  NVIDIA_DEEPSEEK_API_KEY = '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';
export const DEEPSEEK_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
export const  AI_MODEL = 'deepseek-ai/deepseek-r1-distill-qwen-32b';
// API Key encoded in Base64 (encrypted)


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

export const DEEPSEEK_API_URL_2 = 'https://api.deepseek.com/v1/chat/completions';
export const AI_MODEL_2 = 'deepseek-chat';

// 调用DeepSeek API
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
        }, 20000); // 20 seconds timeout

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
              hasResponded = true;
              clearTimeout(timeoutTimer);
              console.log('[callDeepseekAPI] API 响应:', res);
              if (res.statusCode === 200 && res.data) {
                const content = res.data.choices?.[0]?.message?.content || '';
                if (content) {
                  resolve(content);
                } else {
                  console.error('[callDeepseekAPI] 响应中没有内容:', res.data);
                  reject(new Error('API 返回数据格式异常'));
                }
              } else {
                console.error('[callDeepseekAPI] API 请求失败:', res.statusCode, res.data);
                reject(new Error(`API 请求失败 (状态码: ${res.statusCode})`));
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
    this.globalData = {
      // env 参数说明：
      //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
      //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
      //   如不填则使用默认环境（第一个创建的环境）
      env: "",
      lastAnalysis: '' // 存储解析内容
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
  }
});
