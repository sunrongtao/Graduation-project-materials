// app.js
App({
  onLaunch() {
    // 
    wx.removeStorageSync('serverUrl'); 
    console.log('Current IP address:', this.globalData.apiBaseUrl);
  },
  
  globalData: {
    apiBaseUrl: 'http://192.168.20.17:3000',
    
    // device information
    deviceId: 'test1',
    productId: 'gfD401PLDu',
    
    // interval refresh
    refreshInterval: 5000
  },

  // ==================================
  request(options) {
    return new Promise((resolve, reject) => {
      const url = options.url.startsWith('http') 
        ? options.url 
        : this.globalData.apiBaseUrl + options.url;
      
      wx.request({
        url: url,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'Content-Type': 'application/json',
          ...options.header
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            console.error(`❌ Request interface error: HTTP ${res.statusCode} | 路径: ${url}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        },
        fail: (err) => {
          console.error(`❌ Request failed: ${url}`, err);
          reject(err);
        }
      });
    });
  },

  // ================= 接口：下发控制指令 =================
  controlDevice(command, value) {
    return this.request({
      url: '/api/control',
      method: 'POST',
      data: {
        command: command,
        value: value
      }
    });
  },

  // ================= 接口：获取最新数据 =================
  getLatestData() {
    return this.request({ 
      url: '/api/data/latest' 
    });
  },

  // ================= 接口：获取历史传感器数据 =================
  getHistoryData(limit = 100, offset = 0) {
    return this.request({ 
      url: `/api/data/history?limit=${limit}&offset=${offset}` 
    });
  },

  // ================= 接口：获取综合统计 =================
  getStats(hours = 24) {
    return this.request({ 
      url: `/api/stats?hours=${hours}` 
    });
  },

  // ================= 接口：获取小时能耗 =================
  getHourlyEnergy(hours = 24) {
    return this.request({ 
      url: `/api/energy/hourly?hours=${hours}` 
    });
  },

  // ================= 接口：获取日度能耗 =================
  getDailyEnergy(days = 7) {
    return this.request({ 
      url: `/api/energy/daily?days=${days}` 
    });
  }
});




