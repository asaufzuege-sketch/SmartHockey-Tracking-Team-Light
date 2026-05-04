// Stats Table Module mit teamspezifischer Datenverwaltung

App.statsTable = {
  container: null,
  dragState: {
    isDragging: false,
    draggedRow: null,
    longPressTimer: null,
    startY: 0,
    currentY: 0,
    initialMouseY: 0,
    yOffset: 0,
    draggedElement: null,
    currentDragHandle: null
  },
  // Store references to document-level event handlers for cleanup
  documentHandlersAttached: false,
  
  // Constants for double-tap detection
  DOUBLE_TAP_DELAY: 300,
  
  init() {
    this.container = document.getElementById("statsContainer");
    
    // Event Listener für Buttons
    document.getElementById("exportBtn")?.addEventListener("click", () => {
      App.csvHandler.exportStats();
    });
    
    document.getElementById("resetBtn")?.addEventListener("click", () => {
      this.reset();
    });
  },
  
  render() {
    if (!this.container) return;
    
    // Load team-specific player order from localStorage before rendering
    this.loadTeamSpecificData();
    
    this.container.innerHTML = "";
    
    const table = document.createElement("table");
    table.className = "stats-table";
    
    // Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = "<th>#</th><th>Player</th>" + 
      App.data.categories.map(c => `<th>${App.helpers.escapeHtml(c)}</th>`).join("") + 
      "<th>Time</th>";
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Body - Filter out goalies (players with position = "G")
    const tbody = document.createElement("tbody");
    tbody.id = "stats-tbody";
    
    const playersToRender = App.data.selectedPlayers.filter(p => p.position !== "G");
    
    playersToRender.forEach((p, idx) => {
      const tr = document.createElement("tr");
      tr.className = (idx % 2 === 0 ? "even-row" : "odd-row");
      tr.dataset.player = p.name;
      // Store the REAL index from the full App.data.selectedPlayers array, not the filtered index
      const realIndex = App.data.selectedPlayers.findIndex(player => player.name === p.name);
      tr.dataset.playerIndex = realIndex;
      
      // Nummer
      const numTd = document.createElement("td");
      numTd.innerHTML = `<strong>${App.helpers.escapeHtml(p.num || "-")}</strong>`;
      tr.appendChild(numTd);
      
      // Name (clickbar für Timer + Drag Handle)
      const nameTd = document.createElement("td");
      nameTd.style.cssText = "text-align:left;padding-left:12px;cursor:pointer;white-space:nowrap;position:relative;";
      nameTd.innerHTML = `<span class=\"drag-handle\">⋮⋮</span><strong>${App.helpers.escapeHtml(p.name)}</strong>`;
      tr.appendChild(nameTd);
      
      // Kategorien
      App.data.categories.forEach(c => {
        const td = document.createElement("td");
        const val = App.data.statsData[p.name]?.[c] || 0;
        const colors = App.helpers.getColorStyles();
        
        td.textContent = val;
        td.dataset.player = p.name;
        td.dataset.cat = c;
        td.style.color = val > 0 ? colors.pos : val < 0 ? colors.neg : colors.zero;
        tr.appendChild(td);
      });
      
      // Ice Time
      const timeTd = document.createElement("td");
      timeTd.className = "ice-time-cell";
      const sec = App.data.playerTimes[p.name] || 0;
      timeTd.textContent = App.helpers.formatTimeMMSS(sec);
      timeTd.dataset.player = p.name;
      tr.appendChild(timeTd);
      
      // Timer Toggle auf Name-Click (aber nicht auf drag handle)
      this.attachTimerToggle(nameTd, tr, timeTd, p.name);
      
      // Time Cell Click Handlers (+10s single click, -10s double click)
      this.attachTimeClickHandlers(timeTd, p.name);
      
      // Drag Handlers nur auf das Drag Handle
      const dragHandle = nameTd.querySelector('.drag-handle');
      this.attachDragHandlers(tr, dragHandle);
      
      tbody.appendChild(tr);
    });
    
    // Totals Row
    const totalTr = document.createElement("tr");
    totalTr.className = "total-row";
    
    const emptyTd = document.createElement("td");
    emptyTd.textContent = "";
    totalTr.appendChild(emptyTd);
    
    const labelTd = document.createElement("td");
    labelTd.textContent = `Total (${playersToRender.length})`;
    labelTd.style.textAlign = "left";
    labelTd.style.fontWeight = "700";
    totalTr.appendChild(labelTd);
    
    App.data.categories.forEach(c => {
      const td = document.createElement("td");
      td.className = "total-cell";
      td.dataset.cat = c;
      td.textContent = "0";
      
      // Teamspezifische Gegner-Schüsse aus LocalStorage wiederherstellen
      if (c === "Shot") {
        const teamId = App.helpers.getCurrentTeamId();
        const savedOppShots = AppStorage.getItem(`opponentShots_${teamId}`);
        if (savedOppShots) {
          td.dataset.opp = savedOppShots;
        } else {
          td.dataset.opp = "0";
        }
      }
      
      totalTr.appendChild(td);
    });
    
    const timeTotal = document.createElement("td");
    timeTotal.className = "total-cell";
    timeTotal.dataset.cat = "Time";
    totalTr.appendChild(timeTotal);
    
    tbody.appendChild(totalTr);
    table.appendChild(tbody);
    this.container.appendChild(table);
    
    // Click handlers für Werte
    this.attachValueClickHandlers();
    
    // Update Totals & Colors
    this.updateTotals();
    this.updateIceTimeColors();
    
    // Timer visuals wiederherstellen
    App.updateTimerVisuals();
  },
  
  attachDragHandlers(row, dragHandle) {
    if (!dragHandle) return;
    
    const startDrag = (e) => {
      if (this.dragState.isDragging) return;
      
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      this.dragState.startY = clientY;
      this.dragState.hasMoved = false;
      
      this.dragState.longPressTimer = setTimeout(() => {
        if (!this.dragState.hasMoved && !this.dragState.isDragging) {
          this.dragState.currentDragHandle = dragHandle; // Set just before dragging starts
          this.startDragging(row);
          dragHandle.style.cursor = 'grabbing';
          
          // Haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          
          console.log('Long press detected - drag started for:', row.dataset.player);
        }
      }, 600); // 600ms für Long Press
    };
    
    // Attach only local events to drag handle
    dragHandle.addEventListener('mousedown', startDrag);
    dragHandle.addEventListener('touchstart', startDrag, { passive: false });
    
    // Attach document-level handlers only once
    if (!this.documentHandlersAttached) {
      this.attachGlobalDragHandlers();
      this.documentHandlersAttached = true;
    }
  },
  
  attachGlobalDragHandlers() {
    // Global move handler
    const globalMoveDrag = (e) => {
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      const deltaY = Math.abs(clientY - this.dragState.startY);
      
      if (deltaY > 10) {
        this.dragState.hasMoved = true;
        if (this.dragState.longPressTimer) {
          clearTimeout(this.dragState.longPressTimer);
          this.dragState.longPressTimer = null;
        }
      }
      
      if (this.dragState.isDragging) {
        e.preventDefault();
        this.handleDragMove(clientY);
      }
    };
    
    // Global end handler
    const globalEndDrag = (e) => {
      if (this.dragState.longPressTimer) {
        clearTimeout(this.dragState.longPressTimer);
        this.dragState.longPressTimer = null;
      }
      
      if (this.dragState.isDragging) {
        this.endDragging();
        if (this.dragState.currentDragHandle) {
          this.dragState.currentDragHandle.style.cursor = 'grab';
        }
      }
      
      this.dragState.hasMoved = false;
    };
    
    // Attach to document - these will persist across re-renders
    document.addEventListener('mousemove', globalMoveDrag);
    document.addEventListener('mouseup', globalEndDrag);
    document.addEventListener('touchmove', globalMoveDrag, { passive: false });
    document.addEventListener('touchend', globalEndDrag, { passive: false });
    document.addEventListener('touchcancel', globalEndDrag, { passive: false });
  },
  
  startDragging(row) {
    this.dragState.isDragging = true;
    this.dragState.draggedRow = row;
    
    // Visual feedback
    row.style.backgroundColor = 'rgba(68, 187, 145, 0.3)';
    row.style.transform = 'scale(1.02)';
    row.style.zIndex = '1000';
    row.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    row.style.transition = 'transform 0.2s ease';
    
    console.log('Dragging started for player:', row.dataset.player);
  },
  
  handleDragMove(clientY) {
    if (!this.dragState.isDragging) return;
    
    const tbody = document.getElementById('stats-tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.children).filter(r => 
      !r.classList.contains('total-row') && r !== this.dragState.draggedRow
    );
    
    let targetRow = null;
    let targetIndex = -1;
    
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      const rowCenter = rect.top + rect.height / 2;
      
      if (clientY < rowCenter) {
        targetRow = rows[i];
        targetIndex = i;
        break;
      }
    }
    
    if (targetRow) {
      tbody.insertBefore(this.dragState.draggedRow, targetRow);
    } else {
      // Insert at end (before total row)
      const totalRow = tbody.querySelector('.total-row');
      tbody.insertBefore(this.dragState.draggedRow, totalRow);
    }
  },
  
  endDragging() {
    if (!this.dragState.isDragging || !this.dragState.draggedRow) return;
    
    const row = this.dragState.draggedRow;
    
    // Remove visual feedback
    row.style.backgroundColor = '';
    row.style.transform = '';
    row.style.zIndex = '';
    row.style.boxShadow = '';
    row.style.transition = '';
    
    // Get the player names in their new visual order (excluding the total row)
    const tbody = document.getElementById('stats-tbody');
    const allRows = Array.from(tbody.children).filter(r => !r.classList.contains('total-row'));
    const newVisualOrder = allRows.map(r => r.dataset.player);
    
    // Separate goalies and non-goalies
    const goalies = App.data.selectedPlayers.filter(p => p.position === "G");
    
    // Create a name-to-player lookup map for O(n) performance
    const playerMap = new Map();
    App.data.selectedPlayers.forEach(p => playerMap.set(p.name, p));
    
    // Reconstruct non-goalies in the new visual order
    const nonGoaliesInNewOrder = newVisualOrder
      .map(name => playerMap.get(name))
      .filter(p => p !== undefined);
    
    // Combine: goalies first, then non-goalies in new order
    App.data.selectedPlayers = [...goalies, ...nonGoaliesInNewOrder];
    
    // Save and re-render
    this.saveToStorage();
    this.render();
    
    // Reset state
    this.dragState.isDragging = false;
    this.dragState.draggedRow = null;
    
    console.log('Dragging ended');
  },
  
  updatePlayerOrder(oldIndex, newIndex) {
    if (oldIndex < 0 || oldIndex >= App.data.selectedPlayers.length) return;
    if (newIndex < 0 || newIndex >= App.data.selectedPlayers.length) return;
    
    // Move player in array
    const player = App.data.selectedPlayers.splice(oldIndex, 1)[0];
    App.data.selectedPlayers.splice(newIndex, 0, player);
    
    console.log(`Player moved from index ${oldIndex} to ${newIndex}`);
    this.saveToStorage();
    this.render();
  },

  loadTeamSpecificData() {
    // Player order is already persisted in App.data.selectedPlayers via saveSelectedPlayers.
    // This hook is kept for forward-compatibility / future team-specific data loading.
  },

  saveToStorage() {
    App.storage.saveSelectedPlayers();
  },

  reset() {
    if (!confirm("Reset all game statistics and ice times?")) return;

    const teamId = App.helpers.getCurrentTeamId();
    App.data.statsData = {};
    App.data.playerTimes = {};

    // Stop all running timers
    Object.values(App.data.activeTimers).forEach(t => { if (t) clearInterval(t); });
    App.data.activeTimers = {};

    AppStorage.setItem(`statsData_${teamId}`, "{}");
    AppStorage.setItem(`playerTimes_${teamId}`, "{}");
    AppStorage.setItem(`activeTimerPlayers`, "[]");

    this.render();
  },

  attachTimerToggle(nameTd, tr, timeTd, playerName) {
    const doToggle = (e) => {
      // Ignore clicks on the drag handle
      if (e.target.classList.contains("drag-handle") || e.target.closest?.(".drag-handle")) return;

      if (App.data.activeTimers[playerName]) {
        clearInterval(App.data.activeTimers[playerName]);
        delete App.data.activeTimers[playerName];
        tr.style.background = "";
        nameTd.style.background = "";
        App.saveActiveTimersState();
      } else {
        App.startPlayerTimer(playerName);
      }
    };

    nameTd.addEventListener("click", doToggle);
    nameTd.addEventListener("touchend", (e) => {
      if (e.target.classList.contains("drag-handle") || e.target.closest?.(".drag-handle")) return;
      e.preventDefault();
      doToggle(e);
    }, { passive: false });
  },

  attachTimeClickHandlers(timeTd, playerName) {
    const state = { lastTap: 0, tapTimer: null };

    const handleTap = (isDouble) => {
      if (isDouble) {
        App.data.playerTimes[playerName] = Math.max(0, (App.data.playerTimes[playerName] || 0) - 10);
      } else {
        App.data.playerTimes[playerName] = (App.data.playerTimes[playerName] || 0) + 10;
      }
      App.storage.savePlayerTimes();
      timeTd.textContent = App.helpers.formatTimeMMSS(App.data.playerTimes[playerName]);
      this.updateIceTimeColors();
    };

    // Mobile touch: single tap = +10s, double tap = -10s
    timeTd.addEventListener("touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (state.lastTap > 0 && now - state.lastTap < this.DOUBLE_TAP_DELAY) {
        clearTimeout(state.tapTimer);
        state.tapTimer = null;
        state.lastTap = 0;
        handleTap(true);
        return;
      }
      state.lastTap = now;
      state.tapTimer = setTimeout(() => {
        state.tapTimer = null;
        state.lastTap = 0;
        handleTap(false);
      }, this.DOUBLE_TAP_DELAY);
    }, { passive: false });

    // Desktop: click = +10s, dblclick = -10s
    timeTd.addEventListener("click", (e) => {
      if (state.lastTap > 0 && Date.now() - state.lastTap < 500) return; // suppress after touch
      if (state.dblPending) return;
      state.dblPending = true;
      state.tapTimer = setTimeout(() => {
        state.dblPending = false;
        handleTap(false);
      }, this.DOUBLE_TAP_DELAY);
    });

    timeTd.addEventListener("dblclick", (e) => {
      if (state.tapTimer) { clearTimeout(state.tapTimer); state.tapTimer = null; }
      state.dblPending = false;
      handleTap(true);
    });
  },

  attachValueClickHandlers() {
    // --- Player stat cells ---
    const statCells = this.container.querySelectorAll("td[data-player][data-cat]");
    statCells.forEach(td => {
      const playerName = td.dataset.player;
      const cat = td.dataset.cat;
      const state = { lastTap: 0, tapTimer: null };

      const applyChange = (delta) => {
        if (!App.data.statsData[playerName]) App.data.statsData[playerName] = {};
        const oldVal = App.data.statsData[playerName][cat] || 0;
        let newVal = oldVal + delta;
        if (cat !== "+/-") newVal = Math.max(0, newVal);
        App.data.statsData[playerName][cat] = newVal;
        App.storage.saveStatsData();
        const colors = App.helpers.getColorStyles();
        td.textContent = newVal;
        td.style.color = newVal > 0 ? colors.pos : newVal < 0 ? colors.neg : colors.zero;
        this.updateTotals();

        // Trigger Goal Map workflow on +1 for Goals or Shot
        if (delta === 1 && (cat === "Goals" || cat === "Shot")) {
          App.startGoalMapWorkflow(playerName, cat === "Goals" ? "goal" : "shot");
        }
      };

      // Mobile: single tap = +1, double tap = -1
      td.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const now = Date.now();
        if (state.lastTap > 0 && now - state.lastTap < this.DOUBLE_TAP_DELAY) {
          clearTimeout(state.tapTimer);
          state.tapTimer = null;
          state.lastTap = 0;
          applyChange(-1);
          return;
        }
        state.lastTap = now;
        state.tapTimer = setTimeout(() => {
          state.tapTimer = null;
          state.lastTap = 0;
          applyChange(1);
        }, this.DOUBLE_TAP_DELAY);
      }, { passive: false });

      // Desktop: click = +1, dblclick = -1
      td.addEventListener("click", (e) => {
        if (state.lastTap > 0 && Date.now() - state.lastTap < 500) return;
        if (state.dblPending) return;
        state.dblPending = true;
        state.tapTimer = setTimeout(() => {
          state.dblPending = false;
          applyChange(1);
        }, this.DOUBLE_TAP_DELAY);
      });

      td.addEventListener("dblclick", (e) => {
        if (state.tapTimer) { clearTimeout(state.tapTimer); state.tapTimer = null; }
        state.dblPending = false;
        applyChange(-1);
      });
    });

    // --- Opponent shots: total row Shot cell ---
    const shotTotalCell = this.container.querySelector(".total-cell[data-cat='Shot']");
    if (shotTotalCell) {
      const oppState = { lastTap: 0, tapTimer: null };
      const teamId = App.helpers.getCurrentTeamId();

      const applyOpp = (delta) => {
        const current = Number(shotTotalCell.dataset.opp) || 0;
        const next = Math.max(0, current + delta);
        shotTotalCell.dataset.opp = String(next);
        AppStorage.setItem(`opponentShots_${teamId}`, String(next));
        this.updateTotals();
      };

      shotTotalCell.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const now = Date.now();
        if (oppState.lastTap > 0 && now - oppState.lastTap < this.DOUBLE_TAP_DELAY) {
          clearTimeout(oppState.tapTimer);
          oppState.tapTimer = null;
          oppState.lastTap = 0;
          applyOpp(-1);
          return;
        }
        oppState.lastTap = now;
        oppState.tapTimer = setTimeout(() => {
          oppState.tapTimer = null;
          oppState.lastTap = 0;
          applyOpp(1);
        }, this.DOUBLE_TAP_DELAY);
      }, { passive: false });

      shotTotalCell.addEventListener("click", (e) => {
        if (oppState.lastTap > 0 && Date.now() - oppState.lastTap < 500) return;
        if (oppState.dblPending) return;
        oppState.dblPending = true;
        oppState.tapTimer = setTimeout(() => {
          oppState.dblPending = false;
          applyOpp(1);
        }, this.DOUBLE_TAP_DELAY);
      });

      shotTotalCell.addEventListener("dblclick", (e) => {
        if (oppState.tapTimer) { clearTimeout(oppState.tapTimer); oppState.tapTimer = null; }
        oppState.dblPending = false;
        applyOpp(-1);
      });
    }
  },

  updateTotals() {
    if (!this.container) return;

    const fieldPlayers = App.data.selectedPlayers.filter(p => p.position !== "G" && !p.isGoalie);

    App.data.categories.forEach(c => {
      const totalCell = this.container.querySelector(`.total-cell[data-cat="${c}"]`);
      if (!totalCell) return;

      const total = fieldPlayers.reduce((sum, p) => sum + (App.data.statsData[p.name]?.[c] || 0), 0);

      if (c === "Shot") {
        const opp = Number(totalCell.dataset.opp) || 0;
        totalCell.textContent = `${total} / ${opp}`;
      } else {
        totalCell.textContent = total;
      }
    });

    // Ice time total
    const timeTotal = this.container.querySelector(".total-cell[data-cat='Time']");
    if (timeTotal) {
      const totalSec = fieldPlayers.reduce((sum, p) => sum + (App.data.playerTimes[p.name] || 0), 0);
      timeTotal.textContent = App.helpers.formatTimeMMSS(totalSec);
    }
  },

  updateIceTimeColors() {
    if (!this.container) return;

    // Identify goalies from App.data.selectedPlayers
    const goalieNames = new Set(
      App.data.selectedPlayers
        .filter(p => p.position === "G" || p.isGoalie)
        .map(p => p.name)
    );

    // Collect all ice-time cells in the DOM
    const allCells = Array.from(this.container.querySelectorAll(".ice-time-cell[data-player]"));

    // Separate field-player cells from goalie cells.
    // Goalie cells are reset to neutral background so they are never colored.
    const fieldCells = [];
    allCells.forEach(cell => {
      if (goalieNames.has(cell.dataset.player)) {
        // Reset any residual coloring on goalie cells
        cell.style.background = "";
        cell.style.backgroundColor = "";
      } else {
        fieldCells.push(cell);
      }
    });

    const n = fieldCells.length;
    if (n === 0) return;

    // Build sorted array of { cell, seconds } for field players only
    const entries = fieldCells.map(cell => {
      const secs = App.data.playerTimes[cell.dataset.player] || 0;
      return { cell, secs };
    });

    // Sort ascending by ice time
    const sorted = entries.slice().sort((a, b) => a.secs - b.secs);

    // Determine top-N and bottom-N (floor(n/2) each)
    const half = Math.floor(n / 2);

    // Clear all field-player ice-time backgrounds first
    fieldCells.forEach(cell => {
      cell.style.background = "";
      cell.style.backgroundColor = "";
    });

    if (half === 0) return;

    const bottomColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--ice-bottom").trim() || "#ff4c4c";
    const topColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--ice-top").trim() || "#00c06f";

    // Bottom-N (lowest ice times) → red
    for (let i = 0; i < half; i++) {
      sorted[i].cell.style.backgroundColor = bottomColor;
    }

    // Top-N (highest ice times) → green
    for (let i = n - half; i < n; i++) {
      sorted[i].cell.style.backgroundColor = topColor;
    }
  }
};