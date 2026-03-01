// home.js - 入口页面

Page({
  data: {
    currentDateStr: '',
    currentSeasonZh: '',
    cityName: '',
    weatherText: '',
    weatherTemp: '',
    weatherLoading: true,
    weatherError: false
  },

  onLoad() {
    console.log('入口页面加载');
    const app = getApp();
    this.updateLocationAndWeather();
    
    // 轮询检查位置和天气数据是否已准备好
    const checkDataReady = setInterval(() => {
      const hasWeatherData = app.globalData.weatherText && app.globalData.weatherTemp;
      const hasCityData = app.globalData.cityName;
      
      if (hasWeatherData && hasCityData) {
        clearInterval(checkDataReady);
        this.updateLocationAndWeather();
      }
    }, 500);
    
    // 5秒后停止轮询（防止无限轮询）
    setTimeout(() => clearInterval(checkDataReady), 5000);
  },

  onShow() {
    // 每次显示页面时更新位置和天气数据（防止长时间不看时数据过期）
    this.updateLocationAndWeather();
  },

  updateLocationAndWeather() {
    const app = getApp();
    const global = app && app.globalData ? app.globalData : {};
    const { currentDateStr, currentSeasonZh, cityName, weatherText, weatherTemp } = global;

    this.setData({
      currentDateStr,
      currentSeasonZh,
      cityName,
      weatherText,
      weatherTemp,
      weatherLoading: !(weatherText && weatherTemp && cityName),
      weatherError: false
    });
  },

  
  // 跳转到塔罗牌页面
  goToTarot() {
    wx.navigateTo({
      url: '/pages/tarot/index/index'
    });
  },
  
  // 跳转到MBTI测试页面
  goToMBTI() {
    wx.navigateTo({
      url: '/pages/mbti/index'
    });
  },
  goToConstellation() {
    wx.navigateTo({
      url: '/pages/constellation/index',
    });
  },
  goToStyle() {
    wx.navigateTo({
      url: '/pages/style/index',
    });
  },
  
  // 跳转到情感咨询页面
  goToLove() {
    wx.navigateTo({
      url: '/pages/love/index/index'
    });
  },
});
