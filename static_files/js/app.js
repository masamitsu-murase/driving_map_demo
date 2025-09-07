// js/app.js
// メイン。地図初期化・UI制御・ルート取得・配車フロー

const checkedIcon = L.icon({
  iconUrl: 'images/checked.png',
  iconSize: [20, 20],   // アイコンの表示サイズ（ピクセル）
  iconAnchor: [10, 10], // アイコンの基準点（中心）
});

const warningIcon = L.icon({
  iconUrl: 'images/warning.png',
  iconSize: [24, 24],   // アイコンの表示サイズ（ピクセル）
  iconAnchor: [12, 12], // アイコンの基準点（中心）
});

class TargetPoint {
  constructor(map, startLatLng, id) {
    this.map = map;
    this.id = id;
    this.status = "initial";
    this.pos = { lat: startLatLng.lat, lng: startLatLng.lng };
    this.marker = L.marker([this.pos.lat, this.pos.lng], {icon: warningIcon }).addTo(map);
  }

  setStatus(s) {
    this.status = s;
    if (s === "initial") {
      this.marker.setIcon(warningIcon);
    } else if (s === "picked") {
      this.marker.setIcon(checkedIcon);
    }
  }
}

// === 設定 ===
const OSRM_ENDPOINT = "http://localhost:5000"; // ローカル OSRM
const TILE_PATH = "./tiles/{z}/{x}/{y}.png";  // gdal2tiles で作ったローカルタイル
const INITIAL_CENTER = [35.0116, 135.7681]; // 京都市中心
const INITIAL_ZOOM = 14;

// === 地図初期化 ===
const map = L.map("map", { zoomControl: true }).setView(INITIAL_CENTER, INITIAL_ZOOM);

L.tileLayer(TILE_PATH, {
  minZoom: 12,
  maxZoom: 15,
  attribution: "地図: 国土地理院（ローカルタイル）"
}).addTo(map);

// === 車群の作成 ===
const cars = [];
let nextCarId = 1;
// 初期車をいくつか配置
const demoPoints = [
  { lat: 35.012, lng: 135.768 },
  // { lat: 35.017, lng: 135.765 },
  // { lat: 35.006, lng: 135.775 },
];
for (const p of demoPoints) {
  const car = new Car(map, p, nextCarId++);
  cars.push(car);
}

const demoTargetPoints = [
  { lat: 35.01565, lng: 135.75120 },
  { lat: 35.00486, lng: 135.75870 },
];
let nextTargetId = 1;
const targets = [];
for (const p of demoTargetPoints) {
  const t = new TargetPoint(map, p, nextTargetId++);
  targets.push(t);
}
const dispatcher = new Dispatcher(targets);

// === UI controls ===
const btnAddCar = document.getElementById("btnAddCar");
const btnAddReq = document.getElementById("btnAddReq");
const btnPan = document.getElementById("btnPan");
const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnRandomReq = document.getElementById("btnRandomReq");
const btnReset = document.getElementById("btnReset");
const inpSpeed = document.getElementById("inpSpeed");
const inpTimeScale = document.getElementById("inpTimeScale");
const queueCountEl = document.getElementById("queueCount");
const logEl = document.getElementById("log");

let mode = "pan"; // 'addcar', 'addreq', 'pan'
let pendingPick = null;
let running = true;

function setMode(m){
  mode = m;
  [btnAddCar, btnAddReq, btnPan].forEach(b => b.classList.remove("active"));
  if (m === "addcar") btnAddCar.classList.add("active");
  if (m === "addreq") btnAddReq.classList.add("active");
  if (m === "pan") btnPan.classList.add("active");
}
setMode("addreq");

btnAddCar.onclick = () => setMode("addcar");
btnAddReq.onclick = () => setMode("addreq");
btnPan.onclick = () => setMode("pan");
btnStart.onclick = () => { running = true; };
btnPause.onclick = () => { running = false; };
btnRandomReq.onclick = () => createRandomRequest();
btnReset.onclick = () => resetAll();

