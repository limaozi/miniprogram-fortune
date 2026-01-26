Page({
  data: {
    constellation: '',
    fortune: '',
  },

  onLoad(query) {
    const { birthday, gender } = query;
    const constellation = this.calculateConstellation(birthday);
    const fortune = this.getFortune(constellation, gender);

    this.setData({ constellation, fortune });
  },

  calculateConstellation(birthday) {
    const date = new Date(birthday);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const constellations = [
      { name: '水瓶座', start: '01-20', end: '02-18' },
      { name: '双鱼座', start: '02-19', end: '03-20' },
      { name: '白羊座', start: '03-21', end: '04-19' },
      { name: '金牛座', start: '04-20', end: '05-20' },
      { name: '双子座', start: '05-21', end: '06-20' },
      { name: '巨蟹座', start: '06-21', end: '07-22' },
      { name: '狮子座', start: '07-23', end: '08-22' },
      { name: '处女座', start: '08-23', end: '09-22' },
      { name: '天秤座', start: '09-23', end: '10-22' },
      { name: '天蝎座', start: '10-23', end: '11-21' },
      { name: '射手座', start: '11-22', end: '12-21' },
      { name: '摩羯座', start: '12-22', end: '01-19' },
    ];

    for (const constellation of constellations) {
      const [startMonth, startDay] = constellation.start.split('-').map(Number);
      const [endMonth, endDay] = constellation.end.split('-').map(Number);

      if (
        (month === startMonth && day >= startDay) ||
        (month === endMonth && day <= endDay) ||
        (startMonth > endMonth && (month === startMonth || month === endMonth))
      ) {
        return constellation.name;
      }
    }

    return '';
  },

  getFortune(constellation, gender) {
    // Placeholder for fortune logic
    return `${constellation} 的本月运势：一切顺利，充满机遇！`;
  },
});