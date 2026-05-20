// pages/history/history.js
import * as echarts from '../../ec-canvas/echarts';

let chart = null;

function initChart(canvas, width, height, dpr) {
  chart = echarts.init(canvas, null, {
    width: width,
    height: height,
    devicePixelRatio: dpr
  });
  canvas.setChart(chart);
  chart.setOption({
    backgroundColor: 'transparent',
    xAxis: { type: 'category', data: [] },
    yAxis: { type: 'value' },
    series: []
  });
  return chart;
}

Page({
  data: {
    ec: {
      onInit: initChart
    },
    timeRange: '6h',
    currentChart: 'temp',
    historyData: [],
    stats: {
      avgTemp: '--',
      avgHum: '--',
      totalEnergy: '--'
    },
    loading: false
  },

  onLoad() {
    this.fetchHistoryData();
  },

  onShow() {
    // 每次显示页面时刷新数据
    if (this.data.historyData.length > 0) {
      this.updateChart();
    }
  },

  // 选择时间范围
  selectTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    this.setData({ timeRange: range });
    this.fetchHistoryData();
  },

  // 切换图表类型
  switchChart(e) {
    const chartType = e.currentTarget.dataset.chart;
    this.setData({ currentChart: chartType });
    this.updateChart();
  },

  // 获取历史数据
  fetchHistoryData() {
    const app = getApp();
    const baseUrl = app.globalData.apiBaseUrl;
  
    // 根据时间范围决定取多少条
    let limit = 50;
    switch (this.data.timeRange) {
      case '1h':  limit = 30;  break;
      case '6h':  limit = 100; break;
      case '24h': limit = 200; break;
      case '7d':  limit = 500; break;
    }
  
    this.setData({ loading: true });
  
    wx.request({
      url: `${baseUrl}/api/data/history`,
      method: 'GET',
      data: { limit: limit, offset: 0 },
      success: (res) => {
        if (res.data && res.data.success && res.data.data) {
          const rawData = res.data.data;
  
          const historyData = rawData.map(item => ({
            ...item,
            temperature: item.temperature != null ? Number(item.temperature) : null,
            humidity: item.humidity != null ? Number(item.humidity) : null,
            water_level: item.water_level != null ? Number(item.water_level) : null,
            power: item.power != null ? Number(item.power) : null,
            energy: item.energy != null ? Number(item.energy) : null,
            timeStr: this.formatTime(item.created_at || item.timestamp),
             _ts: item.created_at || item.timestamp  // 统一内部用的时间字段
          }));
  
          const stats = this.calculateStats(historyData);
          this.setData({ historyData, stats, loading: false });
  
          setTimeout(() => { this.updateChart(); }, 100);
        } else {
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('获取历史数据失败:', err);
        this.setData({ loading: false });
      }
    });
  },

  // 计算统计数据
  calculateStats(data) {
    if (!data || data.length === 0) {
      return { avgTemp: '--', avgHum: '--', totalEnergy: '--' };
    }

    const validTemp = data.filter(d => d.temperature != null);
    const validHum = data.filter(d => d.humidity != null);
    const validEnergy = data.filter(d => d.energy != null);

    const avgTemp = validTemp.length > 0 
      ? (validTemp.reduce((sum, d) => sum + d.temperature, 0) / validTemp.length).toFixed(1)
      : '--';

    const avgHum = validHum.length > 0
      ? (validHum.reduce((sum, d) => sum + d.humidity, 0) / validHum.length).toFixed(1)
      : '--';

    // 计算电量消耗（最后一条 - 第一条）
    let totalEnergy = '--';
    if (validEnergy.length >= 2) {
      const firstEnergy = validEnergy[validEnergy.length - 1].energy || 0;
      const lastEnergy = validEnergy[0].energy || 0;
      totalEnergy = Math.max(0, lastEnergy - firstEnergy).toFixed(4);
    }

    return { avgTemp, avgHum, totalEnergy };
  },

  // 格式化时间
  formatTime(timeStr) {
    const date = new Date(timeStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  },

  // 更新图表
  updateChart() {
    if (!chart) {
      console.warn('图表未初始化');
      return;
    }

    const data = this.data.historyData;
    if (!data || data.length === 0) {
      return;
    }

    // 数据按时间正序排列（从旧到新）
    const sortedData = [...data].reverse();
    const timeLabels = sortedData.map(d => {
      const date = new Date(d._ts);
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    });

    let option;

    switch (this.data.currentChart) {
      case 'temp':
        option = this.getTempHumOption(sortedData, timeLabels);
        break;
      case 'water':
        option = this.getWaterOption(sortedData, timeLabels);
        break;
      case 'energy':
        option = this.getEnergyOption(sortedData, timeLabels);
        break;
      default:
        option = this.getTempHumOption(sortedData, timeLabels);
    }

    chart.setOption(option);
  },

  // 温湿度图表配置
  getTempHumOption(data, timeLabels) {
    return {
      backgroundColor: 'transparent',
      grid: {
        left: '12%',
        right: '12%',
        top: '15%',
        bottom: '15%'
      },
      legend: {
        data: ['温度', '湿度'],
        top: 0,
        textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 }
      },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisLabel: { 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: 9,
          interval: Math.floor(timeLabels.length / 6)
        },
        axisTick: { show: false }
      },
      yAxis: [
        {
          type: 'value',
          name: '温度(°C)',
          nameTextStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
          axisLine: { show: false },
          axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
        },
        {
          type: 'value',
          name: '湿度(%)',
          nameTextStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
          axisLine: { show: false },
          axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9 },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: '温度',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: data.map(d => d.temperature),
          lineStyle: { color: '#ff6b6b', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255,107,107,0.3)' },
                { offset: 1, color: 'rgba(255,107,107,0)' }
              ]
            }
          }
        },
        {
          name: '湿度',
          type: 'line',
          smooth: true,
          symbol: 'none',
          yAxisIndex: 1,
          data: data.map(d => d.humidity),
          lineStyle: { color: '#4ecdc4', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(78,205,196,0.3)' },
                { offset: 1, color: 'rgba(78,205,196,0)' }
              ]
            }
          }
        }
      ]
    };
  },

  // 水位图表配置
  getWaterOption(data, timeLabels) {
    return {
      backgroundColor: 'transparent',
      grid: {
        left: '12%',
        right: '8%',
        top: '10%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisLabel: { 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: 9,
          interval: Math.floor(timeLabels.length / 6)
        },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: '水位值',
        nameTextStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      series: [{
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: data.map(d => d.water_level),
        lineStyle: { color: '#45b7d1', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(69,183,209,0.4)' },
              { offset: 1, color: 'rgba(69,183,209,0)' }
            ]
          }
        }
      }]
    };
  },

  // 电能图表配置
  getEnergyOption(data, timeLabels) {
    return {
      backgroundColor: 'transparent',
      grid: {
        left: '15%',
        right: '8%',
        top: '10%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
        axisLabel: { 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: 9,
          interval: Math.floor(timeLabels.length / 6)
        },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: '电量(kWh)',
        nameTextStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
        axisLine: { show: false },
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      series: [{
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: data.map(d => d.energy),
        lineStyle: { color: '#ffbe0b', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255,190,11,0.4)' },
              { offset: 1, color: 'rgba(255,190,11,0)' }
            ]
          }
        }
      }]
    };
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.fetchHistoryData();
    wx.stopPullDownRefresh();
  }
});
