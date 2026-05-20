// pages/index/index.js
const API_BASE = 'http://192.168.20.17:3000'; // ← 改成你电脑的局域网 IP

Page({
  data: {
    // 传感器数据
    temperature: '--',
    humidity: '--',
    waterLevel: 0,
    voltage: '--',
    power: '--',
    energy: '--',
    current: '--',
    tempTip: '加载中...',

    // 设备控制状态
    smartMode: false,
    dehumPower: false,
    dehumIon: false,
    dehumMode: 0,
    dehumFan: 1,

    isOnline: false,
    lastUpdate: '--',

    // 模式选项
    modes: [
      { id: 0, icon: '💧', name: '标准' },
      { id: 1, icon: '🌬️', name: '强力' },
      { id: 2, icon: '😴', name: '睡眠' },
      { id: 3, icon: '👟', name: '干衣' },
    ],
    // 风速选项
    fanSpeeds: [
      { id: 0, name: '低速' },
      { id: 1, name: '中速' },
      { id: 2, name: '高速' },
      { id: 3, name: '自动' },
    ],
  },

  _pollTimer: null,

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
    // 每10秒自动轮询
    this._pollTimer = setInterval(() => this.loadData(), 10000);
  },

  onHide() {
    if (this._pollTimer) clearInterval(this._pollTimer);
  },

  onUnload() {
    if (this._pollTimer) clearInterval(this._pollTimer);
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  // ── 加载最新数据（传感器 + 控制状态合并返回）──
  async loadData() {
    try {
      const res = await this._request('GET', '/api/data/latest');
      if (!res.success || !res.data) return;

      const d = res.data;

      // 温度提示
      let tempTip = '环境舒适';
      if (d.humidity > 70) tempTip = '湿度较高，建议除湿';
      else if (d.humidity > 60) tempTip = '湿度偏高';

      this.setData({
        // 传感器
        temperature: d.temperature != null ? Number(d.temperature).toFixed(1) : '--',
        humidity: d.humidity != null ? Math.round(Number(d.humidity)) : '--',
        waterLevel: d.water_level != null ? Math.round(Number(d.water_level)) : 0,
        voltage: d.voltage != null ? Math.round(Number(d.voltage)) : '--',
        power: d.power != null ? Number(d.power).toFixed(1) : '--',
        energy: d.energy != null ? Number(d.energy).toFixed(4) : '--',
        current: d.current != null ? Number(d.current).toFixed(3) : '--',
        tempTip,
        // 控制状态（由 api.js 修复后合并进来）
        smartMode: this._toBool(d.smart_mode),
        dehumPower: this._toBool(d.dehum_power),
        dehumMode: d.dehum_mode != null ? d.dehum_mode : 0,
        dehumFan: d.dehum_fan != null ? d.dehum_fan : 1,
        dehumIon: this._toBool(d.dehum_ion),

        isOnline: true,
        lastUpdate: this._formatTime(new Date()),
      });
    } catch (e) {
      this.setData({ isOnline: false });
      console.error('loadData 失败:', e);
    }
  },

  // ── 控制方法 ──
  async onSmartModeChange(e) {
    const val = e.detail.value;
    this.setData({ smartMode: val });
    await this._sendControl('SmartMode', val);
  },

  async onPowerChange(e) {
    const val = e.detail.value;
    this.setData({ dehumPower: val, smartMode: false });
    await this._sendControl('DehumPower', val);
  },
  async onModeChange(e) {
    const val = e.detail.value;
    const id = val ? 1 : 0;   // true→模式1, false→模式0
    this.setData({ dehumMode: id, smartMode: false });
    await this._sendControl('DehumMode', id);
  },

  // 风机风速 - switch 只有 true/false，对应高速/低速
   
  async onFanChange(e) {
    const val = e.detail.value;
    const id = val ? 2 : 0;   // true→高速(2), false→低速(0)
    this.setData({ dehumFan: id, smartMode: false });
    await this._sendControl('DehumFan', id);
  },
// 负离子
  async onIonChange(e) {
    const val = e.detail.value;
    this.setData({ dehumIon: val, smartMode: false });
    await this._sendControl('DehumIon', val);
  },


  // ── 发送控制命令 ──
  async _sendControl(command, value) {
    try {
      const res = await this._request('POST', '/api/control', { command, value });
      if (!res.success) {
        wx.showToast({ title: res.message || '控制失败', icon: 'error' });
        // 回滚：重新加载数据恢复真实状态
        this.loadData();
      }
    } catch (e) {
      wx.showToast({ title: '网络异常', icon: 'error' });
      this.loadData();
    }
  },

  // ── 通用请求封装 ──
  _request(method, path, data) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: API_BASE + path,
        method,
        data,
        timeout: 8000,
        header: { 'Content-Type': 'application/json' },
        success: res => resolve(res.data),
        fail: err => reject(err),
      });
    });
  },

  // 兼容 0/1/true/false 的布尔转换
  _toBool(val) {
    return val === 1 || val === true || val === '1' || val === 'true';
  },

  _formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  },
});
