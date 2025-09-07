// js/dispatch.js
// Dispatcher: 空車群から最短（道路距離を使う場合は OSRM の table API を使う拡張も可能）
// 現在はハバーサイン距離で近傍選択（教育向けで十分）

class Dispatcher {
  constructor(points) {
    this.points = points || [];
    this.queue = []; // 割当できなかった要求を保存（将来拡張）
  }

  // ハバーサイン距離（m）
  static haversine(a, b) {
    return Car.haversine(a, b);
  }

  // 最も近い空車を返す（見つからなければ null）
  findNearestIdle(car) {
    let best = null;
    let bestD = Infinity;
    for (const p of this.points) {
      if (p.status != "initial") continue;
      const d = Dispatcher.haversine(car.pos, p.pos);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }
}
