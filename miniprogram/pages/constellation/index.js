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

// 星座数据：包含日期范围和特性描述
const CONSTELLATION_DATA = {
  '白羊座': {
    latin: 'Aries',
    dateRange: '3月21日-4月19日',
    traits: '勇敢、热情、积极进取、富有冒险精神',
    description: '♈️ 白羊座的你，性格开朗热情，充满了朝气和冒险精神。你总是第一个冲上阵地的勇士，勇敢地追求自己的梦想。你的热情感染着周围的人，让人们因你而精力充沛。虽然有时候你会显得有点急躁，但这恰恰体现了你对生活的热爱。相信你的勇气和决心，会让你在人生的舞台上闪闪发光！💪✨'
  },
  '金牛座': {
    latin: 'Taurus',
    dateRange: '4月20日-5月20日',
    traits: '稳定、踏实、有耐心、可靠',
    description: '♉️ 金牛座的你，是一个踏实可靠的人。你有着坚定的意志和持久的耐心，无论遇到什么困难都能坚持不懈。你对生活充满热爱，懂得享受生活中的美好时光。你的稳定性和忠诚度让你成为朋友们最信赖的人。继续保持你的耐心和坚持，成功一定会眷顾你！🌟💚'
  },
  '双子座': {
    latin: 'Gemini',
    dateRange: '5月21日-6月20日',
    traits: '聪慧、灵活、表达能力强、好奇心旺盛',
    description: '♊️ 双子座的你，聪慧机灵，充满好奇心。你的思维灵活，反应敏捷，总能看到别人看不到的角度。你善于沟通和表达，能够轻松地与各种人相处。你的多才多艺让你在各个领域都能大放异彩。相信你的聪慧和灵活，会让你创造出属于自己的精彩人生！🧠✨'
  },
  '巨蟹座': {
    latin: 'Cancer',
    dateRange: '6月21日-7月22日',
    traits: '温柔、体贴、情感丰富、家庭意识强',
    description: '♋️ 巨蟹座的你，温柔善良，拥有一颗柔软的心。你非常在乎身边人的感受，是个体贴入微的朋友。你对家庭和感情的重视让你成为了一个值得依靠的人。你的情感深度和同理心是你最大的财富。坚持这份温柔和关怀，会让你的生活充满爱与温暖！❤️🏠'
  },
  '狮子座': {
    latin: 'Leo',
    dateRange: '7月23日-8月22日',
    traits: '自信、大气、领导力强、热心',
    description: '♌️ 狮子座的你，自信满满，充满王者气场。你天生具有领导才能，总能吸引众人的目光。你大气豁达，热情似火，能够激励和鼓舞身边的每一个人。你对生活充满热爱和期待，无论面对什么挑战都能挺起胸膛。相信你的自信和热情，会让你成为众人瞩目的焦点！👑🔥'
  },
  '处女座': {
    latin: 'Virgo',
    dateRange: '8月23日-9月22日',
    traits: '认真、细心、有条理、追求完美',
    description: '♍️ 处女座的你，做事认真细致，有着超人的洞察力。你追求完美，对自己和工作都有很高的要求，这让你成为了一个非常出色的人。你的条理性和责任感让你总是能够把事情处理得井井有条。你的努力和坚持一定会得到回报。相信你的专业和用心，会让你在各个领域都闪闪发光！✨🎯'
  },
  '天秤座': {
    latin: 'Libra',
    dateRange: '9月23日-10月22日',
    traits: '优雅、公正、有品味、社交能力强',
    description: '♎️ 天秤座的你，优雅得体，充满品味。你公正理性，总能看到事情的两面，做出明智的判断。你热爱和谐，是天生的外交官，能够轻松融入各种社交场合。你对美的追求和对平衡的渴望让你成为了一个很有魅力的人。继续发挥你的优雅和外交能力，让生活充满美好！💫✨'
  },
  '天蝎座': {
    latin: 'Scorpio',
    dateRange: '10月23日-11月21日',
    traits: '神秘、深沉、意志坚定、有洞察力',
    description: '♏️ 天蝎座的你，神秘而深沉，拥有超强的直觉和洞察力。你意志坚定，一旦确定目标就会全力以赴。你的专注和执着让你能够完成别人无法完成的事情。你很少表露自己，但内心充满了热情和力量。相信你的毅力和智慧，会让你创造出属于自己的传奇！💎🔥'
  },
  '射手座': {
    latin: 'Sagittarius',
    dateRange: '11月22日-12月21日',
    traits: '乐观、热爱冒险、开放、有远见',
    description: '♐️ 射手座的你，乐观向上，热爱冒险。你充满了对未来的憧憬和期待，总是充满能量去探索这个世界。你坦诚坦白，待人真诚，是个很好相处的人。你的远见卓识和积极心态能够感染身边的每一个人。继续保持你的热情和乐观，会让你的人生之路充满阳光！🌞🎯'
  },
  '摩羯座': {
    latin: 'Capricorn',
    dateRange: '12月22日-1月19日',
    traits: '务实、坚持、有耐心、目标明确',
    description: '♑️ 摩羯座的你，务实稳重，目标清晰。你有着强大的执行力和持久的耐心，一步一个脚印地走向成功。你不善言辞，但你的行动胜过千言万语。你对生活和工作的态度让你成为了一个值得信赖的人。相信你的坚持和努力，梦想一定会在不远的将来实现！🏔️💪'
  },
  '水瓶座': {
    latin: 'Aquarius',
    dateRange: '1月20日-2月18日',
    traits: '创新、独立、理性、友好',
    description: '♒️ 水瓶座的你，富有创新精神，独立自主。你用理性和创意看待世界，总能想到别人想不到的主意。你珍视友谊和自由，是个很好的朋友和同伴。你的与众不同让你成为了人群中的亮点。相信你的独特和创新，会让你开创属于自己的美好未来！🚀💡'
  },
  '双鱼座': {
    latin: 'Pisces',
    dateRange: '2月19日-3月20日',
    traits: '梦幻、温情、想象力丰富、有同情心',
    description: '♓️ 双鱼座的你，温柔梦幻，充满想象力。你敏感细腻，能够感受到别人的情感，是个很有同情心的人。你的艺术天赋和创意能力让你在各个领域都能展现不凡。你相信爱和美好，这份信念让你的生活充满诗意。继续保持你的温柔和善良，让世界因你而更加美好！🌙💜'
  }
};

