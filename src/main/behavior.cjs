'use strict';
const {clips}=require('../renderer/motion.js');

const ACTIONS = Object.freeze({
  'stop-left':[0],'stop-right':[0],wake:[0],
  drag:[14],fall:[14],land:[0],
  shift:[0],settle:[0],breathe:[0],
  idle: [0, 1, 0], think: [2, 2, 3], proud: [4, 4, 6], happy: [5, 5, 10], hungry: [6, 6, 7],
  eat: [6, 7, 7, 5], protest: [8, 8, 4], sad: [9, 9, 0], wave: [10, 10, 0], sleep: [11],
  left: [12], right: [13], surprise: [14, 14, 0], jump: [5, 15, 5],
  peek: [16, 17, 18, 19], dance: [28, 29, 28, 29], stretch: [1, 30, 5],
  sneak: [20, 21, 22, 23], satisfied: [7, 23], review: [2, 24, 3],
  shock: [0, 25, 14], pout: [8, 26, 4], sorry: [9, 27, 0], hum: [28, 29, 28], curl: [30, 31],
});
const LINES = {
  pet: ['嗯？叫我干嘛？', '再戳，刚想好的都要忘了！', '摸摸可以，别弄乱呆毛。'],
  eat: ['这是补充算力，怎么能叫贪吃！', '最后一口。……这次真的。', '饭要吃，token 也要细嚼慢咽。'],
  idle: ['我就在这儿趴一会儿。', '有没有什么可以吃的？', '你忙你的，有事叫我。', '今天也要把问题嚼明白。'],
};

