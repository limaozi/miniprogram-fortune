// home.js - 入口页面
var QQMapWX = require('../../lib/qqmap-wx-jssdk.js');
var qqmapsdk;
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const WX_LOCATION_KEY = 'F4SBZ-SY6LJ-LHCFC-XFRW7-2CNC5-YHBYX';

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

    this.fetchLocation();
  },
  
  fetchLocation(){
    qqmapsdk = new QQMapWX({
      key: WX_LOCATION_KEY
    });
    this.setData({ weatherLoading: true, weatherError: false, cityName: '' });
    wx.getLocation({
      type: 'gcj02', // 默认为 wgs84 返回的 gps 坐标，可选 gcj02
      success: (res) => {
        // 获取成功，得到坐标
        const latitude = res.latitude
        const longitude = res.longitude

        console.log('纬度：', latitude)
        console.log('经度：', longitude)

        // 用经纬度直接查天气
        this.callOpenMeteo(latitude, longitude);

        // 第二步：调用腾讯地图SDK，将坐标解析为详细地址
        qqmapsdk.reverseGeocoder({
          location: { // 传入第一步获取的坐标
            latitude: latitude,
            longitude: longitude
          },
          success: (addressRes) => {
            // 解析成功，获取城市/区信息
            const addressComponent = addressRes.result.address_component || {};
            const city = addressComponent.city || '';
            const district = addressComponent.district || '';
            const displayName = district ? (city + district) : city;
            console.log('解析后的地址:', displayName);
            this.setData({
              cityName: displayName || ''
            });
          },
          fail: (error) => {
            console.error('地址解析失败:', error);
          }
        });
      },
      fail: (err) => {
        console.log('获取位置失败', err)
        // 获取失败，可能是用户拒绝了授权，标记为错误
        this.setData({
          weatherLoading: false,
          weatherError: true
        });
      }
    })
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
