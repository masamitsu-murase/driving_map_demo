// js/car.js
// Car class: 路線座標列 ([{lat,lng},...]) に沿って滑らかに移動する。

// 車アイコン定義
const carIcon = L.icon({
  iconUrl: 'images/car.png',
  iconSize: [32, 32],   // アイコンの表示サイズ（ピクセル）
  iconAnchor: [16, 16], // アイコンの基準点（中心）
});

class Car {
  constructor(map, startLatLng, id) {
    this.map = map;
    this.id = id;
    this.pos = { lat: startLatLng.lat, lng: startLatLng.lng };
    this.marker = L.marker([this.pos.lat, this.pos.lng], {icon: carIcon }).addTo(map);
    this.marker.bindTooltip(() => `Car #${this.id}`, { permanent: false });
    this.route = [];       // 座標列 [{lat,lng},...]
    this.segmentIndex = 0; // 現在のセグメントの先頭点 index
    this.segRemain = 0;    // 現セグメントの残り距離（m）
    this.speedKmh = 40;    // km/h (更新される)
    this.busy = false;
    this._onFinish = null;
    this.poly = null;      // 表示用 polyline
  }

  // 距離計算（ハバーサイン: メートル）
  static haversine(a, b) {
    const R = 6371e3;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
    const s = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  // 緯度経度を線形補間（t:0..1）
  static lerp(a, b, t){
    return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
  }

  // routeCoords: [{lat,lng},...] を与える。到着時に onFinish が呼ばれる
  setRoute(routeCoords, onFinish) {
    if (!routeCoords || routeCoords.length < 2) {
      // 即完了
      if (onFinish) onFinish();
      return;
    }
    // 既存のラインを消す
    if (this.poly) { this.map.removeLayer(this.poly); this.poly = null; }
    this.route = routeCoords.map(p => ({ lat: p.lat, lng: p.lng }));
    this.segmentIndex = 0;
    // 現位置が route[0] と異なる場合、先頭に現在位置を挿入してスムーズにする
    const first = this.route[0];
    const distToFirst = Car.haversine(this.pos, first);
    if (distToFirst > 1.0) {
      this.route.unshift({ lat: this.pos.lat, lng: this.pos.lng });
      this.segmentIndex = 0;
    }
    // segRemain を最初のセグメント距離に設定
    this.segRemain = Car.haversine(this.route[0], this.route[1]);
    this.busy = true;
    this._onFinish = onFinish || null;
    // 表示
    this.poly = L.polyline(this.route, { color: '#1f77b4', weight: 3, opacity: 0.8 }).addTo(this.map);
    this.updateAppearance('toPickup');
  }

  // 到着時の見た目更新（状態文字列）
  updateAppearance(state) {
    const color = state === 'idle' ? '#2a9d8f' : (state === 'toPickup' ? '#f4a261' : '#e76f51');
    this.marker.setTooltipContent(`Car #${this.id}\n${state || (this.busy ? '移動中' : '空車')}`);
  }

  // dt: シミュレーション秒数。speedKmh は外部で更新してから step を呼ぶ。
  step(dt) {
    if (!this.busy || this.route.length < 2) return;

    // 現在スピード（m/s）
    const speedMps = (this.speedKmh || 40) * 1000 / 3600;
    let remainMove = speedMps * dt;

    // セグメントを順に消化
    while (remainMove > 0 && this.segmentIndex + 1 < this.route.length) {
      if (remainMove >= this.segRemain) {
        // セグメントを跨ぐ
        remainMove -= this.segRemain;
        // 次点に移動
        this.pos = { lat: this.route[this.segmentIndex + 1].lat, lng: this.route[this.segmentIndex + 1].lng };
        this.segmentIndex += 1;
        // 次のセグメント距離を計算（存在するなら）
        if (this.segmentIndex + 1 < this.route.length) {
          this.segRemain = Car.haversine(this.route[this.segmentIndex], this.route[this.segmentIndex + 1]);
        } else {
          this.segRemain = 0;
        }
      } else {
        // セグメント内で補間
        const p0 = this.route[this.segmentIndex];
        const p1 = this.route[this.segmentIndex + 1];
        const segLen = this.segRemain;
        const t = (segLen - remainMove) / segLen; // we move forward by remainMove -> new t
        // new position is between p0 and p1 at progress (1 - (segRemain - remainMove)/segLen) but easier:
        const moved = ( (segLen - (this.segRemain - remainMove)) / segLen ); // perc along segment
        const newT = moved; // 0..1 along p0->p1
        this.pos = Car.lerp(p0, p1, newT);
        this.segRemain -= remainMove;
        remainMove = 0;
      }
    }

    // 最終到達判定
    if (this.segmentIndex + 1 >= this.route.length) {
      // route 完了
      this.busy = false;
      // remove polyline（履歴を残したければコメントアウト）
      if (this.poly) { this.map.removeLayer(this.poly); this.poly = null; }
      this.updateAppearance('idle');
      if (this._onFinish) {
        const fn = this._onFinish;
        this._onFinish = null;
        // 呼び出しは非同期でも良い
        setTimeout(fn, 0);
      }
    }

    // marker 更新
    this.marker.setLatLng([this.pos.lat, this.pos.lng]);
  }

  // remove resources
  destroy() {
    if (this.marker) this.map.removeLayer(this.marker);
    if (this.poly) this.map.removeLayer(this.poly);
  }
}
