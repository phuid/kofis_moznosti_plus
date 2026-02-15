console.log("kofi moznostiPlus start");

// Time slots: 4:30 to 23:00, 30-minute intervals
const TIME_SLOTS = generateTimeSlots();
const DAYS_OF_WEEK = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];

function generateTimeSlots() {
  const slots = [];
  let hours = 4;
  let minutes = 30;

  while (hours < 23 || (hours === 23 && minutes === 0)) {
    slots.push(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
    minutes += 30;
    if (minutes >= 60) {
      minutes = 0;
      hours++;
    }
  }
  return slots;
}

// Data structure for storing presets with active selection
// { presets: [{id, name, weeklyAvailability}, ...], activePresetId: id }
let presetsData = {
  presets: [],
  activePresetId: null
};

// Interface size state: 'minimized', 'expanded', 'full'
let interfaceSize = 'expanded';

// Helper to get active preset
function getActivePreset() {
  if (!presetsData.activePresetId) return null;
  return presetsData.presets.find(p => p.id === presetsData.activePresetId);
}

// Helper to get active preset data
function getActivePresetData() {
  const preset = getActivePreset();
  return preset ? preset.weeklyAvailability : Array(7).fill(null).map(() => []);
}

// Load data from localStorage if exists
function loadWorkAvailability() {
  const saved = localStorage.getItem("moznostiPlus_presets");
  if (saved) {
    presetsData = JSON.parse(saved);
  } else {
    // Initialize with one default preset
    presetsData = {
      presets: [{
        id: 1,
        name: "Výchozí",
        weeklyAvailability: Array(7).fill(null).map(() => [])
      }],
      activePresetId: 1
    };
    saveWorkAvailability();
  }
}

// Save data to localStorage
function saveWorkAvailability() {
  localStorage.setItem("moznostiPlus_presets", JSON.stringify(presetsData));
}

// Create new preset
function createPreset(name) {
  const newId = Math.max(0, ...presetsData.presets.map(p => p.id)) + 1;
  const newPreset = {
    id: newId,
    name: name || `Preset ${newId}`,
    weeklyAvailability: Array(7).fill(null).map(() => [])
  };
  presetsData.presets.push(newPreset);
  presetsData.activePresetId = newId;
  saveWorkAvailability();
  renderTimelines();
  updatePresetsUI();
}

// Delete preset
function deletePreset(presetId) {
  presetsData.presets = presetsData.presets.filter(p => p.id !== presetId);

  // If deleted preset was active, switch to first available
  if (presetsData.activePresetId === presetId) {
    presetsData.activePresetId = presetsData.presets.length > 0 ? presetsData.presets[0].id : null;
  }

  saveWorkAvailability();
  renderTimelines();
  updatePresetsUI();
}

// Switch active preset
function switchPreset(presetId) {
  if (presetsData.presets.find(p => p.id === presetId)) {
    presetsData.activePresetId = presetId;
    saveWorkAvailability();
    renderTimelines();
    updatePresetsUI();
  }
}

// Rename preset
function renamePreset(presetId, newName) {
  const preset = presetsData.presets.find(p => p.id === presetId);
  if (preset && newName.trim().length > 0) {
    preset.name = newName.trim();
    saveWorkAvailability();
    updatePresetsUI();
  }
}

// Add new time range for a day
function addTimeRange(dayOfWeek) {
  const preset = getActivePreset();
  if (!preset) return;

  if (!preset.weeklyAvailability[dayOfWeek]) {
    preset.weeklyAvailability[dayOfWeek] = [];
  }

  preset.weeklyAvailability[dayOfWeek].push({
    from: 0,
    to: 17
  });
  saveWorkAvailability();
  renderTimelines();
}

// Remove time range for a day
function removeTimeRange(dayOfWeek, rangeIndex) {
  const preset = getActivePreset();
  if (!preset || !preset.weeklyAvailability[dayOfWeek]) return;

  preset.weeklyAvailability[dayOfWeek].splice(rangeIndex, 1);
  saveWorkAvailability();
  renderTimelines();
}

// Update time range
function updateTimeRange(dayOfWeek, rangeIndex, from, to) {
  const preset = getActivePreset();
  if (!preset || !preset.weeklyAvailability[dayOfWeek] || !preset.weeklyAvailability[dayOfWeek][rangeIndex]) return;

  if (from < to) {
    preset.weeklyAvailability[dayOfWeek][rangeIndex] = { from, to };
    saveWorkAvailability();
    renderTimelines();
  }
}

// Create the interface div
function createInterfaceDiv() {
  const interfaceDiv = document.createElement("div");
  interfaceDiv.id = "moznostiPlus-interface";

  interfaceDiv.innerHTML = `
    <div id="moznostiPlus-content">
      <div id="moznostiPlus-header">
        <h3>moznostiPlus</h3>
        <div id="moznostiPlus-header-buttons">
          <button id="moznostiPlus-size-btn">−</button>
          <button id="moznostiPlus-toggle-btn">+</button>
        </div>
      </div>
      
      <div id="moznostiPlus-presets-section">
        <div id="moznostiPlus-presets-label">Presety:</div>
        <div id="moznostiPlus-presets-list"></div>
        <div id="moznostiPlus-presets-controls">
          <input type="text" id="moznostiPlus-preset-name" placeholder="Nový preset...">
          <button id="moznostiPlus-create-preset-btn">+ Přidat</button>
        </div>
      </div>
      
      <div id="moznostiPlus-timelines-section">
        <div id="moznostiPlus-timelines"></div>
      </div>
    </div>
  `;

  document.body.appendChild(interfaceDiv);
  applyInterfaceStyles();
  loadWorkAvailability();
  renderTimelines();
  updatePresetsUI();
  attachEventListeners();
  updateInterfaceSize();
}

// Apply CSS styles
function applyInterfaceStyles() {
  const style = document.createElement("style");
  style.textContent = `
    #moznostiPlus-interface {
      position: fixed;
      top: 10px;
      right: 10px;
      background: white;
      border: 2px solid #333;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      font-family: Arial, sans-serif;
      z-index: 10000;
      max-height: 95vh;
      overflow-y: auto;
    }
    
    #moznostiPlus-content {
      padding: 12px;
    }
    
    #moznostiPlus-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      border-top: 1px solid #ccc;
      padding-top: 8px;
    }
    
    #moznostiPlus-header h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
    }
    
    #moznostiPlus-header-buttons {
      display: flex;
      gap: 4px;
    }
    
    #moznostiPlus-size-btn,
    #moznostiPlus-toggle-btn {
      background: #f0f0f0;
      border: 1px solid #ccc;
      padding: 4px 8px;
      cursor: pointer;
      border-radius: 4px;
      font-size: 18px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    #moznostiPlus-size-btn:hover,
    #moznostiPlus-toggle-btn:hover {
      background: #e0e0e0;
    }
    
    /* Minimized mode */
    #moznostiPlus-interface.minimized #moznostiPlus-presets-section,
    #moznostiPlus-interface.minimized #moznostiPlus-timelines-section {
      display: none;
    }
    
    #moznostiPlus-interface.minimized {
      min-width: auto;
      width: auto;
    }
    
    #moznostiPlus-interface.minimized #moznostiPlus-content {
      padding: 8px;
    }
    
    #moznostiPlus-interface.minimized #moznostiPlus-header {
      margin-bottom: 0;
      border-bottom: none;
      padding-bottom: 0;
    }
    
    /* Expanded mode */
    #moznostiPlus-interface.expanded #moznostiPlus-presets-controls {
      display: none;
    }
    
    #moznostiPlus-interface.expanded #moznostiPlus-timelines-section {
      display: none;
    }
    
    /* Full mode */
    /* All buttons visible in all modes */

    
    #moznostiPlus-presets-section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #ccc;
    }
    
    #moznostiPlus-presets-label {
      font-size: 12px;
      font-weight: bold;
      color: #666;
      margin-bottom: 6px;
    }
    
    #moznostiPlus-presets-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
      max-height: 150px;
      overflow-y: auto;
    }
    
    .moznostiPlus-preset-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      background: #f5f5f5;
      border-radius: 4px;
      border: 1px solid #ddd;
      font-size: 12px;
    }
    
    .moznostiPlus-preset-item.active {
      background: #d4edda;
      border-color: #4CAF50;
      font-weight: bold;
    }
    
    .moznostiPlus-preset-name {
      flex-grow: 1;
      cursor: pointer;
      color: #333;
    }
    
    .moznostiPlus-preset-delete {
      background: #f44336;
      color: white;
      border: none;
      padding: 2px 6px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    }
    
    .moznostiPlus-preset-delete:hover {
      background: #da190b;
    }
    
    #moznostiPlus-presets-controls {
      display: flex;
      gap: 4px;
    }
    
    #moznostiPlus-preset-name {
      flex-grow: 1;
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 11px;
    }
    
    #moznostiPlus-create-preset-btn {
      background: #2196F3;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-weight: bold;
    }
    
    #moznostiPlus-create-preset-btn:hover {
      background: #0b7dda;
    }
    
    #moznostiPlus-timelines-section {
      min-width: 700px;
    }
    
    #moznostiPlus-timelines-section.hidden {
      display: none;
    }
    
    .moznostiPlus-day {
      margin-bottom: 16px;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 6px;
    }
    
    .moznostiPlus-day-label {
      font-weight: bold;
      color: #333;
      font-size: 13px;
      margin-bottom: 8px;
    }
    
    .moznostiPlus-ranges-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .moznostiPlus-range {
      background: white;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    
    .moznostiPlus-range-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #666;
      margin-bottom: 6px;
      font-weight: bold;
    }
    
    .moznostiPlus-slider-container {
      position: relative;
      margin-bottom: 8px;
      padding: 0 5px;
    }
    
    .moznostiPlus-slider-track {
      width: 100%;
      height: 6px;
      background: #e0e0e0;
      border-radius: 3px;
      position: relative;
      margin: 12px 0;
    }
    
    .moznostiPlus-slider-fill {
      position: absolute;
      height: 100%;
      background: #4CAF50;
      border-radius: 3px;
      top: 0;
    }
    
    .moznostiPlus-slider-handle {
      position: absolute;
      width: 20px;
      height: 20px;
      background: white;
      border: 3px solid #4CAF50;
      border-radius: 50%;
      cursor: pointer;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 10;
      transition: box-shadow 0.2s;
    }
    
    .moznostiPlus-slider-handle:hover {
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
    }
    
    .moznostiPlus-slider-handle.dragging {
      box-shadow: 0 0 12px rgba(76, 175, 80, 0.8);
      z-index: 20;
    }
    
    .moznostiPlus-range-times {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #333;
      margin-bottom: 6px;
    }
    
    .moznostiPlus-range-delete {
      background: #f44336;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      width: 100%;
    }
    
    .moznostiPlus-range-delete:hover {
      background: #da190b;
    }
    
    .moznostiPlus-add-range-btn {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
      width: 100%;
    }
    
    .moznostiPlus-add-range-btn:hover {
      background: #45a049;
    }
    
    .moznostiPlus-ranges-times-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #eee;
    }
    
    .moznostiPlus-range-time-item {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #f0f8ff;
      padding: 4px 8px;
      border-radius: 12px;
      border: 1px solid #4CAF50;
      font-size: 11px;
      color: #333;
    }
    
    .moznostiPlus-time-badge {
      font-weight: bold;
      color: #4CAF50;
    }
    
    .moznostiPlus-range-small-delete {
      background: none;
      border: none;
      color: #f44336;
      cursor: pointer;
      font-size: 14px;
      padding: 0;
      margin-left: 2px;
      font-weight: bold;
    }
    
    .moznostiPlus-range-small-delete:hover {
      color: #da190b;
    }
  `;

  document.head.appendChild(style);
}

// Attach event listeners
function attachEventListeners() {
  const sizeBtn = document.getElementById("moznostiPlus-size-btn");
  const toggleBtn = document.getElementById("moznostiPlus-toggle-btn");
  const presetNameInput = document.getElementById("moznostiPlus-preset-name");
  const createPresetBtn = document.getElementById("moznostiPlus-create-preset-btn");

  if (!sizeBtn || !toggleBtn) return;

  // Size button: decrease size
  sizeBtn.addEventListener("click", () => {
    if (interfaceSize === 'expanded') {
      interfaceSize = 'minimized';
    } else if (interfaceSize === 'full') {
      interfaceSize = 'expanded';
    }
    // minimized stays minimized (no smaller size available)
    updateInterfaceSize();
  });

  // Toggle button: increase size
  toggleBtn.addEventListener("click", () => {
    if (interfaceSize === 'minimized') {
      interfaceSize = 'expanded';
    } else if (interfaceSize === 'expanded') {
      interfaceSize = 'full';
    }
    // full stays full (no larger size available)
    updateInterfaceSize();
  });

  // Create preset on button click
  createPresetBtn.addEventListener("click", () => {
    const name = presetNameInput.value.trim();
    if (name.length > 0) {
      createPreset(name);
      presetNameInput.value = "";
    }
  });

  // Create preset on Enter key
  presetNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      createPresetBtn.click();
    }
  });
}

