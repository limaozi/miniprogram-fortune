Page({
  data: {
    selectedDate: '',
    currentDate: '',
    selectedYear: '',
    selectedMonth: '',
    selectedDay: '',
    selectedGender: '',
    loading: false,
    showResult: false,
    results: [],
    currentResultIndex: 0,
  },

  onLoad() {
    // Set current date as the end date for picker
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.setData({ 
      currentDate: `${year}-${month}-${day}`,
      selectedDate: ''
    });
  },

  onDateChange(e) {
    const date = e.detail.value;
    const [year, month, day] = date.split('-');
    this.setData({ 
      selectedDate: date,
      selectedYear: year,
      selectedMonth: month,
      selectedDay: day
    });
  },

  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({ selectedGender: gender });
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
    const prompt = `Use the brithday ${selectedYear}-${selectedMonth}-${selectedDay} and gender ${selectedGender === 'male' ? 'male' : 'female'}，determine the type of constellation in both Chinese and Latin, seperated by a dash, and generate an encouraging explanation of 200-300 words, describing the characteristics and strengths of this personality type in a warm, positive, and encouraging tone. The type constellation should be in both Chinese and Latin, but the description must be written in Chinese. Only return the JSON object, no other text.`;
    prompt 
    console.log(prompt);
    const app = getApp();
    app.callDeepseekAPI(prompt)
      .then(response => {
        try {
          // 尝试解析JSON
          let result = null;
          
          // 尝试从响应中提取JSON
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          }
          console.log('the result explanation is: ', result)
          this.setData({
            showResult: true,
            con_type: result.type,
            con_result: result.explanation,
            isLoading: false,
            resultPage: 0 // 默认显示回顾页面
          }, () => {
            // 更新scroll-view高度
            this.updateResultScrollHeight();
          });
        } catch (error) {
          console.error('解析结果失败:', error);
        }
      })
      .catch(error => {
        console.error('API调用失败:', error);
        this.showErrorAndReset('生成星座分析失败，请重试');
      });
  },
// 计算并设置回顾页面scroll-view的高度
updateReviewScrollHeight() {
    const sys = wx.getSystemInfoSync();
    const windowHeight = sys.windowHeight || 667;
    const rpxRatio = 750 / sys.windowWidth;
    // 计算可用高度：窗口高度 - 头部高度(约 150rpx) - 顶部padding(40rpx) - 底部padding(40rpx) - header margin-bottom(30rpx)
    const headerHeight = 150; // header本身高度
    const topPadding = 40;
    const bottomPadding = 40;
    const headerMarginBottom = 30;
    const scrollViewHeightRpx = (windowHeight * rpxRatio) - headerHeight - topPadding - bottomPadding - headerMarginBottom;
    
    this.setData({
      reviewScrollHeight: Math.max(400, scrollViewHeightRpx)
    });
    
    console.log('[updateReviewScrollHeight] 设置 scroll-view 高度:', {
      windowHeight,
      rpxRatio,
      scrollViewHeightRpx: this.data.reviewScrollHeight
    });
  },
  
  // 计算并设置结果页面scroll-view的高度
  updateResultScrollHeight() {
    const sys = wx.getSystemInfoSync();
    const windowHeight = sys.windowHeight || 667;
    const rpxRatio = 750 / sys.windowWidth;
    // 计算可用高度：窗口高度 - 头部高度(约 150rpx) - 顶部padding(40rpx) - 底部padding(40rpx) - header margin-bottom(30rpx) - 按钮区域(约 240rpx) - 按钮margin-bottom(20rpx)
    const headerHeight = 150;
    const topPadding = 40;
    const bottomPadding = 40;
    const headerMarginBottom = 30;
    const buttonArea = 240;
    const buttonMarginBottom = 20;
    const scrollViewHeightRpx = (windowHeight * rpxRatio) - headerHeight - topPadding - bottomPadding - headerMarginBottom - buttonArea - buttonMarginBottom;
    
    this.setData({
      resultScrollHeight: Math.max(400, scrollViewHeightRpx)
    });
    
    console.log('[updateResultScrollHeight] 设置 scroll-view 高度:', {
      windowHeight,
      rpxRatio,
      scrollViewHeightRpx: this.data.resultScrollHeight
    });
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
});