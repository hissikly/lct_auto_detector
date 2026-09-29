/* Browser-side API for the Vercel UI prototype.
   The DINOv2 weight is not loaded here. Gallery bytes stay in IndexedDB. */
(function installVercelPrototypeApi() {
  const GALLERY_ID = "00000000000000000000000000000001";
  const MINIMUM = 10;
  const MODEL = "vercel-ui-prototype-not-dinov2";
  const RANKING = "demo_block_color";
  const SEMANTICS = "демонстрационное сходство цвета блоков в этом браузере; не cosine DINOv2 и не вероятность";
  const THRESHOLD = 0.84;
  const DB_NAME = "lct-vercel-prototype";
  const originalFetch = window.fetch.bind(window);

  function json(status, body) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("gallery")) db.createObjectStore("gallery", { keyPath: "key" });
        if (!db.objectStoreNames.contains("files")) db.createObjectStore("files", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function all(storeName) {
    const db = await openDb();
    return requestToPromise(db.transaction(storeName).objectStore(storeName).getAll());
  }

  async function put(storeName, value) {
    const db = await openDb();
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function remove(storeName, key) {
    const db = await openDb();
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  function galleryStatus(items) {
    const count = items.length;
    const ready = count >= MINIMUM;
    return {
      gallery_id: GALLERY_ID,
      name: "Общая галерея поиска",
      state: ready ? "ready" : "collecting",
      image_count: count,
      images_truncated: false,
      minimum_for_search: MINIMUM,
      search_ready: ready,
      processed: count,
      pending_count: 0,
      error: null,
      deployment: "vercel-ui-prototype",
      images: items.map((item) => ({
        gallery_id: item.gallery_id,
        filename: item.filename,
        image_url: item.url,
      })),
    };
  }

  function clampBox(box, width, height) {
    const x = Math.max(0, Math.min(width - 1, box.x));
    const y = Math.max(0, Math.min(height - 1, box.y));
    const w = Math.max(1, Math.min(width - x, box.w));
    const h = Math.max(1, Math.min(height - y, box.h));
    return { x, y, w, h };
  }

  async function vectorFromBlob(blob, box) {
    const bitmap = await createImageBitmap(blob);
    const source = box ? clampBox(box, bitmap.width, bitmap.height) : { x: 0, y: 0, w: bitmap.width, h: bitmap.height };
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, source.x, source.y, source.w, source.h, 0, 0, size, size);
    bitmap.close?.();
    const pixels = context.getImageData(0, 0, size, size).data;
    const cells = 8;
    const cell = size / cells;
    const vector = [];
    for (let gy = 0; gy < cells; gy += 1) {
      for (let gx = 0; gx < cells; gx += 1) {
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;
        for (let y = gy * cell; y < (gy + 1) * cell; y += 1) {
          for (let x = gx * cell; x < (gx + 1) * cell; x += 1) {
            const offset = (y * size + x) * 4;
            red += pixels[offset];
            green += pixels[offset + 1];
            blue += pixels[offset + 2];
            count += 1;
          }
        }
        vector.push(red / count / 255, green / count / 255, blue / count / 255);
      }
    }
    let norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / norm);
  }

  function cosine(left, right) {
    let dot = 0;
    for (let index = 0; index < left.length; index += 1) dot += left[index] * right[index];
    return dot;
  }

  function rank(queryVector, items) {
    const ranked = items
      .map((item) => {
        const score = cosine(queryVector, item.vector);
        return {
          gallery_id: item.gallery_id,
          similarity: score,
          confidence: score,
          ranking_score: score,
          image_url: item.url,
          source_image_url: item.url,
        };
      })
      .sort((a, b) => b.similarity - a.similarity || String(a.gallery_id).localeCompare(String(b.gallery_id)))
      .slice(0, 10);
    const accepted = ranked.filter((item, index) => index === 0 && item.similarity >= THRESHOLD);
    return {
      status: accepted.length ? "matched" : "no_confident_match",
      model_version: MODEL,
      gallery_id: GALLERY_ID,
      ranked,
      accepted,
      candidates: accepted,
      threshold: THRESHOLD,
      confidence_semantics: SEMANTICS,
      ranking_algorithm: RANKING,
    };
  }

  function withUrls(items) {
    return items.map((item) => ({
      ...item,
      url: URL.createObjectURL(new Blob([item.bytes], { type: item.type || "image/jpeg" })),
    }));
  }

  function stem(name) {
    return String(name).replace(/\\/g, "/").split("/").pop().replace(/\.[^.]+$/, "");
  }

  function parseCsv(text) {
    const clean = String(text || "").replace(/^\uFEFF/, "").trim();
    if (!clean) return [];
    const delimiter = clean.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < clean.length; index += 1) {
      const char = clean[index];
      if (char === '"') {
        if (quoted && clean[index + 1] === '"') { cell += '"'; index += 1; }
        else quoted = !quoted;
      } else if (!quoted && char === delimiter) {
        row.push(cell.trim());
        cell = "";
      } else if (!quoted && (char === "\n" || char === "\r")) {
        if (char === "\r" && clean[index + 1] === "\n") index += 1;
        row.push(cell.trim());
        cell = "";
        if (row.some(Boolean)) rows.push(row);
        row = [];
      } else cell += char;
    }
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    if (rows.length < 2) throw new Error("CSV не содержит строк с координатами.");
    const headers = rows.shift().map((value) => value.toLowerCase());
    const key = headers.includes("filename") ? "filename" : "image_id";
    for (const name of [key, "x", "y", "w", "h"]) {
      if (!headers.includes(name)) throw new Error(`В CSV нужна колонка ${name}.`);
    }
    return rows.map((values) => {
      const record = {};
      headers.forEach((header, index) => { record[header] = values[index] || ""; });
      return {
        key: record[key],
        x: Number(record.x),
        y: Number(record.y),
        w: Number(record.w),
        h: Number(record.h),
      };
    });
  }

  function matchBox(file, table) {
    if (!table.length) return null;
    const names = [file.name, stem(file.name)].map((value) => value.toLowerCase());
    const found = table.filter((row) => names.includes(String(row.key).toLowerCase()) || names.includes(stem(row.key).toLowerCase()));
    if (found.length !== 1) throw new Error(`Для «${file.name}» нужна ровно одна строка CSV; найдено ${found.length}.`);
    if (![found[0].x, found[0].y, found[0].w, found[0].h].every(Number.isFinite)) throw new Error(`У «${file.name}» нечисловой BBox.`);
    return { x: found[0].x, y: found[0].y, w: found[0].w, h: found[0].h };
  }

  async function readForm(input, init) {
    if (init?.body instanceof FormData) return init.body;
    const request = input instanceof Request ? input : new Request(input, init);
    return request.formData();
  }

  async function storeImage(file, box) {
    const bytes = await file.arrayBuffer();
    const blob = new Blob([bytes], { type: file.type || "image/jpeg" });
    const record = {
      key: crypto.randomUUID().replace(/-/g, ""),
      gallery_id: stem(file.name) || crypto.randomUUID().slice(0, 8),
      filename: file.name,
      type: file.type || "image/jpeg",
      bytes,
      vector: await vectorFromBlob(blob, box),
      url: URL.createObjectURL(blob),
    };
    await put("gallery", record);
    return record;
  }

  async function handle(url, input, init) {
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const path = url.pathname;
    try {
      if (method === "GET" && path === "/api/common-gallery") {
        return json(200, galleryStatus(withUrls(await all("gallery"))));
      }
      if (method === "POST" && path === "/api/common-gallery/images") {
        const form = await readForm(input, init);
        const archive = form.get("archive");
        if (archive instanceof File && archive.size) {
          return json(400, { detail: "ZIP в прототипе Vercel не индексируется. Добавьте JPG/PNG по отдельности. Большой архив обрабатывает локальный Docker-прототип." });
        }
        const images = form.getAll("images").filter((file) => file instanceof File && file.size);
        if (!images.length) return json(400, { detail: "Выберите JPG или PNG." });
        if (images.some((file) => !/\.(jpe?g|png)$/i.test(file.name))) return json(400, { detail: "Каждое изображение должно быть JPG/PNG." });
        const manifest = form.get("manifest");
        const table = manifest instanceof File && manifest.size ? parseCsv(await manifest.text()) : [];
        for (const file of images) await storeImage(file, matchBox(file, table));
        return json(202, { state: "ready", accepted: images.length });
      }
      if (method === "POST" && path === "/api/common-gallery/retry") {
        const items = await all("gallery");
        for (const item of items) {
          const blob = new Blob([item.bytes], { type: item.type || "image/jpeg" });
          item.vector = await vectorFromBlob(blob, null);
          await put("gallery", item);
        }
        return json(202, { state: "ready" });
      }
      if (method === "POST" && (path === "/api/infer" || path === "/api/identify" || path === "/v1/search")) {
        const items = withUrls(await all("gallery"));
        if (items.length < MINIMUM) return json(400, { detail: `Общая галерея ещё не готова. Добавьте минимум ${MINIMUM} автомобилей.` });
        const form = await readForm(input, init);
        const image = form.get("image");
        if (!(image instanceof File)) return json(400, { detail: "Нужно изображение запроса." });
        const box = {
          x: Number(form.get("x")),
          y: Number(form.get("y")),
          w: Number(form.get("w")),
          h: Number(form.get("h")),
        };
        const vector = await vectorFromBlob(image, box);
        return json(200, rank(vector, items));
      }
      if (method === "POST" && path === "/api/infer-batch") {
        const items = withUrls(await all("gallery"));
        if (items.length < MINIMUM) return json(400, { detail: `Общая галерея ещё не готова. Добавьте минимум ${MINIMUM} автомобилей.` });
        const form = await readForm(input, init);
        if (form.get("archive") instanceof File && form.get("archive").size) {
          return json(400, { detail: "ZIP-запрос в прототипе Vercel не считается. Выберите фотографии по отдельности. Полный архив — в локальном Docker-прототипе." });
        }
        const images = form.getAll("images").filter((file) => file instanceof File && file.size);
        const manifest = form.get("manifest");
        if (!(manifest instanceof File)) return json(400, { detail: "Нужен CSV с BBox." });
        const table = parseCsv(await manifest.text());
        const results = [];
        for (const file of images) {
          const vector = await vectorFromBlob(file, matchBox(file, table));
          results.push({ filename: file.name, payload: { ...rank(vector, items), query_cohort_size: images.length }, error: null });
        }
        return json(200, { results, ranking_algorithm: RANKING });
      }
      if (method === "GET" && path === "/api/judge-export/config") {
        return json(200, {
          enabled: false,
          downloads: ["candidates.csv", "embeddings.npy", "manifest.json", "submission.csv"],
          detail: "На Vercel модель не запускается: вес strong DINOv2-L/14 занимает 1,2 ГБ и не помещается в serverless. Файлы embeddings.npy, submission.csv и candidates.csv собирает локальный прототип или консольная команда из JUDGE_EXPORT.md.",
        });
      }
      if (method === "GET" && path === "/api/ready") {
        const items = await all("gallery");
        return json(200, {
          status: "ready",
          deployment: "vercel-ui-prototype",
          model_version: MODEL,
          encoder_loaded: false,
          gallery_size: items.length,
          gallery_ready: items.length >= MINIMUM,
          ranking: RANKING,
          batch_ranking: RANKING,
        });
      }
      if (method === "GET" && path === "/api/health") return json(200, { status: "ok", deployment: "vercel-ui-prototype" });
      if (method === "GET" && path === "/api/replenishment/files") {
        const files = await all("files");
        return json(200, files.map((file) => ({ ...file, bytes: undefined, url: URL.createObjectURL(new Blob([file.bytes], { type: file.type || "application/octet-stream" })) })));
      }
      if (method === "POST" && path === "/api/replenishment/files") {
        const form = await readForm(input, init);
        const file = form.get("file");
        if (!(file instanceof File)) return json(400, { detail: "Файл не передан." });
        const saved = {
          id: crypto.randomUUID().replace(/-/g, ""),
          name: file.name,
          kind: String(form.get("kind") || "image"),
          type: file.type || "application/octet-stream",
          bytes: await file.arrayBuffer(),
          status: "saved",
        };
        await put("files", saved);
        return json(201, { ...saved, bytes: undefined, url: URL.createObjectURL(new Blob([saved.bytes], { type: saved.type })) });
      }
      const fileMatch = path.match(/^\/api\/replenishment\/files\/([0-9a-f]+)$/);
      if (fileMatch && method === "PATCH") {
        const form = await readForm(input, init);
        const files = await all("files");
        const current = files.find((file) => file.id === fileMatch[1]);
        if (!current) return json(404, { detail: "Файл не найден." });
        current.name = String(form.get("name") || current.name);
        await put("files", current);
        return json(200, { id: current.id, name: current.name, kind: current.kind });
      }
      if (fileMatch && method === "DELETE") {
        await remove("files", fileMatch[1]);
        return new Response(null, { status: 204 });
      }
      if (method === "POST" && path === "/api/replenishment/archive") {
        return json(400, { detail: "Архив пополнения на Vercel не распаковывается. Добавьте файлы по одному или используйте локальный Docker-прототип." });
      }
      return json(404, { detail: "Этот адрес есть в локальном Docker-прототипе и не исполняется моделью на Vercel." });
    } catch (error) {
      return json(400, { detail: error.message || "Не удалось обработать запрос в браузерном прототипе." });
    }
  }

  window.fetch = (input, init) => {
    const raw = typeof input === "string" ? input : input.url;
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) return originalFetch(input, init);
    return handle(url, input, init);
  };
})();