// Update interface size display
function updateInterfaceSize() {
  const interfaceDiv = document.getElementById("moznostiPlus-interface");
  const sizeBtn = document.getElementById("moznostiPlus-size-btn");
  const toggleBtn = document.getElementById("moznostiPlus-toggle-btn");

  if (!interfaceDiv) return;

  // Remove all size classes
  interfaceDiv.classList.remove('minimized', 'expanded', 'full');
  // Add current size class
  interfaceDiv.classList.add(interfaceSize);

  // Keep button text consistent
  if (sizeBtn) {
    sizeBtn.textContent = '−';
  }
  if (toggleBtn) {
    toggleBtn.textContent = '+';
  }
}

// Update presets list UI
function updatePresetsUI() {
  const presetsList = document.getElementById("moznostiPlus-presets-list");
  if (!presetsList) return;

  presetsList.innerHTML = "";

  presetsData.presets.forEach(preset => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "moznostiPlus-preset-item";

    if (preset.id === presetsData.activePresetId) {
      itemDiv.classList.add("active");
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "moznostiPlus-preset-name";
    nameSpan.textContent = preset.name;
    nameSpan.addEventListener("click", () => switchPreset(preset.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "moznostiPlus-preset-delete";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", () => {
      if (presetsData.presets.length > 1) {
        deletePreset(preset.id);
      } else {
        alert("Musíte mít alespoň jeden preset!");
      }
    });

    itemDiv.appendChild(nameSpan);
    if (presetsData.presets.length > 1) {
      itemDiv.appendChild(deleteBtn);
    }

    presetsList.appendChild(itemDiv);
  });
}

