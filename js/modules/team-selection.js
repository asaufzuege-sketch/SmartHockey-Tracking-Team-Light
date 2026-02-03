// Team Selection Module


App.teamSelection = (function() {
    console.log('Team Selection Module loading...');
    
    const TEAMS = [
        { id: 'team1', name: 'Team 1' },
        { id: 'team2', name: 'Team 2' },
        { id: 'team3', name: 'Team 3' }
    ];
    
    let currentTeamId = null;
    let editingTeamId = null;
    
    function init() {
        console.log('Initializing Team Selection');
        
        // Load teams from localStorage or create defaults
        initializeTeams();
        
        // Render team selection UI
        renderTeamSelection();
        
        // Setup modal listeners
        setupModalListeners();
        
        // Load saved current team
        const savedTeamId = AppStorage.getItem('currentTeamId');
        if (savedTeamId && getTeam(savedTeamId)) {
            currentTeamId = savedTeamId;
        }
    }
    
    function initializeTeams() {
        // Initialize teams if they don't exist
        TEAMS.forEach(team => {
            const teamData = AppStorage.getItem(team.id);
            if (!teamData) {
                // Create empty team with no players
                saveTeam(team.id, {
                    name: team.name,
                    players: []
                });
            }
        });
    }
    
    function renderTeamSelection() {
        const container = document.getElementById('teamSelectionContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        TEAMS.forEach(teamDef => {
            const teamData = getTeam(teamDef.id);
            if (!teamData) return;
            
            const teamSlot = document.createElement('div');
            teamSlot.className = 'team-slot';
            
            const teamDisplay = document.createElement('div');
            teamDisplay.className = 'team-display';
            
            const teamTitle = document.createElement('h3');
            teamTitle.textContent = teamData.name;
            
            // Count players with names from playerSelectionData for ALL teams
            const savedPlayersKey = `playerSelectionData_${teamDef.id}`;
            let savedPlayers = [];
            try {
                savedPlayers = JSON.parse(AppStorage.getItem(savedPlayersKey) || '[]');
            } catch (e) {
                savedPlayers = [];
            }
            let playersWithNames = savedPlayers.filter(p => p.name && p.name.trim() !== '').length;
            
            const teamInfo = document.createElement('p');
            teamInfo.className = 'team-name';
            teamInfo.textContent = `${playersWithNames} Players`;
            
            teamDisplay.appendChild(teamTitle);
            teamDisplay.appendChild(teamInfo);
            
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'team-button-group';
            
            const selectBtn = document.createElement('button');
            selectBtn.className = 'team-btn';
            selectBtn.textContent = 'Select';
            selectBtn.onclick = () => selectTeam(teamDef.id);
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-team-btn';
            editBtn.innerHTML = '✏️';
            editBtn.onclick = () => openEditModal(teamDef.id);
            
            buttonGroup.appendChild(selectBtn);
            buttonGroup.appendChild(editBtn);
            
            teamSlot.appendChild(teamDisplay);
            teamSlot.appendChild(buttonGroup);
            
            container.appendChild(teamSlot);
        });
        
        updateButtonStates();
    }
    
    function updateButtonStates() {
        const container = document.getElementById('teamSelectionContainer');
        if (!container) return;
        
        const buttons = container.querySelectorAll('.team-btn');
        buttons.forEach((btn, index) => {
            const teamId = TEAMS[index].id;
            if (currentTeamId === teamId) {
                btn.classList.add('active-team');
                btn.textContent = 'Selected';
            } else {
                btn.classList.remove('active-team');
                btn.textContent = 'Select';
            }
        });
    }
    
    function selectTeam(teamId) {
        console.log('Selecting team:', teamId);
        currentTeamId = teamId;
        AppStorage.setItem('currentTeamId', teamId);
        updateButtonStates();
        
        // === NEW: Clear Goal Map DOM state ===
        // Remove all Goal Map markers
        document.querySelectorAll("#torbildPage .marker-dot").forEach(d => d.remove());
        // Reset Goal Map time buttons
        document.querySelectorAll("#torbildPage .time-btn").forEach(btn => btn.textContent = "0");
        // Remove overlays
        document.querySelectorAll('.goalie-name-overlay, .goalie-name-goal, .player-name-overlay').forEach(el => el.remove());
        // Reset filters (but not timeTrackingInitialized - that should remain true once set)
        // The event listeners will dynamically read the new team's data
        if (App.goalMap) {
            App.goalMap.playerFilter = null;
        }
        
        // === NEW: Clear Season Map DOM state ===
        // Remove all Season Map markers
        document.querySelectorAll("#seasonMapPage .marker-dot").forEach(d => d.remove());
        // Reset Season Map time buttons
        document.querySelectorAll("#seasonMapPage .time-btn").forEach(btn => btn.textContent = "0");
        // Remove heatmap canvas
        document.querySelectorAll("#seasonMapPage .heatmap-canvas").forEach(c => c.remove());
        // Remove goal area labels
        document.querySelectorAll("#seasonMapPage .goal-area-label").forEach(el => el.remove());
        // Clear momentum graphic
        const momentumContainer = document.getElementById("seasonMapMomentum");
        if (momentumContainer) momentumContainer.innerHTML = "";
        // Reset season map filter
        if (App.seasonMap) {
            App.seasonMap.playerFilter = null;
        }
        
        // === NEW: Reset filter dropdowns ===
        const goalMapPlayerFilter = document.getElementById("goalMapPlayerFilter");
        if (goalMapPlayerFilter) {
            goalMapPlayerFilter.value = "";
            goalMapPlayerFilter.classList.remove("active");
        }
        const goalMapGoalieFilter = document.getElementById("goalMapGoalieFilter");
        if (goalMapGoalieFilter) {
            goalMapGoalieFilter.value = "";
            goalMapGoalieFilter.classList.remove("active");
        }
        const seasonMapPlayerFilter = document.getElementById("seasonMapPlayerFilter");
        if (seasonMapPlayerFilter) {
            seasonMapPlayerFilter.value = "";
            seasonMapPlayerFilter.classList.remove("active");
        }
        const seasonMapGoalieFilter = document.getElementById("seasonMapGoalieFilter");
        if (seasonMapGoalieFilter) {
            seasonMapGoalieFilter.value = "";
            seasonMapGoalieFilter.classList.remove("active");
        }
        
        // Reload team-specific data for the new team
        App.storage.load();
        
        // Navigate to player selection
        if (App.showPage) {
            App.showPage('selection');
        }
    }
    
    function openEditModal(teamId) {
        editingTeamId = teamId;
        const teamData = getTeam(teamId);
        if (!teamData) return;
        
        const modal = document.getElementById('teamEditModal');
        const input = document.getElementById('teamNameInput');
        
        if (modal && input) {
            input.value = teamData.name;
            modal.style.display = 'flex';
            input.focus();
        }
    }
    
    function closeEditModal() {
        const modal = document.getElementById('teamEditModal');
        if (modal) {
            modal.style.display = 'none';
        }
        editingTeamId = null;
    }
    
    function saveTeamName() {
        if (!editingTeamId) return;
        
        const input = document.getElementById('teamNameInput');
        const newName = input ? input.value.trim() : '';
        
        if (newName) {
            const teamData = getTeam(editingTeamId);
            if (teamData) {
                teamData.name = newName;
                saveTeam(editingTeamId, teamData);
                renderTeamSelection();
            }
        }
        
        closeEditModal();
    }
    
    function setupModalListeners() {
        const saveBtn = document.getElementById('saveTeamNameBtn');
        const cancelBtn = document.getElementById('cancelTeamEditBtn');
        const modal = document.getElementById('teamEditModal');
        const input = document.getElementById('teamNameInput');
        
        if (saveBtn) {
            saveBtn.onclick = saveTeamName;
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = closeEditModal;
        }
        
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    closeEditModal();
                }
            };
        }
        
        if (input) {
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    saveTeamName();
                }
            };
        }
    }
    
    function getTeam(teamId) {
        const data = AppStorage.getItem(teamId);
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error('Error parsing team data:', e);
                return null;
            }
        }
        return null;
    }
    
    function saveTeam(teamId, data) {
        AppStorage.setItem(teamId, JSON.stringify(data));
    }
    
    function saveTeams() {
        // Already saved via individual saveTeam calls
    }
    
    function getCurrentTeamInfo() {
        if (!currentTeamId) return null;
        const teamData = getTeam(currentTeamId);
        return teamData ? { id: currentTeamId, ...teamData } : null;
    }
    
    function resetCurrentTeam() {
        if (!currentTeamId) return false;
        
        const teamData = getTeam(currentTeamId);
        if (teamData) {
            teamData.players = [];
            saveTeam(currentTeamId, teamData);
            renderTeamSelection();
            return true;
        }
        return false;
    }
    
    // Language content for Info Modal
    const infoContent = {
        de: `💡 Tipp: Alle Seiteninfos sind über Klick auf den jeweiligen Seitentitel abrufbar.

Ablauf (Spiel)

1. Team Selection: Team wählen oder bearbeiten 
2. Player Selection: Spieler erfassen/aktivieren; bei Bedarf direkt zu Line Up oder Game Center. 
3. Line Up: Aufstellung setzen (Manuell, Balanced + Power vorgegeben durch KI/AI)
4. Game Center: Spieldaten erfassen
5. Goal Map: Punkte im Feld/Tor/Time setzen, zurück zu Game Center. 
6. Nach Spiel: Goal Value je Gegner einschätzen (Schwierigkeit). 
7. Download: Game → Season und Season Map exportieren, um die Saison auszuwerten.

________________________________________

Team Selection
• Team wählen oder bearbeiten

________________________________________

Player Selection
• Spieler erfassen/bearbeiten: Nummer, Name, Position (G = Goalie, W = Wing, C= Center, D = Defense).
• Aktivieren (Checkbox) = Spieler ist für Line Up / Game Center verfügbar.
• Buttons: „Line Up" → zur Aufstellung; „Game Center" → direkt zur Spiel-Erfassung.

________________________________________

Line Up
Modi (umschaltbar per Modus-Button):
• Balanced: Ausgeglichenes Line Up. Vorgabe durch AI-Logik und Formeln.
• Power: Stärkstes Line Up, Spezial-Setup für entscheidende Szenen. Vorgabe durch AI-Logik und Formeln.
• Manuell: Frei erstellbares Line Up per Klick auf Position belegen.
• „Player Out": Spieler als OUT markieren (Bei Penalty-Strafe). Line Up wird automatisch angepasst.

________________________________________

Game Center
Spielerzeile:
• Klick auf Namen (nicht auf ⋮⋮): Timer Start/Stop für jeden Spieler. Die 5 Spieler mit grünen Werten haben die längste Eiszeit, die 5 Spieler mit roten Werten haben die niedrigste Eiszeit.
• Klick auf Zeit: +10 s; Doppelklick: –10 s.
• Langer Druck auf ⋮⋮ → Drag & Drop für Reihenfolge

Statistikzellen (z. B. Goals, Shot):
• Klick: +1, Doppelklick: –1.
• Bei +1 auf Goals/Shot startet je nach Ereignis der Goal- bzw. Shot-Workflow in der Goal Map.

Gegner-Schüsse: In der Shot-Totals-Zelle (unten) per Klick/Doppelklick zählen.

Download: Spieldaten werden als Excel heruntergeladen.

Export Season: Spieldaten werden zu Saisonstatistiken addiert. Dabei werden Sie gebeten, einen Goal Value Wert einzugeben. Bsp: 1 Stern = sehr schwacher Gegner, einfach Tore zu erzielen, Gegner am untersten Tabellen Ende, Chance auf viele Schüsse. 10 Sterne = Sehr starker Gegner, Tabellen Leader, Schwer Chancen zu bekommen, eher weniger Schüsse zugelassen.

Mit Button (☀️/🌙) kann zwischen Light- und Dark Mode gewechselt werden.

________________________________________

Goal Map
Feldhälften: Grün/Oben = scored / Rot/Unten = conceded

Goal-Workflow (Beginnt mit Klick auf Goal in Game Center):
• 1. Grauen Punkt in grüne Spielhälfte setzen
• 2. Punkt in grünes Tor setzen
• 3. Zeit bestimmen in grünen Time-Buttons
• Danach Auto-Return zu Game Center.

Shot-Workflow (Beginnt mit Klick auf Shot in Game Center):
• 1. Grünen Punkt in grüne Spielhälfte setzen
• Danach Auto-Return zu Game Center.

Goal erhalten (es muss ein Goalie oben ausgewählt werden):
• 1. Grauen Punkt in rote Spielhälfte setzen
• 2. Punkt in rotes Tor setzen
• 3. Zeit bestimmen in roten Time-Buttons

Time Buttons:
• Klick: +1, Doppelklick: -1
• WICHTIG: +1/-1 gilt nur für den aktuell ausgewählten Spieler im Filter
• Ohne Filter wird "anonymous" verwendet
• Der angezeigte Wert ist die SUMME aller Spieler
• Um einen bestimmten Spieler zu korrigieren, wähle ihn zuerst im Filter aus und korrigiere per Klick auf Punkt (im Spielfeld und Tor) oder per Doppelklick (Time Buttons)

Export Season Map: Punkte werden zu Season Map addiert

________________________________________

Season Map
• Only read

Filter:
• Player-Filter: Zeigt/aggregiert grüne (scored) Werte nur für diesen Spieler.
• Goalie-Filter: Zeigt/aggregiert rote (conceded) Werte nur für diesen Goalie.

Momentum-Grafik:
• Mit Player-Filter: grüne Werte nur dieses Spielers.
• Mit Goalie-Filter: rote Werte nur dieses Goalies.
• Ohne Filter: Gesamtwerte.

________________________________________

Goal Value
Dieser Wert wird für die Saisonstatistiken benötigt.
Manuelle Eingabe der erzielten Tore gegen den jeweiligen Gegner möglich.
Untere Skala (Bottom) gewichtet Gegnerstärke; Value = Summe (Wert × Gewicht). Dieser Wert zeigt einen Mittelwert aller exportierten Werte für diesen Gegner an, kann manuell angepasst werden.
Reset setzt alle Werte, Skalen und Gegnernamen zurück.

________________________________________

Season
• Feldspieler-Saisonwerte (Goalies ausgeblendet).
• Klick/Doppelklick auf Werte: +1/–1 (bei +/- auch negativ).
• Long-Press auf Time-Zelle: Zusätzliche Zeit kann manuell eingegeben werden.
• Positionsfilter (Dropdown „Pos.").
• MVP Points/MVP = Wertvollster Spieler gemäss analysierter Statistik (AI-Formel)

________________________________________

Reset (irreversibel)
• Game Center: Jede Seite Kann/muss einzeln zurückgesetzt werden`,
        
        en: `💡 Tip: All page infos are accessible by clicking on the page title.

Workflow (Game)

1. Team Selection: Choose or edit team.
2. Player Selection: Add/activate players; go directly to Line Up or Game Center if needed.
3. Line Up: Set lineup (Manual, Balanced + Power preset by AI)
4. Game Center: Record game data
5. Goal Map: Set points in field/goal/time, return to Game Center.
6. After Game: Assess Goal Value per opponent (difficulty).
7. Download: Export Game → Season and Season Map to analyze the season.

________________________________________

Team Selection
• Choose or edit team

________________________________________

Player Selection
• Add/edit players: Number, Name, Position (G = Goalie, W = Wing, C = Center, D = Defense).
• Activate (checkbox) = Player available for Line Up / Game Center.
• Buttons: "Line Up" → to lineup; "Game Center" → directly to game recording.

________________________________________

Line Up
Modes (switchable via mode button):
• Balanced: Balanced Line Up. Preset by AI logic and formulas.
• Power: Strongest Line Up, special setup for decisive moments. Preset by AI logic and formulas.
• Manual: Freely customizable Line Up by clicking on positions.
• "Player Out": Mark player as OUT (penalty). Line Up adjusts automatically.

________________________________________

Game Center
Player Row:
• Click on name (not on ⋮⋮): Timer Start/Stop for each player. The 5 players with green values have the longest ice time, the 5 players with red values have the shortest ice time.
• Click on time: +10 s; Double-click: –10 s.
• Long press on ⋮⋮ → Drag & Drop for order

Stat Cells (e.g., Goals, Shot):
• Click: +1, Double-click: –1.
• +1 on Goals/Shot triggers corresponding Goal or Shot workflow in Goal Map.

Opponent Shots: Count in Shot-Totals cell (bottom) via click/double-click.

Download: Game data is downloaded as Excel.

Export Season: Game data is added to season statistics.

After each game, a value must be entered in Goal Value.

Use button (☀️/🌙) to switch between Light and Dark Mode.

________________________________________

Goal Map
Field Halves: Green/Top = scored / Red/Bottom = conceded

Goal Workflow (Starts with click on Goal in Game Center):
• 1. Place gray dot in green field half
• 2. Place dot in green goal
• 3. Determine time in green Time Buttons
• Then auto-return to Game Center.

Shot Workflow (Starts with click on Shot in Game Center):
• 1. Place green dot in green field half
• Then auto-return to Game Center.

Goal conceded (a goalie must be selected at the top):
• 1. Place gray dot in red field half
• 2. Place dot in red goal
• 3. Determine time in red Time Buttons

Time Buttons:
• Click: +1, Double-click: -1
• IMPORTANT: +1/-1 applies only to the currently selected player in the filter
• Without filter "anonymous" is used
• The displayed value is the SUM of all players
• To correct a specific player, first select them in the filter and correct by clicking on dots (in field and goal) or by double-clicking (Time Buttons)

Export Season Map: Dots are added to Season Map

________________________________________

Season Map
• Read only

Filters:
• Player Filter: Shows/aggregates green (scored) values for this player only.
• Goalie Filter: Shows/aggregates red (conceded) values for this goalie only.

Momentum Chart:
• With Player Filter: green values of this player only.
• With Goalie Filter: red values of this goalie only.
• Without filter: Total values.

________________________________________

Goal Value
• This value is required for season statistics
• Manual entry of goals scored against each opponent
• Bottom scale weights opponent strength; Value = Sum (value × weight).
• Reset clears all values, scales, and opponent names.

________________________________________

Season
• Field player season values (goalies hidden).
• Click/double-click on values: +1/–1 (+/- can be negative).
• Long-press on time cell: Additional time can be entered manually.
• Position filter (dropdown "Pos.").
• MVP Points/MVP = Most Valuable Player based on analyzed statistics (AI formula)

________________________________________

Reset (irreversible)
• Game Center: Each page can/must be reset individually`,
        
        ru: `💡 Совет: Все информации о страницах доступны по клику на заголовок страницы.

Порядок действий (Игра)

1. Team Selection: Выбрать или редактировать команду.
2. Player Selection: Добавить/активировать игроков; при необходимости перейти в Line Up или Game Center.
3. Line Up: Установить состав (Ручной, Balanced + Power предустановлены ИИ)
4. Game Center: Записать игровые данные
5. Goal Map: Установить точки на поле/воротах/времени, вернуться в Game Center.
6. После игры: Оценить Goal Value по соперникам (сложность).
7. Download: Экспортировать Game → Season и Season Map для анализа сезона.

________________________________________

Team Selection
• Выбрать или редактировать команду

________________________________________

Player Selection
• Добавить/редактировать игроков: Номер, Имя, Позиция (G = Вратарь, W = Крайний, C = Центр, D = Защитник).
• Активировать (чекбокс) = Игрок доступен для Line Up / Game Center.
• Кнопки: «Line Up» → к составу; «Game Center» → сразу к записи игры.

________________________________________

Line Up
Режимы (переключаются кнопкой режима):
• Balanced: Сбалансированный Line Up. Предустановка через AI-логику и формулы.
• Power: Сильнейший Line Up, специальная установка для решающих моментов. Предустановка через AI-логику и формулы.
• Manual: Свободно настраиваемый Line Up через клик на позицию.
• «Player Out»: Отметить игрока как OUT (штраф). Line Up корректируется автоматически.

________________________________________

Game Center
Строка игрока:
• Клик по имени (не по ⋮⋮): Таймер Старт/Стоп для каждого игрока. 5 игроков с зелёными значениями имеют самое длинное ледовое время, 5 игроков с красными значениями имеют самое короткое ледовое время.
• Клик по времени: +10 с; Двойной клик: –10 с.
• Долгое нажатие на ⋮⋮ → Drag & Drop для порядка

Ячейки статистики (например, Goals, Shot):
• Клик: +1, Двойной клик: –1.
• +1 на Goals/Shot запускает соответствующий Goal- или Shot-процесс в Goal Map.

Броски соперника: Считать в ячейке Shot-Totals (внизу) кликом/двойным кликом.

Download: Игровые данные загружаются как Excel.

Export Season: Игровые данные добавляются к сезонной статистике.

После каждой игры необходимо ввести значение в Goal Value.

Кнопка (☀️/🌙) для переключения между светлым и тёмным режимом.

________________________________________

Goal Map
Половины поля: Зелёный/Верх = забито / Красный/Низ = пропущено

Goal-Workflow (Начинается с клика на Goal в Game Center):
• 1. Поставить серую точку в зелёную половину поля
• 2. Поставить точку в зелёные ворота
• 3. Определить время в зелёных Time-Buttons
• Затем авто-возврат в Game Center.

Shot-Workflow (Начинается с клика на Shot в Game Center):
• 1. Поставить зелёную точку в зелёную половину поля
• Затем авто-возврат в Game Center.

Пропущенный гол (вратарь должен быть выбран вверху):
• 1. Поставить серую точку в красную половину поля
• 2. Поставить точку в красные ворота
• 3. Определить время в красных Time-Buttons

Time Buttons:
• Клик: +1, Двойной клик: -1
• ВАЖНО: +1/-1 применяется только к выбранному игроку в фильтре
• Без фильтра используется "anonymous"
• Отображаемое значение - это СУММА всех игроков
• Чтобы исправить конкретного игрока, сначала выберите его в фильтре и исправьте кликом на точку (на поле и в воротах) или двойным кликом (Time Buttons)

Export Season Map: Точки добавляются к Season Map

________________________________________

Season Map
• Только просмотр

Фильтры:
• Player Filter: Показывает/суммирует зелёные (забитые) значения только для этого игрока.
• Goalie Filter: Показывает/суммирует красные (пропущенные) значения только для этого вратаря.

Momentum-график:
• С Player Filter: зелёные значения только этого игрока.
• С Goalie Filter: красные значения только этого вратаря.
• Без фильтра: Общие значения.

________________________________________

Goal Value
• Это значение необходимо для сезонной статистики
• Ручной ввод забитых голов против каждого соперника
• Нижняя шкала (Bottom) весит силу соперника; Value = Сумма (значение × вес).
• Reset сбрасывает все значения, шкалы и имена соперников.

________________________________________

Season
• Сезонные показатели полевых игроков (вратари скрыты).
• Клик/двойной клик по значениям: +1/–1 (+/- может быть отрицательным).
• Долгое нажатие на ячейку времени: Дополнительное время можно ввести вручную.
• Фильтр позиции (выпадающий «Pos.»).
• MVP Points/MVP = Самый ценный игрок по анализу статистики (AI-формула)

________________________________________

Reset (необратимо)
• Game Center: Каждую страницу можно/нужно сбросить отдельно`,
        
        sv: `💡 Tips: All sidinformation är tillgänglig genom att klicka på sidtiteln.

Arbetsflöde (Match)

1. Team Selection: Välj eller redigera lag.
2. Player Selection: Lägg till/aktivera spelare; gå direkt till Line Up eller Game Center vid behov.
3. Line Up: Sätt uppställning (Manuell, Balanced + Power förinställt av AI)
4. Game Center: Registrera matchdata
5. Goal Map: Sätt punkter i fält/mål/tid, återgå till Game Center.
6. Efter match: Bedöm Goal Value per motståndare (svårighetsgrad).
7. Download: Exportera Game → Season och Season Map för att analysera säsongen.

________________________________________

Team Selection
• Välj eller redigera lag

________________________________________

Player Selection
• Lägg till/redigera spelare: Nummer, Namn, Position (G = Målvakt, W = Wing, C = Center, D = Back).
• Aktivera (kryssruta) = Spelare tillgänglig för Line Up / Game Center.
• Knappar: "Line Up" → till uppställning; "Game Center" → direkt till matchregistrering.

________________________________________

Line Up
Lägen (växla via lägesknapp):
• Balanced: Balanserad Line Up. Förinställning genom AI-logik och formler.
• Power: Starkaste Line Up, specialinställning för avgörande situationer. Förinställning genom AI-logik och formler.
• Manuell: Fritt anpassningsbar Line Up genom att klicka på positioner.
• "Player Out": Markera spelare som OUT (utvisning). Line Up justeras automatiskt.

________________________________________

Game Center
Spelarrad:
• Klicka på namn (inte på ⋮⋮): Timer Start/Stop för varje spelare. De 5 spelarna med gröna värden har längst istid, de 5 spelarna med röda värden har kortast istid.
• Klicka på tid: +10 s; Dubbelklicka: –10 s.
• Långtryck på ⋮⋮ → Drag & Drop för ordning

Statistikceller (t.ex. Goals, Shot):
• Klick: +1, Dubbelklick: –1.
• +1 på Goals/Shot startar motsvarande Goal- eller Shot-arbetsflöde i Goal Map.

Motståndarskott: Räkna i Shot-Totals-cellen (nederst) via klick/dubbelklick.

Download: Matchdata laddas ner som Excel.

Export Season: Matchdata läggs till säsongsstatistik.

Efter varje match måste ett värde anges i Goal Value.

Använd knappen (☀️/🌙) för att växla mellan ljust och mörkt läge.

________________________________________

Goal Map
Fälthalvor: Grön/Övre = gjorda / Röd/Nedre = insläppta

Goal-Workflow (Börjar med klick på Goal i Game Center):
• 1. Placera grå punkt i grön fälthälft
• 2. Placera punkt i grönt mål
• 3. Bestäm tid i gröna Time-Buttons
• Sedan auto-återgång till Game Center.

Shot-Workflow (Börjar med klick på Shot i Game Center):
• 1. Placera grön punkt i grön fälthälft
• Sedan auto-återgång till Game Center.

Insläppt mål (en målvakt måste väljas överst):
• 1. Placera grå punkt i röd fälthälft
• 2. Placera punkt i rött mål
• 3. Bestäm tid i röda Time-Buttons

Time Buttons:
• Klick: +1, Dubbelklick: -1
• VIKTIGT: +1/-1 gäller endast för den valda spelaren i filtret
• Utan filter används "anonymous"
• Det visade värdet är SUMMAN av alla spelare
• För att korrigera en specifik spelare, välj dem först i filtret och korrigera genom att klicka på punkt (i fält och mål) eller genom dubbelklick (Time Buttons)

Export Season Map: Punkter läggs till Season Map

________________________________________

Season Map
• Endast läsning

Filter:
• Player Filter: Visar/aggregerar gröna (gjorda) värden endast för denna spelare.
• Goalie Filter: Visar/aggregerar röda (insläppta) värden endast för denna målvakt.

Momentum-graf:
• Med Player Filter: gröna värden endast för denna spelare.
• Med Goalie Filter: röda värden endast för denna målvakt.
• Utan filter: Totalvärden.

________________________________________

Goal Value
• Detta värde behövs för säsongsstatistik
• Manuell inmatning av gjorda mål mot varje motståndare
• Nedre skala (Bottom) viktar motståndares styrka; Value = Summa (värde × vikt).
• Reset återställer alla värden, skalor och motståndarnamn.

________________________________________

Season
• Utespelares säsongsvärden (målvakter dolda).
• Klick/dubbelklick på värden: +1/–1 (+/- kan vara negativt).
• Långtryck på tidcell: Extra tid kan matas in manuellt.
• Positionsfilter (dropdown "Pos.").
• MVP Points/MVP = Mest värdefulla spelaren baserat på analyserad statistik (AI-formel)

________________________________________

Reset (oåterkallelig)
• Game Center: Varje sida kan/måste återställas individuellt`,
        
        fi: `💡 Vinkki: Kaikki sivutiedot ovat saatavilla napsauttamalla sivun otsikkoa.

Työnkulku (Peli)

1. Team Selection: Valitse tai muokkaa joukkuetta.
2. Player Selection: Lisää/aktivoi pelaajia; siirry tarvittaessa suoraan Line Up tai Game Center.
3. Line Up: Aseta kokoonpano (Manuaalinen, Balanced + Power esiasetettu tekoälyllä)
4. Game Center: Tallenna pelitiedot
5. Goal Map: Aseta pisteet kentälle/maaliin/aikaan, palaa Game Centeriin.
6. Pelin jälkeen: Arvioi Goal Value vastustajittain (vaikeusaste).
7. Download: Vie Game → Season ja Season Map kauden analysointiin.

________________________________________

Team Selection
• Valitse tai muokkaa joukkuetta

________________________________________

Player Selection
• Lisää/muokkaa pelaajia: Numero, Nimi, Pelipaikka (G = Maalivahti, W = Laitahyökkääjä, C = Keskushyökkääjä, D = Puolustaja).
• Aktivoi (valintaruutu) = Pelaaja käytettävissä Line Up / Game Center.
• Painikkeet: "Line Up" → kokoonpanoon; "Game Center" → suoraan pelin tallennukseen.

________________________________________

Line Up
Tilat (vaihda tilapainikkeella):
• Balanced: Tasapainoinen Line Up. Esiasetus tekoälyn logiikan ja kaavojen kautta.
• Power: Vahvin Line Up, erikoisasetus ratkaiseviin hetkiin. Esiasetus tekoälyn logiikan ja kaavojen kautta.
• Manuaalinen: Vapaasti muokattava Line Up klikkaamalla paikkoja.
• "Player Out": Merkitse pelaaja OUT (jäähy). Line Up mukautuu automaattisesti.

________________________________________

Game Center
Pelaajarivi:
• Klikkaa nimeä (ei ⋮⋮): Ajastin Käynnistä/Pysäytä jokaiselle pelaajalle. 5 pelaajaa, joilla on vihreät arvot, ovat pelanneet pisimpään jäällä, 5 pelaajaa, joilla on punaiset arvot, ovat pelanneet lyhimmän ajan jäällä.
• Klikkaa aikaa: +10 s; Tuplaklikkaa: –10 s.
• Pitkä painallus ⋮⋮ → Vedä ja pudota järjestykseen

Tilastosolut (esim. Goals, Shot):
• Klikkaus: +1, Tuplaklikkaus: –1.
• +1 Goals/Shot käynnistää vastaavan Goal- tai Shot-työnkulun Goal Mapissa.

Vastustajan laukaukset: Laske Shot-Totals-solussa (alhaalla) klikkauksella/tuplaklikkauksella.

Download: Pelitiedot ladataan Excelinä.

Export Season: Pelitiedot lisätään kauden tilastoihin.

Jokaisen pelin jälkeen Goal Valueen on syötettävä arvo.

Käytä painiketta (☀️/🌙) vaihtaaksesi vaalean ja tumman tilan välillä.

________________________________________

Goal Map
Kenttäpuoliskot: Vihreä/Ylä = tehty / Punainen/Ala = päästetty

Goal-Workflow (Alkaa klikkauksella Goal Game Centerissä):
• 1. Aseta harmaa piste vihreälle kenttäpuoliskolle
• 2. Aseta piste vihreään maaliin
• 3. Määritä aika vihreissä Time-Buttons
• Sitten automaattinen paluu Game Centeriin.

Shot-Workflow (Alkaa klikkauksella Shot Game Centerissä):
• 1. Aseta vihreä piste vihreälle kenttäpuoliskolle
• Sitten automaattinen paluu Game Centeriin.

Päästetty maali (maalivahti on valittava yläosasta):
• 1. Aseta harmaa piste punaiselle kenttäpuoliskolle
• 2. Aseta piste punaiseen maaliin
• 3. Määritä aika punaisissa Time-Buttons

Time Buttons:
• Klikkaus: +1, Tuplaklikkaus: -1
• TÄRKEÄÄ: +1/-1 koskee vain suodattimessa valittua pelaajaa
• Ilman suodatinta käytetään "anonymous"
• Näytetty arvo on SUMMA kaikista pelaajista
• Korjataksesi tiettyä pelaajaa, valitse heidät ensin suodattimesta ja korjaa klikkaamalla pistettä (kentällä ja maalissa) tai tuplaklikkaamalla (Time Buttons)

Export Season Map: Pisteet lisätään Season Mapiin

________________________________________

Season Map
• Vain luku

Suodattimet:
• Player Filter: Näyttää/kokoaa vihreät (tehdyt) arvot vain tälle pelaajalle.
• Goalie Filter: Näyttää/kokoaa punaiset (päästetyt) arvot vain tälle maalivahdille.

Momentum-kaavio:
• Player Filterin kanssa: vihreät arvot vain tämän pelaajan.
• Goalie Filterin kanssa: punaiset arvot vain tämän maalivahdin.
• Ilman suodatinta: Kokonaisarvot.

________________________________________

Goal Value
• Tämä arvo tarvitaan kauden tilastoihin
• Manuaalinen syöttö tehdyistä maaleista kutakin vastustajaa vastaan
• Alaskala (Bottom) painottaa vastustajan vahvuutta; Value = Summa (arvo × paino).
• Reset nollaa kaikki arvot, asteikot ja vastustajien nimet.

________________________________________

Season
• Kenttäpelaajien kauden arvot (maalivahdit piilotettu).
• Klikkaus/tuplaklikkaus arvoihin: +1/–1 (+/- voi olla negatiivinen).
• Pitkä painallus aikasoluun: Lisäaika voidaan syöttää manuaalisesti.
• Pelipaikkassuodatin (pudotusvalikko "Pos.").
• MVP Points/MVP = Arvokkain pelaaja analysoidun tilaston perusteella (tekoälykaava)

________________________________________

Reset (peruuttamaton)
• Game Center: Jokainen sivu voidaan/täytyy nollata erikseen`,
        
        fr: `💡 Astuce: Toutes les infos des pages sont accessibles en cliquant sur le titre.

Ablauf (Jeu)

1. Team Selection: Choisir ou modifier l'équipe.
2. Player Selection: Ajouter/activer des joueurs; passer directement à Line Up ou Game Center si nécessaire.
3. Line Up: Définir la formation (Manuel, Balanced + Power prédéfini par IA)
4. Game Center: Enregistrer les données du match
5. Goal Map: Placer des points sur le terrain/but/temps, retourner à Game Center.
6. Après le match: Évaluer Goal Value par adversaire (difficulté).
7. Download: Exporter Game → Season et Season Map pour analyser la saison.

________________________________________

Team Selection
• Choisir ou modifier l'équipe

________________________________________

Player Selection
• Ajouter/modifier des joueurs: Numéro, Nom, Position (G = Gardien, W = Ailier, C = Centre, D = Défense).
• Activer (case à cocher) = Joueur disponible pour Line Up / Game Center.
• Boutons: "Line Up" → vers la formation; "Game Center" → directement à l'enregistrement du jeu.

________________________________________

Line Up
Modes (commutables via bouton de mode):
• Balanced: Formation équilibrée. Prédéfini par logique IA et formules.
• Power: Formation la plus forte, configuration spéciale pour les moments décisifs. Prédéfini par logique IA et formules.
• Manuel: Formation librement personnalisable en cliquant sur les positions.
• "Player Out": Marquer le joueur comme OUT (pénalité). La formation s'ajuste automatiquement.

________________________________________

Game Center
Ligne joueur:
• Cliquer sur le nom (pas sur ⋮⋮): Timer Démarrer/Arrêter pour chaque joueur. Les 5 joueurs avec des valeurs vertes ont le temps de glace le plus long, les 5 joueurs avec des valeurs rouges ont le temps de glace le plus court.
• Cliquer sur le temps: +10 s; Double-clic: –10 s.
• Pression longue sur ⋮⋮ → Glisser-déposer pour l'ordre

Cellules de statistiques (par ex. Goals, Shot):
• Clic: +1, Double-clic: –1.
• +1 sur Goals/Shot déclenche le flux de travail Goal ou Shot correspondant dans Goal Map.

Tirs adverses: Compter dans la cellule Shot-Totals (en bas) via clic/double-clic.

Download: Les données du match sont téléchargées en tant qu'Excel.

Export Season: Les données du match sont ajoutées aux statistiques de la saison.

Après chaque match, une valeur doit être saisie dans Goal Value.

Utiliser le bouton (☀️/🌙) pour basculer entre le mode clair et sombre.

________________________________________

Goal Map
Moitiés de terrain: Vert/Haut = marqués / Rouge/Bas = encaissés

Flux Goal (Commence avec clic sur Goal dans Game Center):
• 1. Placer le point gris dans la moitié de terrain verte
• 2. Placer le point dans le but vert
• 3. Déterminer le temps dans les boutons Time verts
• Puis retour automatique à Game Center.

Flux Shot (Commence avec clic sur Shot dans Game Center):
• 1. Placer le point vert dans la moitié de terrain verte
• Puis retour automatique à Game Center.

But encaissé (un gardien doit être sélectionné en haut):
• 1. Placer le point gris dans la moitié de terrain rouge
• 2. Placer le point dans le but rouge
• 3. Déterminer le temps dans les boutons Time rouges

Boutons Time:
• Clic: +1, Double-clic: -1
• IMPORTANT: +1/-1 s'applique uniquement au joueur actuellement sélectionné dans le filtre
• Sans filtre "anonymous" est utilisé
• La valeur affichée est la SOMME de tous les joueurs
• Pour corriger un joueur spécifique, sélectionnez-le d'abord dans le filtre et corrigez en cliquant sur les points (sur le terrain et le but) ou en double-cliquant (boutons Time)

Export Season Map: Les points sont ajoutés à Season Map

________________________________________

Season Map
• Lecture seule

Filtres:
• Player Filter: Affiche/agrège les valeurs vertes (marqués) uniquement pour ce joueur.
• Goalie Filter: Affiche/agrège les valeurs rouges (encaissés) uniquement pour ce gardien.

Graphique Momentum:
• Avec Player Filter: valeurs vertes uniquement de ce joueur.
• Avec Goalie Filter: valeurs rouges uniquement de ce gardien.
• Sans filtre: Valeurs totales.

________________________________________

Goal Value
Cette valeur est nécessaire pour les statistiques de la saison.
Saisie manuelle des buts marqués contre chaque adversaire.
L'échelle inférieure (Bottom) pèse la force de l'adversaire; Value = Somme (valeur × poids). Cette valeur montre une moyenne de toutes les valeurs exportées pour cet adversaire, peut être ajustée manuellement.
Reset efface toutes les valeurs, les échelles et les noms des adversaires.

________________________________________

Season
• Valeurs saisonnières des joueurs de champ (gardiens cachés).
• Clic/double-clic sur les valeurs: +1/–1 (+/- peut être négatif).
• Pression longue sur la cellule de temps: Le temps supplémentaire peut être saisi manuellement.
• Filtre de position (menu déroulant "Pos.").
• MVP Points/MVP = Joueur le plus précieux selon les statistiques analysées (formule IA)

________________________________________

Reset (irréversible)
• Game Center: Chaque page peut/doit être réinitialisée individuellement`
    };
    
    const closeButtonText = {
        de: 'Schließen',
        en: 'Close',
        ru: 'Закрыть',
        sv: 'Stäng',
        fi: 'Sulje',
        fr: 'Fermer'
    };
    
    function convertMarkdownToHTML(markdown) {
        // Split by dividers (________________________________________) to get sections
        const sections = markdown.split(/_{20,}/);
        let html = '';
        
        sections.forEach((section, index) => {
            section = section.trim();
            if (!section) return;
            
            const lines = section.split('\n');
            let sectionHtml = '';
            let currentList = null;
            let listType = null;
            
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (!line) continue;
                
                // Check for numbered list (1. 2. 3. etc.)
                const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
                if (numberedMatch) {
                    if (!currentList || listType !== 'ol') {
                        if (currentList) sectionHtml += `</${listType}>`;
                        currentList = [];
                        listType = 'ol';
                    }
                    currentList.push(`<li>${numberedMatch[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`);
                    continue;
                }
                
                // Check for bullet list (• or - at start)
                const bulletMatch = line.match(/^[•\-]\s+(.+)$/);
                if (bulletMatch) {
                    if (!currentList || listType !== 'ul') {
                        if (currentList) sectionHtml += `</${listType}>`;
                        currentList = [];
                        listType = 'ul';
                    }
                    currentList.push(`<li>${bulletMatch[1].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`);
                    continue;
                }
                
                // Close any open list before processing non-list items
                if (currentList) {
                    sectionHtml += `<${listType}>` + currentList.join('') + `</${listType}>`;
                    currentList = null;
                    listType = null;
                }
                
                // Check if line is a tip (starts with 💡)
                if (line.startsWith('💡')) {
                    sectionHtml += `<span class="info-tip">${line}</span>`;
                }
                // Check if line is workflow title (contains "Ablauf" or "Workflow" or similar)
                else if (line.match(/^(Ablauf|Workflow|Порядок действий|Arbetsflöde|Työnkulku)/i) && line.includes('(')) {
                    sectionHtml += `<h2 class="info-workflow-title">${line}</h2>`;
                }
                // Check if line looks like a section title (first line of a section, not containing : or starting with number)
                else if (i === 0 && !line.includes(':') && !line.match(/^\d+\./)) {
                    sectionHtml += `<h2 class="info-section-title">${line}</h2>`;
                } else {
                    // Regular paragraph
                    sectionHtml += `<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
                }
            }
            
            // Close any remaining list
            if (currentList) {
                sectionHtml += `<${listType}>` + currentList.join('') + `</${listType}>`;
            }
            
            // Add section to HTML
            if (sectionHtml) {
                html += sectionHtml;
                // Add divider after each section except the last one
                if (index < sections.length - 1) {
                    html += '<hr class="info-divider">';
                }
            }
        });
        
        return html;
    }
    
    function updateInfoContent(language) {
        const contentDiv = document.querySelector('.info-content');
        if (!contentDiv) return;
        
        const content = infoContent[language] || infoContent.de;
        const htmlContent = convertMarkdownToHTML(content);
        
        // Update content while preserving the language selector and close button
        const languageSelector = contentDiv.querySelector('.info-language-selector');
        const closeButton = contentDiv.querySelector('#infoCloseBtn');
        
        contentDiv.innerHTML = htmlContent;
        
        // Re-add language selector at the top
        if (languageSelector) {
            contentDiv.insertBefore(languageSelector, contentDiv.firstChild);
        }
        
        // Re-add close button at the bottom
        if (closeButton) {
            closeButton.textContent = closeButtonText[language] || closeButtonText.de;
            contentDiv.appendChild(closeButton);
        }
    }
    
    function showInfo(scrollToSection) {
        const modal = document.createElement('div');
        modal.className = 'info-modal';
        
        // Get saved language or default to German
        const savedLanguage = AppStorage.getItem('infoLanguage') || 'de';
        
        modal.innerHTML = `
            <div class="info-content">
                <div class="info-language-selector">
                    <select id="infoLanguageSelect">
                        <option value="de">&#x1F1E9;&#x1F1EA; Deutsch</option>
                        <option value="en">&#x1F1FA;&#x1F1F8; English</option>
                        <option value="ru">&#x1F1F7;&#x1F1FA; Русский</option>
                        <option value="sv">&#x1F1F8;&#x1F1EA; Svenska</option>
                        <option value="fi">&#x1F1EB;&#x1F1EE; Suomi</option>
                        <option value="fr">&#x1F1EB;&#x1F1F7; Français</option>
                    </select>
                </div>
                <button id="infoCloseBtn" class="info-close-btn">${closeButtonText[savedLanguage]}</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Set the saved language
        const languageSelect = document.getElementById('infoLanguageSelect');
        if (languageSelect) {
            languageSelect.value = savedLanguage;
            
            // Load content for saved language
            updateInfoContent(savedLanguage);
            
            // Language change event listener
            languageSelect.addEventListener('change', (e) => {
                const selectedLanguage = e.target.value;
                AppStorage.setItem('infoLanguage', selectedLanguage);
                updateInfoContent(selectedLanguage);
            });
        }
        
        // After modal content is loaded, scroll to section if specified
        if (scrollToSection) {
            setTimeout(() => {
                const infoContent = document.querySelector('.info-content');
                if (!infoContent) return;
                
                // Find the section with matching title
                const allTitles = infoContent.querySelectorAll('.info-section-title');
                allTitles.forEach(title => {
                    const titleText = title.textContent.toLowerCase();
                    const sectionName = scrollToSection.replace(/-/g, ' ').toLowerCase();
                    
                    if (titleText.includes(sectionName)) {
                        title.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            }, 100);
        }
        
        // Close button event listener
        document.getElementById('infoCloseBtn')?.addEventListener('click', () => {
            modal.remove();
        });
        
        // Close when clicking outside the modal content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // Public API
    return {
        init,
        getCurrentTeamInfo,
        saveTeams,
        updateButtonStates,
        resetCurrentTeam,
        showInfo
    };
})();