map.on("click", async (e) => {
  const latlng = e.latlng;
  if (mode === "addcar") {
    // const car = new Car(map, { lat: latlng.lat, lng: latlng.lng }, nextCarId++);
    // cars.push(car);
    // dispatcher.cars = cars;
    // log(`車を追加: #${car.id}`);
  } else if (mode === "addreq") {
    // if (!pendingPick) {
    //   pendingPick = latlng;
    //   L.popup().setLatLng(latlng).setContent("ピックアップ地点を設定しました。次にドロップ地点をクリックしてください。").openOn(map);
    // } else {
    //   const pick = pendingPick;
    //   const drop = latlng;
    //   pendingPick = null;
    //   map.closePopup();
    //   await handleNewRequest(pick, drop);
    // }
    const target = new TargetPoint(map, e.latlng, nextTargetId++);
    targets.push(target);
    dispatcher.points = targets;
    // if (cars[0].busy === false) {
    //   handleNewRequest();
    // }
  }
});

// ランダム要求（表示範囲内）
function createRandomRequest() {
}

// 新規要求のハンドリング: 自動割当を試み、経路を作成して車にセットする
async function handleNewRequest(target) {
  const car = cars[0];
   target  = (target || dispatcher.findNearestIdle(car));
  if (!target) {
    // 今はキュー機能は簡易: アラートと UI 更新
    log("空車なし。キューに追加（簡易）。");
    queueCountEl.textContent = Number(queueCountEl.textContent) + 1;
    return;
  }

  const goalLatLng = target.pos;

  log("リクエスト: pick=" + goalLatLng.lat.toFixed(5) + "," + goalLatLng.lng.toFixed(5));
  log(`Point #${target.id} を割当（空車から最短）`);

  // 1) 車 -> pick の経路
  try {
    const route1 = await fetchRoute(car.pos, target.pos);
    // 2) pick -> drop の経路は到着時に設定する（ただしここで先に取得しても良い）
    // setRoute で到着時に次の leg を発火させるハンドルを渡す
    car.speedKmh = Number(inpSpeed.value) || 40;
    car.setRoute(route1, () => {
      // 到着時: pickup -> drop のルート取得 & セット
      log(`Car #${car.id} 到着（ピックアップ）。次はドロップへ`);
      target.setStatus("picked");
      // handleNewRequest();
    });
  } catch (err) {
    log("pickup ルート取得失敗: " + err);
    alert("ルート取得に失敗しました。OSRM サーバが起動しているか確認してください。");
  }
}

// OSRM からルートを取得（GeoJSON->配列）
async function fetchRoute(from, to) {
  const url = `${OSRM_ENDPOINT}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`OSRM HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data.routes || !data.routes[0]) throw new Error("no route");
  const coords = data.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
  return coords;
}

// ログ出力
function log(s) {
  const t = new Date().toLocaleTimeString();
  logEl.innerHTML = `<div>[${t}] ${s}</div>` + logEl.innerHTML;
}

// 全消去
function resetAll() {
  // 車を削除
  for (const c of cars) c.destroy();
  cars.length = 0;
  nextCarId = 1;
  // マーカーやポリラインは個別に作っているため、ページリロードが確実
  location.reload();
}

// === シミュレーションループ ===
let lastTs = performance.now();
function frame(now) {
  const dtReal = (now - lastTs) / 1000.0;
  lastTs = now;
  const scale = Number(inpTimeScale.value) || 1;
  const dt = running ? dtReal * scale : 0;

  // update car speed from UI
  for (const c of cars) {
    c.speedKmh = Number(inpSpeed.value) || 40;
    c.step(dt);
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

(async function() {
  while (true) {
    const c = cars[0]
    const body = JSON.stringify({
      car: { id: c.id, lat: c.pos.lat, lng: c.pos.lng, busy: c.busy },
      targets: targets.map(t => ({
        id: t.id, lat: t.pos.lat, lng: t.pos.lng, status: t.status,
        distance: Dispatcher.haversine(c.pos, t.pos),
      })),
    });
    const params = new URLSearchParams({ body });
    const response = await fetch("/api/get_next_action?" + params);
    const data = await response.json();
    switch (data.action) {
      case "go":
        if (c.busy === false) {
          const target = data.target;
          if (target) {
            const t = targets.find(t => (t.id === target && t.status === "initial"));
            if (t) {
              await handleNewRequest(t);
            }
          } else {
            handleNewRequest();
          }
        }
        break;
      default:
        break;
    }
  }
})();

// 初期ノート
log("デモ準備完了。地図をクリックして試してください。");