// Render the weekly timelines with sliders
function renderTimelines() {
  const timelinesDiv = document.getElementById("moznostiPlus-timelines");
  if (!timelinesDiv) return;

  timelinesDiv.innerHTML = "";

  const preset = getActivePreset();
  if (!preset) {
    timelinesDiv.innerHTML = "<div style='color: #999; font-size: 11px;'>Žádný aktivní preset</div>";
    return;
  }

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "moznostiPlus-day";

    const labelDiv = document.createElement("div");
    labelDiv.className = "moznostiPlus-day-label";
    labelDiv.textContent = DAYS_OF_WEEK[dayOfWeek];
    dayDiv.appendChild(labelDiv);

    // Create single timeline for the day
    const ranges = preset.weeklyAvailability[dayOfWeek] || [];
    const dayTimeline = createDayTimeline(dayOfWeek, ranges);
    dayDiv.appendChild(dayTimeline);

    // Add button for new range
    const addBtn = document.createElement("button");
    addBtn.className = "moznostiPlus-add-range-btn";
    addBtn.textContent = "+ Přidat možnost";
    addBtn.addEventListener("click", () => addTimeRange(dayOfWeek));
    dayDiv.appendChild(addBtn);

    timelinesDiv.appendChild(dayDiv);
  }
}

