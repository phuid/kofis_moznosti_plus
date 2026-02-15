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

// Data structure for storing work availability
// weeklyAvailability[dayOfWeek] = [{from: slotIndex, to: slotIndex}, ...]
let weeklyAvailability = Array(7).fill(null).map(() => []);

// Load data from localStorage if exists
function loadWorkAvailability() {
  const saved = localStorage.getItem("moznostiPlus_work_availability");
  if (saved) {
    weeklyAvailability = JSON.parse(saved);
  } else {
    // Initialize with empty arrays
    weeklyAvailability = Array(7).fill(null).map(() => []);
  }
}

// Save data to localStorage
function saveWorkAvailability() {
  localStorage.setItem("moznostiPlus_work_availability", JSON.stringify(weeklyAvailability));
}

// Add new time range for a day
function addTimeRange(dayOfWeek) {
  if (!weeklyAvailability[dayOfWeek]) {
    weeklyAvailability[dayOfWeek] = [];
  }
  // Default: first half of the day
  weeklyAvailability[dayOfWeek].push({
    from: 0,
    to: 18
  });
  saveWorkAvailability();
  renderTimelines();
}

// Remove time range for a day
function removeTimeRange(dayOfWeek, rangeIndex) {
  if (weeklyAvailability[dayOfWeek]) {
    weeklyAvailability[dayOfWeek].splice(rangeIndex, 1);
    saveWorkAvailability();
    renderTimelines();
  }
}

// Update time range
function updateTimeRange(dayOfWeek, rangeIndex, from, to) {
  if (from < to && weeklyAvailability[dayOfWeek] && weeklyAvailability[dayOfWeek][rangeIndex]) {
    weeklyAvailability[dayOfWeek][rangeIndex] = { from, to };
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
        <button id="moznostiPlus-toggle-btn">−</button>
      </div>
      Nastavit týdenní preset
      <div id="moznostiPlus-timelines-section">
        <div id="moznostiPlus-timelines"></div>
      </div>
    </div>
  `;

  document.body.appendChild(interfaceDiv);
  applyInterfaceStyles();
  loadWorkAvailability();
  renderTimelines();
  attachEventListeners();
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
      margin-bottom: 12px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 8px;
    }
    
    #moznostiPlus-header h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
    }
    
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
    
    #moznostiPlus-toggle-btn:hover {
      background: #e0e0e0;
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
  const toggleBtn = document.getElementById("moznostiPlus-toggle-btn");
  const timelinesSection = document.getElementById("moznostiPlus-timelines-section");

  if (!toggleBtn || !timelinesSection) return;

  let isExpanded = true;
  toggleBtn.addEventListener("click", () => {
    isExpanded = !isExpanded;
    timelinesSection.classList.toggle("hidden");
    toggleBtn.textContent = isExpanded ? "−" : "+";
  });
}

// Render the weekly timelines with sliders
function renderTimelines() {
  const timelinesDiv = document.getElementById("moznostiPlus-timelines");
  if (!timelinesDiv) return;

  timelinesDiv.innerHTML = "";

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "moznostiPlus-day";

    const labelDiv = document.createElement("div");
    labelDiv.className = "moznostiPlus-day-label";
    labelDiv.textContent = DAYS_OF_WEEK[dayOfWeek];
    dayDiv.appendChild(labelDiv);

    // Create single timeline for the day
    const ranges = weeklyAvailability[dayOfWeek] || [];
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
  getAvailability: () => weeklyAvailability,
  getTimeSlots: () => TIME_SLOTS
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