// 根据月日计算星座
function calculateConstellation(month, day) {
  month = parseInt(month);
  day = parseInt(day);
  
  const constellations = [
    { name: '摩羯座', start: [12, 22], end: [1, 19] },
    { name: '水瓶座', start: [1, 20], end: [2, 18] },
    { name: '双鱼座', start: [2, 19], end: [3, 20] },
    { name: '白羊座', start: [3, 21], end: [4, 19] },
    { name: '金牛座', start: [4, 20], end: [5, 20] },
    { name: '双子座', start: [5, 21], end: [6, 20] },
    { name: '巨蟹座', start: [6, 21], end: [7, 22] },
    { name: '狮子座', start: [7, 23], end: [8, 22] },
    { name: '处女座', start: [8, 23], end: [9, 22] },
    { name: '天秤座', start: [9, 23], end: [10, 22] },
    { name: '天蝎座', start: [10, 23], end: [11, 21] },
    { name: '射手座', start: [11, 22], end: [12, 21] }
  ];
  
  for (let constellation of constellations) {
    const [startMonth, startDay] = constellation.start;
    const [endMonth, endDay] = constellation.end;
    
    // 处理跨越年份的星座（摩羯座）
    if (startMonth > endMonth) {
      if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
        return constellation.name;
      }
    } else {
      if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
        return constellation.name;
      }
    }
  }
  
  return '白羊座'; // 默认值
}

// 生成默认的星座分析结果（当API失败时）
function generateDefaultConstellationResult(month, day, gender) {
  const constellationName = calculateConstellation(month, day);
  const data = CONSTELLATION_DATA[constellationName];
  
  if (!data) {
    return null;
  }
  
  const result = {
    type: `${constellationName} - ${data.latin}`,
    description: data.description
  };
  
  return result;
}

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
    const prompt = `Based on the birthday ${selectedYear}-${selectedMonth}-${selectedDay} and gender ${selectedGender === 'male' ? 'male' : 'female'}, determine the constellation type in both Chinese and Latin (separated by a dash), and generate an encouraging explanation of 200-300 words, describing the characteristics and strengths of this constellation in a warm, positive, and encouraging tone. The description should have a few paragraph, emoji, bullet points, and so on to make it more like response from human-being.

Return format should be a JSON object:
{
  "type": "constellation type in Chinese and constellation type in Latin, separated by a dash  (e.g., 白羊座 - Aries)",
  "description": "encouraging explanation text"
}

IMPORTANT: The type should include both Chinese and Latin names separated by a dash, the description must be written in Chinese. Only return the JSON object, no other text.`;
    
    const app = getApp();
    
    // 设置请求超时（30秒）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('网络请求失败'));
      }, 30000);
    });
    
    Promise.race([
      app.callDeepseekAPI(prompt),
      timeoutPromise
    ])
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
          // 使用默认计算的星座信息
          this.useDefaultConstellationResult();
        }
      })
      .catch(error => {
        console.error('API调用失败:', error);
        // 使用默认计算的星座信息
        this.useDefaultConstellationResult();
      });
  },
  
  // 使用默认星座计算结果（API失败时）
  useDefaultConstellationResult() {
    const { selectedMonth, selectedDay, selectedGender } = this.data;
    const result = generateDefaultConstellationResult(selectedMonth, selectedDay, selectedGender);
    
    if (result) {
      console.log('使用默认星座结果:', result);
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
    } else {
      this.showErrorAndReset('网络请求失败');
    }
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