// Create a single timeline for a day with all ranges
function createDayTimeline(dayOfWeek, ranges) {
  const containerDiv = document.createElement("div");
  containerDiv.className = "moznostiPlus-ranges-container";

  const labelsDiv = document.createElement("div");
  labelsDiv.className = "moznostiPlus-range-labels";
  labelsDiv.innerHTML = `
    <span>4:30</span>
    <span>23:00</span>
  `;
  containerDiv.appendChild(labelsDiv);

  const sliderContainer = document.createElement("div");
  sliderContainer.className = "moznostiPlus-slider-container";

  const track = document.createElement("div");
  track.className = "moznostiPlus-slider-track";

  // Create fill and handles for each range
  ranges.forEach((range, rangeIndex) => {
    const fill = document.createElement("div");
    fill.className = "moznostiPlus-slider-fill";
    fill.setAttribute("data-range", rangeIndex);
    track.appendChild(fill);

    const handleFrom = document.createElement("div");
    handleFrom.className = "moznostiPlus-slider-handle";
    handleFrom.setAttribute("data-type", "from");
    handleFrom.setAttribute("data-range", rangeIndex);
    handleFrom.title = `Interval ${rangeIndex + 1} - Od`;

    const handleTo = document.createElement("div");
    handleTo.className = "moznostiPlus-slider-handle";
    handleTo.setAttribute("data-type", "to");
    handleTo.setAttribute("data-range", rangeIndex);
    handleTo.title = `Interval ${rangeIndex + 1} - Do`;

    track.appendChild(handleFrom);
    track.appendChild(handleTo);
  });

  sliderContainer.appendChild(track);
  containerDiv.appendChild(sliderContainer);

  // Times display
  const timesDiv = document.createElement("div");
  timesDiv.className = "moznostiPlus-ranges-times-list";

  ranges.forEach((range, rangeIndex) => {
    const rangeTimeDiv = document.createElement("div");
    rangeTimeDiv.className = "moznostiPlus-range-time-item";

    const timeFromSpan = document.createElement("span");
    timeFromSpan.id = `time-from-${dayOfWeek}-${rangeIndex}`;
    timeFromSpan.className = "moznostiPlus-time-badge";
    timeFromSpan.textContent = TIME_SLOTS[range.from];

    const separatorSpan = document.createElement("span");
    separatorSpan.textContent = " - ";

    const timeToSpan = document.createElement("span");
    timeToSpan.id = `time-to-${dayOfWeek}-${rangeIndex}`;
    timeToSpan.className = "moznostiPlus-time-badge";
    timeToSpan.textContent = TIME_SLOTS[range.to];

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "moznostiPlus-range-small-delete";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", () => removeTimeRange(dayOfWeek, rangeIndex));

    rangeTimeDiv.appendChild(timeFromSpan);
    rangeTimeDiv.appendChild(separatorSpan);
    rangeTimeDiv.appendChild(timeToSpan);
    rangeTimeDiv.appendChild(deleteBtn);

    timesDiv.appendChild(rangeTimeDiv);
  });

  containerDiv.appendChild(timesDiv);

  // Setup slider interactions for all ranges on this track
  setupDayTimelineDrag(dayOfWeek, track, ranges);

  return containerDiv;
}

