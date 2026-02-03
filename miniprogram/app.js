// app.js
export const API_CONFIG = {
    };
  
//export const  NVIDIA_DEEPSEEK_API_KEY = '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';
export const  NVIDIA_DEEPSEEK_API_KEY = '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';
export const DEEPSEEK_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
export const  AI_MODEL = 'deepseek-ai/deepseek-r1-distill-llama-8b';
// 调用DeepSeek API
const callDeepseekAPI = (prompt, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      if (!wx || !wx.request) {
        reject(new Error('小程序环境不支持'));
        return;
      }

      wx.request({
        url: DEEPSEEK_API_URL,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${NVIDIA_DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: AI_MODEL,
          messages: [
            { role: 'system', content: prompt }
          ],
          temperature: 0.7,
          top_p: 0.8,
          max_tokens: 4096,
          stream: false
        },
        success: (res) => {
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
        },
        fail: (err) => {
          console.error('[callDeepseekAPI] 请求失败:', err);
          reject(new Error('网络请求失败'));
        }
      });
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
