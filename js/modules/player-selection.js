// Player Selection Modul


App.playerSelection = {
  container: null,
  saveTimeout: null,
  
  init() {
    this.container = document.getElementById("playerList");
    
    if (this.container) {
      this.render();
    }
    
    // Event Listener für Game Center Button - speichert und navigiert zur Stats-Seite
    document.getElementById("gameDataBtn")?.addEventListener("click", () => {
      this.handleConfirmAndNavigate();
    });
    
    // Event Listener für Line Up Button - navigiert zur Line Up Seite
    document.getElementById("lineupBtn")?.addEventListener("click", () => {
      this.handleConfirmAndNavigateToLineUp();
    });
    
    // Event Listener für Reset Button - löscht alle Spieler und Goalies
    document.getElementById("resetPlayersBtn")?.addEventListener("click", () => {
      if (confirm("Alle Spieler und Goalies zurücksetzen?")) {
        App.data.selectedPlayers = [];
        App.data.goalies = [];
        // LocalStorage auch löschen - use consistent helper
        const teamId = App.helpers.getCurrentTeamId();
        if (teamId) {
          AppStorage.removeItem(`selectedPlayers_${teamId}`);
          AppStorage.removeItem(`playerSelectionData_${teamId}`);
        }
        this.render();
      }
    });
  },
  
  handleConfirmAndNavigate() {
    // Spielerdaten speichern (wie bisher der Bestätigen-Button)
    this.handleConfirm();
  },
  
  handleConfirmAndNavigateToLineUp() {
    // Spielerdaten speichern und zur Line Up Seite navigieren
    this.saveCurrentState();
    
    // Update selectedPlayers
    App.data.selectedPlayers = [];
    const items = this.container.querySelectorAll("li");
    
    items.forEach((li) => {
      const checkbox = li.querySelector(".player-checkbox");
      const numInput = li.querySelector(".num-input");
      const nameInput = li.querySelector(".name-input");
      const posSelect = li.querySelector(".pos-select");
      const posFixed = li.querySelector(".pos-fixed");
      
      if (checkbox && checkbox.checked && nameInput && nameInput.value.trim() !== "") {
        App.data.selectedPlayers.push({
          num: numInput ? numInput.value.trim() : "",
          name: nameInput.value.trim(),
          position: posFixed ? "G" : (posSelect ? posSelect.value : "")
        });
      }
    });
    
    App.storage.saveSelectedPlayers();
    
    // Navigate to Line Up page
    if (typeof App.showPage === 'function') {
      App.showPage("lineUp");
    } else {
      document.getElementById("playerSelectionPage").style.display = "none";
      document.getElementById("lineUpPage").style.display = "";
    }
    
    // Render Line Up if available
    if (App.lineUp && typeof App.lineUp.render === 'function') {
      App.lineUp.loadData();
      App.lineUp.render();
    }
  },
  
  getPlayers() {
    // Get current team info
    const currentTeamId = App.helpers.getCurrentTeamId();
    
    // Load saved player data for the team
    const savedPlayersKey = `playerSelectionData_${currentTeamId}`;
    let savedPlayers = [];
    try {
      savedPlayers = JSON.parse(AppStorage.getItem(savedPlayersKey) || "[]");
    } catch (e) {
      savedPlayers = [];
    }
    
    const players = [];
    
    // Add 3 goalie slots at the top
    for (let i = 0; i < 3; i++) {
      const saved = savedPlayers[i];
      players.push({
        number: saved?.number || "",
        name: saved?.name || "",
        position: "G",  // Fixed position for goalies
        active: saved?.active || false,
        isGoalie: true
      });
    }
    
    // 25 regular player slots after 3 goalie slots
    for (let i = 0; i < 25; i++) {
      const saved = savedPlayers[3 + i];
      
      players.push({
        number: saved?.number || "",
        name: saved?.name || "",
        position: saved?.position || "",
        active: saved?.active || false,
        isGoalie: false
      });
    }
    return players;
  },
  
  render() {
    if (!this.container) return;
    
    const players = this.getPlayers();
    
    this.container.innerHTML = players.map((player, i) => {
      if (player.isGoalie) {
        // Goalie slot with fixed "G" position and green border
        return `
          <li class="goalie-slot">
            <input type="checkbox" 
                   ${player.active ? 'checked' : ''} 
                   data-index="${i}" 
                   class="player-checkbox">
            <input type="text" 
                   class="num-input" 
                   placeholder="Nr." 
                   value="${App.helpers.escapeHtml(player.number || '')}" 
                   data-index="${i}" 
                   data-field="number">
            <input type="text" 
                   class="name-input" 
                   placeholder="Enter goalie name" 
                   value="${App.helpers.escapeHtml(player.name || '')}" 
                   data-index="${i}" 
                   data-field="name">
            <div class="pos-fixed">G</div>
          </li>
        `;
      } else {
        // Regular player slot with position dropdown
        return `
          <li>
            <input type="checkbox" 
                   ${player.active ? 'checked' : ''} 
                   data-index="${i}" 
                   class="player-checkbox">
            <input type="text" 
                   class="num-input" 
                   placeholder="Nr." 
                   value="${App.helpers.escapeHtml(player.number || '')}" 
                   data-index="${i}" 
                   data-field="number">
            <input type="text" 
                   class="name-input" 
                   placeholder="Enter player name" 
                   value="${App.helpers.escapeHtml(player.name || '')}" 
                   data-index="${i}" 
                   data-field="name">
            <select class="pos-select" data-index="${i}" data-field="position">
              <option value="" disabled ${!player.position ? 'selected' : ''}>Pos.</option>
              <option value="C" ${player.position === 'C' ? 'selected' : ''}>Center</option>
              <option value="W" ${player.position === 'W' ? 'selected' : ''}>Wing</option>
              <option value="D" ${player.position === 'D' ? 'selected' : ''}>Defense</option>
            </select>
          </li>
        `;
      }
    }).join('');
    
    // Event Listeners hinzufügen
    this.attachEventListeners();
  },
  
  attachEventListeners() {
    if (!this.container) return;
    
    // Combined change/input event with debouncing for efficient localStorage writes
    this.container.addEventListener("change", (e) => {
      this.debouncedSave();
    });
    
    this.container.addEventListener("input", (e) => {
      if (e.target.matches(".num-input, .name-input")) {
        this.debouncedSave();
      }
    });
  },
  
  debouncedSave() {
    // Cancel pending save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    // Debounce: save after 300ms of no input
    this.saveTimeout = setTimeout(() => {
      this.saveCurrentState();
    }, 300);
  },
  
  saveCurrentState() {
    const currentTeamId = App.helpers.getCurrentTeamId();
    const savedPlayersKey = `playerSelectionData_${currentTeamId}`;

    // Load previously saved player list for rename detection
    let previousPlayers = [];
    try {
      previousPlayers = JSON.parse(AppStorage.getItem(savedPlayersKey) || "[]");
    } catch (e) {
      previousPlayers = [];
    }

    const items = this.container.querySelectorAll("li");
    const players = [];
    // Collect new state first (with DOM references for revert)
    const itemList = Array.from(items);

    itemList.forEach((li) => {
      const checkbox = li.querySelector(".player-checkbox");
      const numInput = li.querySelector(".num-input");
      const nameInput = li.querySelector(".name-input");
      const posSelect = li.querySelector(".pos-select");
      const posFixed = li.querySelector(".pos-fixed");

      players.push({
        number: numInput ? numInput.value.trim() : "",
        name: nameInput ? nameInput.value.trim() : "",
        position: posFixed ? "G" : (posSelect ? posSelect.value : ""),
        active: checkbox ? checkbox.checked : false
      });
    });

    // Load season and stats data once outside the loop (read-only for conflict checks)
    let seasonData = {};
    try {
      seasonData = JSON.parse(AppStorage.getItem(`seasonData_${currentTeamId}`) || "{}");
    } catch (e) { seasonData = {}; }
    let statsData = {};
    try {
      statsData = JSON.parse(AppStorage.getItem(`statsData_${currentTeamId}`) || "{}");
    } catch (e) { statsData = {}; }

    // Rename detection: compare by slot index
    for (let i = 0; i < players.length; i++) {
      const oldName = previousPlayers[i]?.name?.trim() || "";
      const newName = players[i].name;

      if (!oldName || !newName || oldName === newName) continue;

      // Pre-check 1: season-frozen – reject if oldName exists in seasonData
      if (Object.prototype.hasOwnProperty.call(seasonData, oldName)) {
        alert(`"${oldName}" wurde bereits in eine Saison exportiert und kann nicht umbenannt werden.`);
        // Revert the input field
        const li = itemList[i];
        const nameInput = li ? li.querySelector(".name-input") : null;
        if (nameInput) nameInput.value = oldName;
        players[i].name = oldName;
        continue;
      }

      // Pre-check 2: name conflict – reject if newName already exists
      const nameExistsInList = players.some((p, j) => j !== i && p.name && p.name === newName);
      const nameExistsInStats = Object.prototype.hasOwnProperty.call(statsData, newName);
      const nameExistsInSeason = Object.prototype.hasOwnProperty.call(seasonData, newName);

      if (nameExistsInList || nameExistsInStats || nameExistsInSeason) {
        alert(`"${newName}" existiert bereits. Bitte einen anderen Namen wählen.`);
        const li = itemList[i];
        const nameInput = li ? li.querySelector(".name-input") : null;
        if (nameInput) nameInput.value = oldName;
        players[i].name = oldName;
        continue;
      }

      // Migrate all storage keys for this rename
      this.migratePlayerName(oldName, newName, currentTeamId);
    }

    AppStorage.setItem(savedPlayersKey, JSON.stringify(players));
  },

  migratePlayerName(oldName, newName, teamId) {
    // --- lineUpData_normal, lineUpData_power, lineUpData_manuell: slot values ---
    ['normal', 'power', 'manuell'].forEach(mode => {
      const key = `lineUpData_${mode}_${teamId}`;
      try {
        const data = JSON.parse(AppStorage.getItem(key) || "{}");
        let changed = false;
        Object.keys(data).forEach(slot => {
          if (data[slot] === oldName) {
            data[slot] = newName;
            changed = true;
          }
        });
        if (changed) AppStorage.setItem(key, JSON.stringify(data));
      } catch (e) { /* skip on error */ }
    });

    // --- statsData: top-level key ---
    try {
      const data = JSON.parse(AppStorage.getItem(`statsData_${teamId}`) || "{}");
      if (Object.prototype.hasOwnProperty.call(data, oldName)) {
        data[newName] = data[oldName];
        delete data[oldName];
        AppStorage.setItem(`statsData_${teamId}`, JSON.stringify(data));
        // In-memory
        if (App.data.statsData && Object.prototype.hasOwnProperty.call(App.data.statsData, oldName)) {
          App.data.statsData[newName] = App.data.statsData[oldName];
          delete App.data.statsData[oldName];
        }
      }
    } catch (e) { /* skip */ }

    // --- playerTimes: top-level key ---
    try {
      const data = JSON.parse(AppStorage.getItem(`playerTimes_${teamId}`) || "{}");
      if (Object.prototype.hasOwnProperty.call(data, oldName)) {
        data[newName] = data[oldName];
        delete data[oldName];
        AppStorage.setItem(`playerTimes_${teamId}`, JSON.stringify(data));
        // In-memory
        if (App.data.playerTimes && Object.prototype.hasOwnProperty.call(App.data.playerTimes, oldName)) {
          App.data.playerTimes[newName] = App.data.playerTimes[oldName];
          delete App.data.playerTimes[oldName];
        }
      }
    } catch (e) { /* skip */ }

    // --- playersOut: array element ---
    try {
      const data = JSON.parse(AppStorage.getItem(`playersOut_${teamId}`) || "[]");
      const idx = data.indexOf(oldName);
      if (idx !== -1) {
        data[idx] = newName;
        AppStorage.setItem(`playersOut_${teamId}`, JSON.stringify(data));
        // In-memory
        if (App.lineUp && Array.isArray(App.lineUp.playersOut)) {
          const memIdx = App.lineUp.playersOut.indexOf(oldName);
          if (memIdx !== -1) App.lineUp.playersOut[memIdx] = newName;
        }
      }
    } catch (e) { /* skip */ }

    // --- playerOutSnapshots: top-level key + manuell sub-object values ---
    try {
      const data = JSON.parse(AppStorage.getItem(`playerOutSnapshots_${teamId}`) || "{}");
      let changed = false;
      // Capture keys before any mutation to avoid processing the renamed key twice
      const snapshotKeys = Object.keys(data);
      if (Object.prototype.hasOwnProperty.call(data, oldName)) {
        data[newName] = data[oldName];
        delete data[oldName];
        changed = true;
      }
      // Also rename any slot values inside manuell sub-objects (use captured keys)
      snapshotKeys.forEach(player => {
        // Skip the key that was just renamed (it is now stored under newName)
        const currentKey = player === oldName ? newName : player;
        if (data[currentKey] && data[currentKey].manuell) {
          Object.keys(data[currentKey].manuell).forEach(slot => {
            if (data[currentKey].manuell[slot] === oldName) {
              data[currentKey].manuell[slot] = newName;
              changed = true;
            }
          });
        }
      });
      if (changed) {
        AppStorage.setItem(`playerOutSnapshots_${teamId}`, JSON.stringify(data));
        // In-memory
        if (App.lineUp && App.lineUp.playerOutSnapshots) {
          if (Object.prototype.hasOwnProperty.call(App.lineUp.playerOutSnapshots, oldName)) {
            App.lineUp.playerOutSnapshots[newName] = App.lineUp.playerOutSnapshots[oldName];
            delete App.lineUp.playerOutSnapshots[oldName];
          }
          Object.keys(App.lineUp.playerOutSnapshots).forEach(player => {
            const snap = App.lineUp.playerOutSnapshots[player];
            if (snap && snap.manuell) {
              Object.keys(snap.manuell).forEach(slot => {
                if (snap.manuell[slot] === oldName) snap.manuell[slot] = newName;
              });
            }
          });
        }
      }
    } catch (e) { /* skip */ }

    // --- goalMapData: top-level key ---
    try {
      const data = JSON.parse(AppStorage.getItem(`goalMapData_${teamId}`) || "{}");
      if (Object.prototype.hasOwnProperty.call(data, oldName)) {
        data[newName] = data[oldName];
        delete data[oldName];
        AppStorage.setItem(`goalMapData_${teamId}`, JSON.stringify(data));
        // In-memory
        if (App.data.goalMapData && Object.prototype.hasOwnProperty.call(App.data.goalMapData, oldName)) {
          App.data.goalMapData[newName] = App.data.goalMapData[oldName];
          delete App.data.goalMapData[oldName];
        }
      }
    } catch (e) { /* skip */ }

    // --- goalMapMarkers: marker.player field ---
    try {
      const data = JSON.parse(AppStorage.getItem(`goalMapMarkers_${teamId}`) || "null");
      if (Array.isArray(data)) {
        let changed = false;
        data.forEach(boxMarkers => {
          if (Array.isArray(boxMarkers)) {
            boxMarkers.forEach(marker => {
              if (marker && marker.player === oldName) {
                marker.player = newName;
                changed = true;
              }
            });
          }
        });
        if (changed) AppStorage.setItem(`goalMapMarkers_${teamId}`, JSON.stringify(data));
      }
    } catch (e) { /* skip */ }

    // --- goalMapPlayerFilter: string ---
    try {
      const val = AppStorage.getItem(`goalMapPlayerFilter_${teamId}`);
      if (val === oldName) AppStorage.setItem(`goalMapPlayerFilter_${teamId}`, newName);
    } catch (e) { /* skip */ }

    // --- seasonMapPlayerFilter: string ---
    try {
      const val = AppStorage.getItem(`seasonMapPlayerFilter_${teamId}`);
      if (val === oldName) AppStorage.setItem(`seasonMapPlayerFilter_${teamId}`, newName);
    } catch (e) { /* skip */ }

    // --- goalMapActiveGoalie: string ---
    try {
      const val = AppStorage.getItem(`goalMapActiveGoalie_${teamId}`);
      if (val === oldName) AppStorage.setItem(`goalMapActiveGoalie_${teamId}`, newName);
    } catch (e) { /* skip */ }

    // --- selectedPlayers: array element .name ---
    try {
      const data = JSON.parse(AppStorage.getItem(`selectedPlayers_${teamId}`) || "[]");
      let changed = false;
      data.forEach(p => {
        if (p && p.name === oldName) {
          p.name = newName;
          changed = true;
        }
      });
      if (changed) {
        AppStorage.setItem(`selectedPlayers_${teamId}`, JSON.stringify(data));
        // In-memory
        if (Array.isArray(App.data.selectedPlayers)) {
          App.data.selectedPlayers.forEach(p => {
            if (p && p.name === oldName) p.name = newName;
          });
        }
      }
    } catch (e) { /* skip */ }

    // --- lineUpData in-memory (active mode) ---
    if (App.lineUp && App.lineUp.lineUpData) {
      Object.keys(App.lineUp.lineUpData).forEach(slot => {
        if (App.lineUp.lineUpData[slot] === oldName) App.lineUp.lineUpData[slot] = newName;
      });
    }

    // --- Post-migration UI refresh ---
    if (App.lineUp && typeof App.lineUp.loadData === 'function') {
      App.lineUp.loadData();
    }
    if (App.lineUp && typeof App.lineUp.render === 'function') {
      App.lineUp.render();
    }
    if (App.statsTable && typeof App.statsTable.render === 'function') {
      App.statsTable.render();
    }
    if (App.goalMap && typeof App.goalMap.initPlayerFilter === 'function') {
      App.goalMap.initPlayerFilter();
    }
  },
  
  handleConfirm() {
    try {
      App.data.selectedPlayers = [];
      
      const items = this.container.querySelectorAll("li");
      
      items.forEach((li) => {
        const checkbox = li.querySelector(".player-checkbox");
        const numInput = li.querySelector(".num-input");
        const nameInput = li.querySelector(".name-input");
        const posSelect = li.querySelector(".pos-select");
        const posFixed = li.querySelector(".pos-fixed");
        
        if (checkbox && checkbox.checked && nameInput && nameInput.value.trim() !== "") {
          App.data.selectedPlayers.push({
            num: numInput ? numInput.value.trim() : "",
            name: nameInput.value.trim(),
            position: posFixed ? "G" : (posSelect ? posSelect.value : "")
          });
        }
      });
      
      // Speichere den aktuellen Status
      this.saveCurrentState();
      
      // Save to both non-team-specific (for backwards compatibility) and team-specific keys
      App.storage.saveSelectedPlayers();
      
      // Save to team-specific keys for proper persistence
      const teamId = App.helpers.getCurrentTeamId();
      if (teamId) {
        AppStorage.setItem(`selectedPlayers_${teamId}`, JSON.stringify(App.data.selectedPlayers));
      }
      
      App.data.selectedPlayers.forEach(p => {
        if (!App.data.statsData[p.name]) {
          App.data.statsData[p.name] = {};
        }
        App.data.categories.forEach(c => {
          if (App.data.statsData[p.name][c] === undefined) {
            App.data.statsData[p.name][c] = 0;
          }
        });
      });
      
      App.storage.saveStatsData();
      
      // KORRIGIERT: Prüfe ob App.showPage existiert
      if (typeof App.showPage === 'function') {
        App.showPage("stats");
      } else {
        console.warn("App.showPage ist noch nicht definiert");
        // Fallback: Direkt die Seiten umschalten
        document.getElementById("playerSelectionPage").style.display = "none";
        document.getElementById("statsPage").style.display = "";
      }
      
      if (App.statsTable && typeof App.statsTable.render === 'function') {
        App.statsTable.render();
      }
      
    } catch (err) {
      console.error("Error in confirmSelection:", err);
      alert("Confirmation error (see console): " + (err?.message || err));
    }
  }
};
