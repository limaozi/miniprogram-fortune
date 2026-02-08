// love/analysis.js - 情感咨询分析结果页面

Page({
  data: {
    answers: [],
    analysis: '',
    showAnswers: false
  },
  
  onLoad() {
    // 通过eventChannel接收数据
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('sendData', (data) => {
      console.log('收到分析数据:', data);
      this.setData({
        answers: data.answers || [],
        analysis: data.analysis || ''
      });
    });
  },
  
  // 切换显示答案
  toggleAnswers() {
    this.setData({
      showAnswers: !this.data.showAnswers
    });
  },
  
  // 返回首页
  goHome() {
    wx.redirectTo({
      url: '/pages/home/index'
    });
  }
});
