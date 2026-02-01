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
    isLoading: false,
    loadingText: "正在分析您的星座...",
    constellationType: "",
    constellationDescription: "",
    resultPage: 0, // 结果页面索引：0=回顾页，1=结果页
    reviewScrollHeight: 0, // 回顾页面scroll-view高度
    resultScrollHeight: 0 // 结果页面scroll-view高度
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
    
    // 计算scroll-view高度
    this.updateReviewScrollHeight();
    this.updateResultScrollHeight();
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

  onResultSwiperChange(e) {
    const current = e.detail.current;
    this.setData({
      resultPage: current
    });
    
    // 如果切换到回顾页面，更新scroll-view高度
    if (current === 0) {
      this.updateReviewScrollHeight();
    }
    
    // 如果切换到结果页面，更新scroll-view高度
    if (current === 1) {
      this.updateResultScrollHeight();
    }
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

    this.setData({ isLoading: true, loadingText: "正在分析您的星座..." });

    // Call DeepSeek API to generate constellation results
    const prompt = `Based on the birthday ${selectedYear}-${selectedMonth}-${selectedDay} and gender ${selectedGender === 'male' ? 'male' : 'female'}, determine the constellation type in both Chinese and Latin (separated by a dash), and generate an encouraging explanation of 200-300 words, describing the characteristics and strengths of this constellation in a warm, positive, and encouraging tone. The description should have line breaks, emoji, bullet points, and so on to make it more like response from human-being.

Return format should be a JSON object:
{
  "type": "constellation type (e.g., 白羊座 - Aries)",
  "description": "encouraging explanation text"
}

IMPORTANT: The type should include both Chinese and Latin names separated by a dash, the description must be written in Chinese. Only return the JSON object, no other text.`;
    
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
          console.log('星座分析结果:', result);
          
          // 验证结果
          if (!result || !result.type || !result.description) {
            throw new Error('结果格式不正确');
          }
          
          this.setData({
            showResult: true,
            constellationType: result.type,
            constellationDescription: result.description,
            isLoading: false,
            resultPage: 0 // 默认显示回顾页面
          }, () => {
            // 更新scroll-view高度
            this.updateReviewScrollHeight();
          });
        } catch (error) {
          console.error('解析结果失败:', error);
          this.showErrorAndReset('生成星座分析失败，请重试');
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
  
  showErrorAndReset(message) {
    wx.showToast({
      title: message,
      icon: 'none',
    });
    this.setData({
      loading: false,
      isLoading: false,
      showResult: false,
    });
  },

  // 重新测试
  restartTest() {
    // 重置状态
    this.setData({
      showResult: false,
      constellationType: "",
      constellationDescription: "",
      selectedDate: '',
      selectedYear: '',
      selectedMonth: '',
      selectedDay: '',
      selectedGender: '',
      resultPage: 0
    });
  },

  // 返回首页
  goBack() {
    wx.navigateBack();
  }
});