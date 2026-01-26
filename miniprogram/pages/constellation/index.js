// DeepSeek API 配置
const NVIDIA_DEEPSEEK_API_KEY = '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';
const DEEPSEEK_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

Page({
  data: {
    years: Array.from({ length: 100 }, (_, i) => `${2025 - i}`),
    months: Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, '0')}`),
    days: Array.from({ length: 31 }, (_, i) => `${String(i + 1).padStart(2, '0')}`),
    selectedYear: '',
    selectedMonth: '',
    selectedDay: '',
    selectedGender: '',
    loading: false,
    showResult: false,
    results: [],
    currentResultIndex: 0,
  },

  onYearChange(e) {
    this.setData({ selectedYear: this.data.years[e.detail.value] });
  },

  onMonthChange(e) {
    this.setData({ selectedMonth: this.data.months[e.detail.value] });
  },

  onDayChange(e) {
    this.setData({ selectedDay: this.data.days[e.detail.value] });
  },

  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({ selectedGender: gender });
  },
// 调用DeepSeek API
callDeepseekAPI(prompt) {
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
            model: 'deepseek-ai/deepseek-r1',
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
  },
  onSubmit() {
    const { selectedYear, selectedMonth, selectedDay, selectedGender } = this.data;
    if (!selectedYear || !selectedMonth || !selectedDay || !selectedGender) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
      });
      return;
    }

    this.setData({ loading: true, showResult: true });

    // Call DeepSeek API to generate constellation results
    const prompt = `根据出生日期 ${selectedYear}年${selectedMonth}月${selectedDay}日 和性别${selectedGender === 'male' ? '男' : '女'}，生成详细的星座运势分析。请包含以下内容:
1. 星座名称和性格特征
2. 本月整体运势
3. 爱情运势
4. 事业运势  
5. 健康运势
6. 财运运势
7. 幸运数字和颜色

请用中文详细回答，每个部分用换行符分开。`;
this.callDeepseekAPI(prompt)
.then(response => {
  try {
    // 尝试解析JSON
    let result = null;
    
    // 尝试从响应中提取JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    }

    this.setData({
      showResult: true,
      result: result.description,
      isLoading: false,
      resultPage: 0 // 默认显示回顾页面
    }, () => {
      // 更新scroll-view高度
      this.updateReviewScrollHeight();
    });
  } catch (error) {
    console.error('解析结果失败:', error);
  }});
  },

  generateMockResults(year, month, day, gender) {
    const constellations = {
      '01': '摩羯座',
      '02': '水瓶座',
      '03': '双鱼座',
      '04': '白羊座',
      '05': '金牛座',
      '06': '双子座',
      '07': '巨蟹座',
      '08': '狮子座',
      '09': '处女座',
      '10': '天秤座',
      '11': '天蝎座',
      '12': '射手座',
    };

    const constellation = constellations[month] || '未知星座';
    const genderText = gender === 'male' ? '男性' : '女性';

    const mockResults = [
      `【${constellation}${genderText}】\n\n出生日期：${year}年${month}月${day}日\n\n${constellation}是一个充满魅力和智慧的星座。${genderText}${constellation}通常具有独特的个性和强大的内心世界。`,
      `【本月整体运势】\n\n这个月对你来说是充满机遇的一个月。你的能量达到了一个新的高度，适合进行新的尝试和突破。保持积极的心态，好运自然会降临。`,
      `【爱情运势】\n\n感情方面，单身的你可能会有新的邂逅。有伴侣的你则会感受到爱情的温暖。不妨主动表达你的感受，增进彼此的理解。`,
      `【事业运势】\n\n工作上展现你的才华和能力。这是一个很好的时机来推进你的项目或者寻求晋升。相信自己的实力，不要错过任何机会。`,
      `【健康运势】\n\n保持规律的作息和适度的运动。身体状况基本良好，但要注意不要过度疲劳。多喝水，多呼吸新鲜空气。`,
      `【财运运势】\n\n财运呈现上升趋势。可能会有意外的收入或者理财的机遇。但要谨慎投资，不要被诱惑冲昏头脑。`,
    ];

    this.setData({
      results: mockResults,
      loading: false,
    });
  },

  showErrorAndReset(message) {
    wx.showToast({
      title: message,
      icon: 'none',
    });
    this.setData({
      loading: false,
      showResult: false,
    });
  },

  goBack() {
    this.setData({
      showResult: false,
      results: [],
      selectedYear: '',
      selectedMonth: '',
      selectedDay: '',
      selectedGender: '',
    });
  },

  onLoad() {
    // Page load logic
  },
});