// Setup draggable slider handles for entire day timeline
function setupDayTimelineDrag(dayOfWeek, track, ranges) {
  const maxSlots = TIME_SLOTS.length - 1;

  function updateHandlePositions() {
    ranges.forEach((range, rangeIndex) => {
      const fill = track.querySelector(`[data-range="${rangeIndex}"][class*="slider-fill"]`);
      const handleFrom = track.querySelector(`[data-range="${rangeIndex}"][data-type="from"]`);
      const handleTo = track.querySelector(`[data-range="${rangeIndex}"][data-type="to"]`);

      if (fill && handleFrom && handleTo) {
        const fromPercent = (range.from / maxSlots) * 100;
        const toPercent = (range.to / maxSlots) * 100;

        handleFrom.style.left = fromPercent + "%";
        handleTo.style.left = toPercent + "%";

        fill.style.left = fromPercent + "%";
        fill.style.width = (toPercent - fromPercent) + "%";

        const timeFromSpan = document.getElementById(`time-from-${dayOfWeek}-${rangeIndex}`);
        const timeToSpan = document.getElementById(`time-to-${dayOfWeek}-${rangeIndex}`);

        if (timeFromSpan) timeFromSpan.textContent = TIME_SLOTS[range.from];
        if (timeToSpan) timeToSpan.textContent = TIME_SLOTS[range.to];
      }
    });
  }

  // Initial positioning
  updateHandlePositions();

  // Make all handles draggable
  const allHandles = track.querySelectorAll(".moznostiPlus-slider-handle");
  allHandles.forEach((handle) => {
    let isDragging = false;

    handle.addEventListener("mousedown", () => {
      isDragging = true;
      handle.classList.add("dragging");
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const rect = track.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const slotIndex = Math.round((percent / 100) * maxSlots);

      const rangeIndex = parseInt(handle.getAttribute("data-range"));
      const handleType = handle.getAttribute("data-type");
      const range = ranges[rangeIndex];

      if (handleType === "from") {
        if (slotIndex < range.to) {
          range.from = slotIndex;
          updateHandlePositions();
        }
      } else {
        if (slotIndex > range.from) {
          range.to = slotIndex;
          updateHandlePositions();
        }
      }
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        handle.classList.remove("dragging");
        saveWorkAvailability();
      }
    });
  });
}

// Expose interface functions globally
window.moznostiPlusInterface = {
  addTimeRange,
  removeTimeRange,
  updateTimeRange,
  createPreset,
  deletePreset,
  switchPreset,
  renamePreset,
  getAvailability: () => getActivePresetData(),
  getTimeSlots: () => TIME_SLOTS,
  getAllPresets: () => presetsData.presets,
  getActivePresetId: () => presetsData.activePresetId
};

// Initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", createInterfaceDiv);
} else {
  createInterfaceDiv();
}

function loadLabels() {
  const labels = Array.from(document.getElementsByTagName("label"));

  labels.filter((l) => {
    console.log(l.getAttribute("for"))
    return typeof l.getAttribute("for") == "string" && l.getAttribute("for").substring(0, 9) == "labelauty";
  });

  for (const l of labels) {
    l.style.backgroundColor = "red";
  }
}

setInterval(() => {
  console.log(window.moznostiPlusInterface.getAvailability());
  console.log(window.moznostiPlusInterface.getTimeSlots());
}, 5000);