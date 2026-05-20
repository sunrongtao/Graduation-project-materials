// pages/settings/settings.js

Page({
  data: {
    deviceInfo: {
      deviceId: 'test1',
      productId: 'gfD401PLDu',
      online: true
    },
    alarmSettings: {
      tempAlarm: true,
      humAlarm: true,
      waterAlarm: true
    },
    thresholds: {
      maxTemp: 35,
      maxHum: 80,
      targetHum: 50
    },
    serverUrl: ''
  },

  onLoad() {
    this.loadSettings();
  },

  // 加载保存的设置
  loadSettings() {
    const app = getApp();
    
    // 加载服务器地址
    const savedUrl = wx.getStorageSync('serverUrl') || app.globalData.apiBaseUrl;
    
    // 加载报警设置
    const alarmSettings = wx.getStorageSync('alarmSettings') || this.data.alarmSettings;
    
    // 加载阈值设置
    const thresholds = wx.getStorageSync('thresholds') || this.data.thresholds;
    
    this.setData({
      serverUrl: savedUrl,
      alarmSettings: alarmSettings,
      thresholds: thresholds
    });
    
    // 检查设备在线状态
    this.checkDeviceStatus();
  },

  // 检查设备状态
  checkDeviceStatus() {
    const app = getApp();
    const baseUrl = app.globalData.apiBaseUrl;
    
    wx.request({
      url: `${baseUrl}/api/device/status`,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.success) {
          this.setData({
            'deviceInfo.online': true
          });
        }
      },
      fail: () => {
        this.setData({
          'deviceInfo.online': false
        });
      }
    });
  },

  // 切换温度报警
  toggleTempAlarm(e) {
    const value = e.detail.value;
    this.setData({
      'alarmSettings.tempAlarm': value
    });
    this.saveAlarmSettings();
  },

  // 切换湿度报警
  toggleHumAlarm(e) {
    const value = e.detail.value;
    this.setData({
      'alarmSettings.humAlarm': value
    });
    this.saveAlarmSettings();
  },

  // 切换水箱报警
  toggleWaterAlarm(e) {
    const value = e.detail.value;
    this.setData({
      'alarmSettings.waterAlarm': value
    });
    this.saveAlarmSettings();
  },

  // 保存报警设置
  saveAlarmSettings() {
    wx.setStorageSync('alarmSettings', this.data.alarmSettings);
    wx.showToast({
      title: '设置已保存',
      icon: 'success',
      duration: 1000
    });
  },

  // 增加温度阈值
  increaseTemp() {
    if (this.data.thresholds.maxTemp < 50) {
      this.setData({
        'thresholds.maxTemp': this.data.thresholds.maxTemp + 1
      });
      this.saveThresholds();
    }
  },

  // 减少温度阈值
  decreaseTemp() {
    if (this.data.thresholds.maxTemp > 20) {
      this.setData({
        'thresholds.maxTemp': this.data.thresholds.maxTemp - 1
      });
      this.saveThresholds();
    }
  },

  // 增加湿度阈值
  increaseHum() {
    if (this.data.thresholds.maxHum < 95) {
      this.setData({
        'thresholds.maxHum': this.data.thresholds.maxHum + 5
      });
      this.saveThresholds();
    }
  },

  // 减少湿度阈值
  decreaseHum() {
    if (this.data.thresholds.maxHum > 50) {
      this.setData({
        'thresholds.maxHum': this.data.thresholds.maxHum - 5
      });
      this.saveThresholds();
    }
  },

  // 增加目标湿度
  increaseTargetHum() {
    if (this.data.thresholds.targetHum < 70) {
      this.setData({
        'thresholds.targetHum': this.data.thresholds.targetHum + 5
      });
      this.saveThresholds();
    }
  },

  // 减少目标湿度
  decreaseTargetHum() {
    if (this.data.thresholds.targetHum > 30) {
      this.setData({
        'thresholds.targetHum': this.data.thresholds.targetHum - 5
      });
      this.saveThresholds();
    }
  },

  // 保存阈值设置
  saveThresholds() {
    wx.setStorageSync('thresholds', this.data.thresholds);
  },

  // 服务器地址输入
  onServerUrlInput(e) {
    this.setData({
      serverUrl: e.detail.value
    });
  },

  // 保存服务器地址
  saveServerUrl() {
    const url = this.data.serverUrl.trim();
    if (!url) {
      wx.showToast({
        title: '请输入地址',
        icon: 'none'
      });
      return;
    }

    // 保存到本地存储
    wx.setStorageSync('serverUrl', url);
    
    // 更新全局变量
    const app = getApp();
    app.globalData.apiBaseUrl = url;

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });

    // 验证连接
    this.checkDeviceStatus();
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({
            title: '缓存已清除',
            icon: 'success'
          });
          
          // 重新加载默认设置
          this.setData({
            alarmSettings: {
              tempAlarm: true,
              humAlarm: true,
              waterAlarm: true
            },
            thresholds: {
              maxTemp: 35,
              maxHum: 80,
              targetHum: 50
            }
          });
        }
      }
    });
  }
});
