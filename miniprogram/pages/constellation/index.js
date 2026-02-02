// Canvas相关变量
let canvas = null;
let ctx = null;
let constellationImage = null;
let constellationAtlas = null;
const constellationImagePath = '/images/constellation.png';
const constellationAtlasPath = '/images/constellation-atlas.json';

// 星座类型映射：从中文名称映射到atlas中的key
const CONSTELLATION_TYPE_MAPPING = {
  '白羊座': 'aries',
  '金牛座': 'taurus',
  '双子座': 'gemini',
  '巨蟹座': 'cancer',
  '狮子座': 'leo',
  '处女座': 'virgo',
  '天秤座': 'libra',
  '天蝎座': 'scorpio',
  '射手座': 'sagittarius',
  '摩羯座': 'capricorn',
  '水瓶座': 'aquarius',
  '双鱼座': 'pisces'
};

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
    
    // 预加载星座资源
    this.preloadConstellationResources();
  },

  // 预加载星座图片和atlas数据
  preloadConstellationResources() {
    console.log('[preloadResources] 开始加载资源');
    
    // 加载JSON
    const loadJson = () => {
      return new Promise((resolve, reject) => {
        console.log('[preloadResources] 加载JSON...');
        const fs = wx.getFileSystemManager();
        fs.readFile({
          filePath: constellationAtlasPath,
          encoding: 'utf-8',
          success: (res) => {
            try {
              const data = JSON.parse(res.data);
              console.log('[preloadResources] JSON加载成功');
              resolve(data);
            } catch (e) {
              console.error('[preloadResources] JSON解析失败:', e);
              reject(e);
            }
          },
          fail: (err) => {
            console.error('[preloadResources] JSON读取失败:', err);
            reject(err);
          }
        });
      });
    };
// 先加载JSON，然后用临时canvas加载图片
    loadJson()
      .then((atlas) => {
        constellationAtlas = atlas;
        console.log('[preloadResources] JSON加载完成，开始加载图片...');
        
        // 创建临时canvas用于加载图片
        const tempCanvas = wx.createOffscreenCanvas({ type: '2d', width: 1984, height: 496 });
        const img = tempCanvas.createImage();
        
        return new Promise((resolve, reject) => {
          img.onload = () => {
            console.log('[preloadResources] 图片加载成功:', {
              width: img.width,
              height: img.height,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight
            });
            resolve(img);
          };
          img.onerror = (err) => {
            console.error('[preloadResources] 图片加载失败:', err);
            reject(err);
          };
          console.log('[preloadResources] 设置图片src:', constellationImagePath);
          img.src = constellationImagePath;
        });
      })
      .then((img) => {
        constellationImage = img;
        console.log('[preloadResources] 资源预加载完成:', {
          atlas: !!constellationAtlas,
          image: !!constellationImage,
          imageWidth: constellationImage.width,
          imageHeight: constellationImage.height
        });
      })
      .catch(err => {
        console.error('[preloadResources] 加载失败:', err);
      });
  },

  // 初始化canvas
  initCanvas() {
    console.log('[initCanvas] 初始化canvas');
    const query = wx.createSelectorQuery();
    query.select('#constellationCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          console.warn('[initCanvas] canvas不存在，延迟重试');
          setTimeout(() => this.initCanvas(), 100);
          return;
        }
        
        const canvasNode = res[0].node;
        const systemInfo = wx.getSystemInfoSync();
        const dpr = systemInfo.pixelRatio;
        const windowWidth = systemInfo.windowWidth;
        let width = res[0].width;
        let height = res[0].height;
        
        console.log('[initCanvas] 查询结果:', {
          queryWidth: width,
          queryHeight: height,
          dpr: dpr,
          windowWidth: windowWidth,
          canvasNodeExists: !!canvasNode
        });
        
        // 如果宽高为0，说明canvas还没有被布局，使用计算值
        if (width === 0 || height === 0) {
          console.warn('[initCanvas] Canvas尺寸为0，计算转换');
          const rpxToPixel = windowWidth / 750;
          width = Math.round(300 * rpxToPixel);
          height = Math.round(300 * rpxToPixel);
          console.log('[initCanvas] 计算得到的尺寸(px):', width, 'x', height);
        }
        
        canvas = canvasNode;
        ctx = canvasNode.getContext('2d');
        
        const canvasPixelWidth = width * dpr;
        const canvasPixelHeight = height * dpr;
        console.log('[initCanvas] 准备设置canvas分辨率:', canvasPixelWidth, 'x', canvasPixelHeight);
        
        canvasNode.width = canvasPixelWidth;
        canvasNode.height = canvasPixelHeight;
        
        console.log('[initCanvas] 设置后检查:', {
          canvasNodeWidth: canvasNode.width,
          canvasNodeHeight: canvasNode.height
        });
        
        if (canvasNode.width === 0 || canvasNode.height === 0) {
          console.error('[initCanvas] WARNING: Canvas width/height仍然为0！尝试替代方案...');
          const fallbackSize = 600;
          canvasNode.width = fallbackSize;
          canvasNode.height = fallbackSize;
          console.log('[initCanvas] 使用备选值600x600');
        }
        
        ctx.scale(dpr, dpr);
        
        console.log('[initCanvas] Canvas最终状态:', {
          width: canvasNode.width,
          height: canvasNode.height,
          dpr: dpr
        });
        this.loadConstellationResources();
      });
  },

  // 加载星座图片和atlas数据
  loadConstellationResources() {
    console.log('[loadConstellationResources] 开始加载资源, canvas=', !!canvas);
    if (!canvas) {
      console.warn('[loadConstellationResources] canvas不存在，无法加载');
      return;
    }
    console.log('[loadConstellationResources] constellationType=', this.data.constellationType);
    if (this.data.constellationType) {
      if (constellationImage && constellationAtlas && canvas && ctx) {
        console.log('[loadConstellationResources] 立即绘制图片');
        this.drawConstellationImage(this.data.constellationType);
      }
    }
  },

  // 绘制星座图片
  drawConstellationImage(constellationType) {
    console.log('[drawConstellationImage] 开始绘制:', constellationType, 'canvas=', !!canvas, 'ctx=', !!ctx, 'image=', !!constellationImage, 'atlas=', !!constellationAtlas);
    if (!canvas || !ctx || !constellationImage || !constellationAtlas) {
      console.warn('[drawConstellationImage] 资源未准备好，跳过绘制');
      return;
    }
    
    // 从类型字符串中提取中文星座名
    // 格式: "白羊座 - Aries"
    const chineseConstellation = constellationType.split(' - ')[0];
    const atlasKey = CONSTELLATION_TYPE_MAPPING[chineseConstellation];
    
    const frame = constellationAtlas.frames[atlasKey];
    if (!frame) {
      console.error('[drawConstellationImage] 未找到星座类型:', atlasKey, '可用类型:', Object.keys(constellationAtlas.frames));
      return;
    }
    // 获取canvas显示尺寸（rpx转px）
    const query = wx.createSelectorQuery();
    query.select('#constellationCanvas')
      .boundingClientRect()
      .exec((res) => {
        if (!res[0]) return;
        
        const displayWidth = res[0].width;
        const displayHeight = res[0].width; // 保持正方形
        
        // 清空canvas
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        console.log("constellation image is ", constellationImage);
        console.log("frame.x is ", frame.x, " frame.y is ", frame.y, " frame.w is ", frame.w, " frame.h is ", frame.h, " displayWidth is ", displayWidth, " displayHeight is ", displayHeight);
        // 绘制图片
      ctx.drawImage(
        constellationImage,
        frame.x, frame.y, frame.w, frame.h,
        0, 0, displayWidth, displayHeight
        );
      console.log('[drawConstellationImage] 绘制完成');
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
  "type": "constellation type in Chinese and constellation type in Latin, separated by a dash  (e.g., 白羊座 - Aries)",
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
            // 初始化canvas并绘制图片
            setTimeout(() => this.initCanvas(), 100);
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