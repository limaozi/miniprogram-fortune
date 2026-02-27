// home.js - 入口页面
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

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
    const global = app && app.globalData ? app.globalData : {};
    let { currentDateStr, currentSeasonZh } = global;

    // 兜底：如果全局数据不存在，则本地再计算一次
    if (!currentDateStr || !currentSeasonZh) {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (month === 3 || month === 4 || month === 5) {
        currentSeasonZh = '春季';
      } else if (month === 6 || month === 7 || month === 8) {
        currentSeasonZh = '夏季';
      } else if (month === 9 || month === 10 || month === 11) {
        currentSeasonZh = '秋季';
      } else {
        currentSeasonZh = '冬季';
      }
    }

    this.setData({
      currentDateStr,
      currentSeasonZh
    });

    this.fetchWeatherByLocation();
  },

  fetchWeatherByLocation() {
    this.setData({ weatherLoading: true, weatherError: false, cityName: '' });
    wx.getLocation({
      type: 'wgs84',
      success: (res) => {
        this.fetchCityAndWeather(res.latitude, res.longitude);
      },
      fail: (err) => {
        console.warn('获取位置失败，使用默认坐标', err);
        this.fetchCityAndWeather(39.9042, 116.4074);
      }
    });
  },

  // 从 Nominatim 逆地理结果中取城市名（优先 city > town > village > county > state）
  pickCityName(address) {
    if (!address || typeof address !== 'object') return '';
    return address.city || address.town || address.village || address.municipality || address.county || address.state || '';
  },

  fetchCityAndWeather(latitude, longitude) {
    const that = this;
    const reverseUrl = `${NOMINATIM_REVERSE}?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
    wx.request({
      url: reverseUrl,
      method: 'GET',
      header: { 'User-Agent': 'MiniProgramFortune/1.0' },
      success(res) {
        console.log(res);
        const cityName = res.statusCode === 200 && res.data ? that.pickCityName(res.data.address) : '';
        console.log('The city name is ', cityName);
        that.setData({ cityName });
        that.callOpenMeteo(latitude, longitude);
      },
      fail() {
        that.setData({ cityName: '' });
        that.callOpenMeteo(latitude, longitude);
      }
    });
  },

  callOpenMeteo(latitude, longitude) {
    const url = `${OPEN_METEO_BASE}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code`;
    wx.request({
      url,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.current) {
          const cur = res.data.current;
          const temp = cur.temperature_2m != null ? Math.round(cur.temperature_2m) + '°C' : '';
          const text = weatherCodeToText(cur.weather_code);
          this.setData({
            weatherText: text,
            weatherTemp: temp,
            weatherLoading: false,
            weatherError: false
          });
        } else {
          this.setData({ weatherLoading: false, weatherError: true });
        }
      },
      fail: () => {
        this.setData({ weatherLoading: false, weatherError: true });
      }
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
