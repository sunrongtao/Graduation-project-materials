// pages/energy/energy.js
import * as echarts from '../../ec-canvas/echarts';

let chart = null;

// 初始化图表
function initChart(canvas, width, height, dpr) {
  chart = echarts.init(canvas, null, {
    width: width,
    height: height,
    devicePixelRatio: dpr
  });
  canvas.setChart(chart);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}\n{c} kWh ({d}%)'
    },
    legend: {
      bottom: '0',
      left: 'center',
      textStyle: { color: 'rgba(255, 255, 255, 0.7)' }
    },
    series: [
      {
        name: '耗电占比',
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#1a1a2e',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold',
            color: '#fff'
          }
        },
        labelLine: { show: false },
        data: [] // 数据将在后续加载
      }
    ]
  };

  chart.setOption(option);
  return chart;
}

Page({
  data: {
    timeRange: '7d',
    latestData: {},
    energySummary: {
      today: '0.0000',
      week: '0.0000',
      month: '0.0000'
    },
    dailyEnergy: [],
    ec: {
      onInit: initChart
    }
  },

  onLoad() {
    this.fetchData();
  },

  onShow() {
    this.fetchData();
  },

  // 选择时间范围
  selectTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    this.setData({ timeRange: range });
    this.fetchDailyEnergy();
    this.fetchModeEnergy(); // 切换时间时，顺便更新饼图
  },

  // 获取所有数据
  fetchData() {
    this.fetchLatestData();
    this.fetchDailyEnergy();
    this.fetchModeEnergy(); // 新增：获取模式对比数据
  },

  // 获取最新数据
  fetchLatestData() {
    const app = getApp();
    const baseUrl = app.globalData.apiBaseUrl;

    wx.request({
      url: `${baseUrl}/api/data/latest`,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.success && res.data.data) {
          const data = res.data.data;
          this.setData({
            latestData: {
              voltage: data.voltage ? parseFloat(data.voltage).toFixed(1) : '--',
              current: data.current ? parseFloat(data.current).toFixed(3) : '--',
              power: data.power ? parseFloat(data.power).toFixed(1) : '--',
              energy: data.energy ? parseFloat(data.energy).toFixed(4) : '--'
            }
          });
        }
      },
      fail: (err) => {
        console.error('获取最新数据失败:', err);
      }
    });
  },



  // 获取每日能耗（同时计算汇总）
  fetchDailyEnergy() {
  
    const app = getApp();
    const baseUrl = app.globalData.apiBaseUrl;

    // 始终请求30天数据，用来覆盖所有汇总计算
    wx.request({
      url: `${baseUrl}/api/energy/daily`,
      method: 'GET',
      data: { days: 30 },
      success: (res) => {
        if (res.data && res.data.success && res.data.data) {
          const allData = res.data.data;

          // ---- 计算汇总 ----
          const today = new Date();
          const todayStr = today.toISOString().slice(0, 10);

          // 本周起始（周一）
          const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - dayOfWeek);
          weekStart.setHours(0, 0, 0, 0);

          let todayEnergy = 0, weekEnergy = 0, monthEnergy = 0;
          const thisYear = today.getFullYear();
          const thisMonth = today.getMonth();

          allData.forEach(item => {
            const d = new Date(item.date);
            const val = item.energyUsed || 0;
            monthEnergy += val;
            if (d >= weekStart) weekEnergy += val;
            if (item.date.slice(0, 10) === todayStr) todayEnergy = val;
          });

          this.setData({
            energySummary: {
              today: todayEnergy.toFixed(4),
              week: weekEnergy.toFixed(4),
              month: monthEnergy.toFixed(4)
            }
          });

          // ---- 按 timeRange 过滤展示的每日列表 ----
          let days = 7;
          if (this.data.timeRange === '24h') days = 1;
          else if (this.data.timeRange === '30d') days = 30;
          const slicedData = allData.slice(-days);

          const maxEnergy = Math.max(...slicedData.map(d => d.energyUsed || 0), 0.001);
          const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

          const dailyEnergy = slicedData.map(item => {
            const date = new Date(item.date);
            return {
              date: item.date,
              dateStr: `${date.getMonth() + 1}/${date.getDate()}`,
              weekday: weekdays[date.getDay()],
              energyUsed: item.energyUsed ? item.energyUsed.toFixed(4) : '0.0000',
              percentage: Math.round((item.energyUsed / maxEnergy) * 100) || 5
            };
          });

          this.setData({ dailyEnergy });
        }
      },
      fail: (err) => {
        console.error('获取每日能耗失败:', err);
      }
    });
  },

  // ★★★ 新增：获取模式能耗对比数据 ★★★
  fetchModeEnergy() {
    // 这里未来可以接入真实的后端 API，例如 /api/energy/mode
    // 假设后端返回的数据格式包含每种模式的总耗电量
    
    setTimeout(() => {
      if (chart) {
        chart.setOption({
          series: [{
            data: [
              { value: 1.2, name: '智能模式', itemStyle: { color: '#4ecdc4' } },  // 绿色
              { value: 4.5, name: '普通模式', itemStyle: { color: '#ff6b6b' } },  // 红色
              { value: 0.8, name: '睡眠模式', itemStyle: { color: '#667eea' } }   // 蓝色
            ]
          }]
        });
      }
    }, 500);
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.fetchData();
    wx.stopPullDownRefresh();
  }
});