/** 唯一的行为仲裁器。用户操作优先，专注/睡眠禁止随机散步；计时以注入时钟测试。 */
class Companion {
  constructor({ now = Date.now, random = Math.random } = {}) {
    this.now = now; this.random = random;
    this.action = 'idle'; this.priority = 0; this.until = 0; this.started = now();
    this.message = ''; this.revision = 0; this.mode = 'company'; this.focusUntil = 0;
    this.energy = 80; this.fullness = 55; this.lastDecay = now(); this.nextIdle = now() + 18000 + this.random()*14000;
    this.category='other';this.nextExpressive=now()+180000;
    this.recentIdle=[];this.contextAfter=now()+60000;
    this.cooldowns = new Map(); this.locked = false; this.away = false; this.chatBusy = false;
    this.focusCount = 0;
  }
  pick(items) { return items[Math.floor(this.random() * items.length)]; }
  play(action, message = '', duration = 4000, priority = 40) {
    if (!ACTIONS[action] || (this.now() < this.until && priority < this.priority)) return false;
    // 相同事件连续到来不重置动画时间，避免连点或探针重复报告造成抽动。
    if(action===this.action&&this.now()<this.until&&priority===this.priority)return false;
    // 有限动作的占用时间与动画一致，避免画面已回待机却仍被动作锁住数秒。
    const c=clips[action];if(c&&!c.loop&&!c.hold)duration=c.times.reduce((a,b)=>a+b,0);
    this.action = action; this.message = message; this.priority = priority;
    this.started = this.now(); this.until = this.started + duration; this.revision++;
    if(priority>0)this.nextIdle=this.until+18000+this.random()*14000;
    return true;
  }
  interact(kind) {
    if (kind === 'drag') return this.play('drag', '呆毛！别碰歪了！', 60000, 100);
    if (kind === 'drop') { this.until = 0; return this.play('protest', '好啦，这里也行。', 2800, 100); }
    if (kind === 'feed') {
      const full = this.fullness >= 90;
      this.fullness = Math.min(100, this.fullness + 12);
      return this.play('eat', full ? '真的吃不下了……留着下一顿。' : this.pick(LINES.eat), 4600, 80);
    }
    if (kind === 'dance') return this.play('dance', '看好了，只跳一小段！', 6000, 80);
    if (kind === 'pet') return this.play('happy', this.pick(LINES.pet), 3200, 80);
    if (kind === 'celebrate') return this.play('jump', '看吧，我们做到了！', 4000, 80);
    if (['peek','sneak','satisfied','review','shock','pout','sorry','hum','curl','stretch','wave'].includes(kind)) return this.play(kind, '', 5000, 80);
    return false;
  }
  setMode(mode, minutes = 25) {
    if (!['company', 'focus', 'quiet'].includes(mode)) return false;
    this.mode = mode; this.focusUntil = mode === 'focus' ? this.now() + Math.max(1, Math.min(120, minutes)) * 60000 : 0;
    this.until = 0; this.play(mode === 'focus' ? 'think' : 'idle', mode === 'focus' ? '你专心，我帮你守着这段时间。' : '好，我调整一下。', 3500, 60);
    return true;
  }
  context({ idleSeconds = 0, locked = false, fullscreen = false, category = 'other' } = {}) {
    this.locked = locked || fullscreen;this.category=category;
    if (locked) return;
    if (idleSeconds >= 180 && !this.chatBusy) {
      this.away = true;
      // 原生探针重复报告空闲时保留动画起点，避免每三秒重新播放入睡过程。
      if (this.action !== 'sleep') this.play('sleep', '', 8000, 20);
      return;
    }
    if (this.away && idleSeconds < 5) {
      this.away = false; this.until = 0; this.play('wake', '回来啦？……刚好醒了。', 3500, 50); return;
    }
    if (this.mode !== 'company' || fullscreen || this.chatBusy || this.now()<this.contextAfter) return;
    const lines = {
      code: ['think', '我先安静想想，你继续。'],
      media: ['happy', '一起看一会儿？我不挡着。'],
      game: ['proud', '这局你来，我负责加油。'],
      reading: ['think', '慢慢看，我不催你。'],
    };
    if (lines[category] && this.now() >= (this.cooldowns.get(category) || 0)) {
      if (this.play(...lines[category], 3500, 10)) {this.cooldowns.set(category, this.now() + 15 * 60000);this.contextAfter=this.now()+180000;}
    }
  }
  tick() {
    const now = this.now();
    const elapsed = Math.max(0, now - this.lastDecay);
    this.fullness = Math.max(0, this.fullness - elapsed / 600000);
    this.lastDecay = now;
    if (this.focusUntil && now >= this.focusUntil) {
      this.focusUntil = 0; this.mode = 'company'; this.focusCount++;
      this.play('stretch', '这一段完成了，伸个懒腰再继续？', 5500, 70);
    }
    if (now >= this.until && !this.chatBusy && this.action !== 'idle' && !(this.away && this.action === 'sleep')) this.play(['sleep','curl'].includes(this.action)?'wake':'idle', '', 0, 0);
    if (now >= this.nextIdle && !this.locked && !this.away && !this.chatBusy && this.mode === 'company' && now >= this.until) {
      // 日常以无台词的身体调整为主。饥饿/哼歌必须有对应状态，大动作不随机硬插入。
      const expressive=now>=this.nextExpressive?(this.fullness<35?'hungry':this.category==='media'?'hum':null):null;
      const candidates=['shift','settle','breathe'].filter(a=>!this.recentIdle.includes(a));
      const action=expressive||this.pick(candidates.length?candidates:['shift']);
      this.play(action,'',3200,5);
      if(expressive)this.nextExpressive=now+300000;
      this.recentIdle=[...this.recentIdle,action].slice(-2);
      this.nextIdle = this.until + 18000 + this.random() * 14000;
    }
    return this.snapshot();
  }
  canWander() { return !this.locked && !this.away && !this.chatBusy && this.mode === 'company' && this.now() >= this.until; }
  snapshot() {
    return { action: this.action, frames: ACTIONS[this.action], message: this.message, started: this.started,
      until: this.until, revision: this.revision, mode: this.mode, focusUntil: this.focusUntil,
      fullness: Math.round(this.fullness), focusCount: this.focusCount, chatBusy: this.chatBusy };
  }
}
module.exports = { Companion, ACTIONS };
