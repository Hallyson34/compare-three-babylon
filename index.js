"use strict";

/* =========================================================================
  Config
=========================================================================== */
const ICON_MAP = {
  chrome: "/img/chrome.png",
  firefox: "/img/firefox.png",
  opera: "/img/opera.png",
};
const DEFAULT_BROWSER = "chrome";

const SECTION_CONFIG = {
  trees: {
    fpsCanvasId: "fpsChartThreeModel",
    mbCanvasId: "mbChartThreeModel",
    pickerId: "browserSelectTrees",
    iconId: "iconTrees",
  },
  hintze: {
    fpsCanvasId: "fpsChartHintzeHall",
    mbCanvasId: "mbChartHintzeHall",
    pickerId: "browserSelectHintze",
    iconId: "iconHintze",
  },
};

/* =========================================================================
  Utils
=========================================================================== */
async function loadData() {
  const res = await fetch("/data.json");
  if (!res.ok) throw new Error(`Falha ao carregar data.json: ${res.status}`);
  return res.json();
}

function extractSeries(node) {
  if (!node) return { data: [], stats: {} };

  if (Array.isArray(node.data)) {
    return {
      data: node.data,
      stats: {
        min: node.estatics?.min || 0,
        max: node.estatics?.max || 0,
        mean: node.estatics?.mean || 0,
        median: node.estatics?.median || 0,
        standardDeviation: node.estatics?.standardDeviation || 0,
      },
    };
  }

  return {
    data: [],
    stats: { min: 0, max: 0, mean: 0, median: 0, standardDeviation: 0 },
  };
}

/* =========================================================================
  Chart.js helpers
=========================================================================== */
function createLineChart(canvasId, yLabel) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  return new Chart(canvas, {
    type: "line",
    data: {
      labels: Array.from({ length: 60 }, (_, i) => `${i + 1}s`),
      datasets: [
        {
          label: "ThreeJS",
          data: [],
          borderColor: "#06B6D4",
          backgroundColor: "rgba(6, 182, 212, 0.15)",
          fill: false,
          tension: 0.25,
        },
        {
          label: "BabylonJS",
          data: [],
          borderColor: "#D946EF",
          backgroundColor: "rgba(217, 70, 239, 0.15)",
          fill: false,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: "Tempo (s)", color: "white" },
          ticks: { color: "white" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          title: { display: true, text: yLabel, color: "white" },
          ticks: { color: "white" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
      plugins: { legend: { labels: { color: "white" } } },
    },
  });
}

function updateLineChart(chart, threeData, babylonData) {
  if (!chart) return;
  chart.data.datasets[0].data = threeData;
  chart.data.datasets[1].data = babylonData;
  chart.update();
}

/* =========================================================================
  Cards
=========================================================================== */
function fillCard(cardEl, stats, unit) {
  const strongs = cardEl.querySelectorAll("li strong");
  if (strongs.length < 4) return;
  strongs[0].textContent = `${stats.min} ${unit}`;
  strongs[1].textContent = `${stats.max} ${unit}`;
  strongs[2].textContent = `${stats.mean} ${unit}`;
  strongs[3].textContent = `${stats.standardDeviation} ${unit}`;
  strongs[4].textContent = `${stats.median} ${unit}`;
}

function updateCardsForCanvas(canvasId, unit, threeStats, babylonStats) {
  const chartItem = document.getElementById(canvasId)?.closest(".chart-item");
  if (!chartItem) return;

  const [cardThree, cardBabylon] =
    chartItem.querySelectorAll(".performance-card");
  if (!cardThree || !cardBabylon) return;

  fillCard(cardThree, threeStats, unit);
  fillCard(cardBabylon, babylonStats, unit);
}

/* =========================================================================
  Render
=========================================================================== */
function renderSection(sectionKey, browserKey, data, charts) {
  const node = data[browserKey][sectionKey];

  const fpsThree = extractSeries(node.fps.three);
  const fpsBab = extractSeries(node.fps.babylon);

  updateLineChart(charts[sectionKey].fps, fpsThree.data, fpsBab.data);
  updateCardsForCanvas(
    SECTION_CONFIG[sectionKey].fpsCanvasId,
    "FPS",
    fpsThree.stats,
    fpsBab.stats
  );

  const mbThree = extractSeries(node.mb.three);
  const mbBab = extractSeries(node.mb.babylon);

  updateLineChart(charts[sectionKey].mb, mbThree.data, mbBab.data);
  updateCardsForCanvas(
    SECTION_CONFIG[sectionKey].mbCanvasId,
    "MB",
    mbThree.stats,
    mbBab.stats
  );
}

/* =========================================================================
  Pickers
=========================================================================== */
function bindSectionPicker(sectionKey, onChange) {
  const { pickerId, iconId } = SECTION_CONFIG[sectionKey];
  const select = document.getElementById(pickerId);
  const icon = document.getElementById(iconId);
  if (!select) return;

  const updateIcon = (val) => {
    if (icon) {
      icon.src = ICON_MAP[val] || ICON_MAP[DEFAULT_BROWSER];
      icon.alt = val || DEFAULT_BROWSER;
    }
  };

  updateIcon(select.value || DEFAULT_BROWSER);

  select.addEventListener("change", (e) => {
    const val = e.target.value || DEFAULT_BROWSER;
    updateIcon(val);
    onChange(val);
  });
}

/* =========================================================================
  Bootstrap
=========================================================================== */
(async function init() {
  try {
    const data = await loadData();

    const charts = {
      trees: {
        fps: createLineChart(SECTION_CONFIG.trees.fpsCanvasId, "FPS"),
        mb: createLineChart(SECTION_CONFIG.trees.mbCanvasId, "Memória (MB)"),
      },
      hintze: {
        fps: createLineChart(SECTION_CONFIG.hintze.fpsCanvasId, "FPS"),
        mb: createLineChart(SECTION_CONFIG.hintze.mbCanvasId, "Memória (MB)"),
      },
    };

    renderSection("trees", DEFAULT_BROWSER, data, charts);
    renderSection("hintze", DEFAULT_BROWSER, data, charts);

    bindSectionPicker("trees", (browser) =>
      renderSection("trees", browser, data, charts)
    );
    bindSectionPicker("hintze", (browser) =>
      renderSection("hintze", browser, data, charts)
    );
  } catch (err) {
    console.error(err);
  }
})();
