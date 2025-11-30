// ===== キャンバスのA3縦サイズ（300dpi相当の目安） =====
const A3_WIDTH = 3508;
const A3_HEIGHT = 4961;

const fileTopInput = document.getElementById("fileTop");
const fileBottomInput = document.getElementById("fileBottom");
const previewTop = document.getElementById("previewTop");
const previewBottom = document.getElementById("previewBottom");
const mergeBtn = document.getElementById("mergeBtn");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let topDataUrl = null;
let bottomDataUrl = null;

// ===== イベント設定 =====
fileTopInput.addEventListener("change", handleFileChange);
fileBottomInput.addEventListener("change", handleFileChange);
mergeBtn.addEventListener("click", handleMerge);

// ===== ファイル選択時処理 =====
function handleFileChange() {
  const topFile = fileTopInput.files[0];
  const bottomFile = fileBottomInput.files[0];

  updatePreview(previewTop, topFile, (url) => (topDataUrl = url));
  updatePreview(previewBottom, bottomFile, (url) => (bottomDataUrl = url));

  mergeBtn.disabled = !(topFile && bottomFile);
  statusEl.textContent = "";
}

// プレビュー更新
function updatePreview(container, file, onLoaded) {
  container.innerHTML = "";
  if (!file) {
    container.textContent = "画像未選択";
    return;
  }
  if (!file.type.startsWith("image/")) {
    container.textContent = "画像ファイルを選択してください";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const img = document.createElement("img");
    img.src = dataUrl;
    img.className = "preview-img";
    container.appendChild(img);
    if (onLoaded) onLoaded(dataUrl);
  };
  reader.readAsDataURL(file);
}

// ===== 合成処理 =====
async function handleMerge() {
  if (!topDataUrl || !bottomDataUrl) return;

  try {
    mergeBtn.disabled = true;
    statusEl.textContent = "合成中… 少しお待ちください。";

    const [topImg, bottomImg] = await Promise.all([
      loadImage(topDataUrl),
      loadImage(bottomDataUrl),
    ]);

    // キャンバスをA3縦サイズに設定
    canvas.width = A3_WIDTH;
    canvas.height = A3_HEIGHT;

    // 背景を白で塗りつぶし（印刷時の透過トラブル防止）
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, A3_WIDTH, A3_HEIGHT);

    // 上下に描画
    drawTopBottom(topImg, bottomImg);

    // JPEGに変換してダウンロード
    const quality = 0.92; // 0〜1（画質優先）
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          statusEl.textContent =
            "ブラウザが画像出力に対応していません。（別ブラウザを試してください）";
          return;
        }
        const url = URL.createObjectURL(blob);
        downloadBlob(url);
        URL.revokeObjectURL(url);
        statusEl.textContent =
          "合成完了！ A3縦JPEGをダウンロードしました。";
      },
      "image/jpeg",
      quality
    );
  } catch (e) {
    console.error(e);
    statusEl.textContent =
      "エラーが発生しました。もう一度画像を選択してお試しください。";
  } finally {
    mergeBtn.disabled = !(fileTopInput.files[0] && fileBottomInput.files[0]);
  }
}

// 画像ロード（DataURL → Imageオブジェクト）
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// 上下にフィットさせて描画
function drawTopBottom(topImg, bottomImg) {
  const halfH = A3_HEIGHT / 2;

  // それぞれ全幅・半分の高さに収まるようスケール計算
  const topFit = calcFit(topImg.width, topImg.height, A3_WIDTH, halfH);
  const bottomFit = calcFit(
    bottomImg.width,
    bottomImg.height,
    A3_WIDTH,
    halfH
  );

  // 上画像：下端を中央線に合わせる
  const topX = (A3_WIDTH - topFit.w) / 2;
  const topY = halfH - topFit.h;

  // 下画像：上端を中央線に合わせる
  const bottomX = (A3_WIDTH - bottomFit.w) / 2;
  const bottomY = halfH;

  ctx.drawImage(topImg, topX, topY, topFit.w, topFit.h);
  ctx.drawImage(bottomImg, bottomX, bottomY, bottomFit.w, bottomFit.h);
}

// 指定枠内に収まるようにリサイズ
function calcFit(origW, origH, maxW, maxH) {
  const scale = Math.min(maxW / origW, maxH / origH);
  return {
    w: origW * scale,
    h: origH * scale,
  };
}

// ダウンロード処理
function downloadBlob(url) {
  const a = document.createElement("a");
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes() + 1).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  a.href = url;
  a.download = `POP_A3縦_${y}${m}${d}_${hh}${mm}${ss}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
