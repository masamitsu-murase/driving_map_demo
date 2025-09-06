// js/dispatch.js
// Dispatcher: 空車群から最短（道路距離を使う場合は OSRM の table API を使う拡張も可能）
// 現在はハバーサイン距離で近傍選択（教育向けで十分）

class Dispatcher {
  constructor(cars) {
    this.cars = cars || [];
    this.queue = []; // 割当できなかった要求を保存（将来拡張）
  }

  // ハバーサイン距離（m）
  static haversine(a, b) {
    return Car.haversine(a, b);
  }

  // 最も近い空車を返す（見つからなければ null）
  findNearestIdle(pick) {
    let best = null;
    let bestD = Infinity;
    for (const car of this.cars) {
      if (car.busy) continue;
      const d = Dispatcher.haversine(car.pos, pick);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }
}
