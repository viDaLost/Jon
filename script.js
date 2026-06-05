/*
 * Main JavaScript for the Bunker adventure game.
 * The code orchestrates the different phases of the game: the intro screen,
 * the scavenging/collect phase where the player gathers items under a time
 * limit, and the survival phase where the player must make decisions to
 * keep the group alive. It's designed to be simple yet extendable.
 */

// Global game state object. This tracks the current phase, inventory, timer,
// character stats and other variables needed between phases.
const game = {
  state: 'start',    // start | collect | survival | end
  timeLeft: 60,      // seconds for the collect phase
  maxCapacity: 8,    // maximum weight (hands) the player can carry
  inventory: [],     // collected items in the collect phase
  collectedWeight: 0,
  itemsDef: [        // definitions for each spawnable item
    { id: 'water', name: 'Вода', icon: 'assets/images/water.png', weight: 1 },
    { id: 'food', name: 'Еда', icon: 'assets/images/food.png', weight: 1 },
    { id: 'medkit', name: 'Аптечка', icon: 'assets/images/medkit.png', weight: 2 },
    { id: 'map', name: 'Карта', icon: 'assets/images/map.png', weight: 1 },
    { id: 'flashlight', name: 'Фонарик', icon: 'assets/images/flashlight.png', weight: 1 },
    { id: 'radio', name: 'Радио', icon: 'assets/images/radio.png', weight: 2 }
  ],
  // Character definitions. The game revolves around keeping these people alive.
  characters: [
    { id: 'max', name: 'Макс', image: 'assets/images/max.png', hunger: 0, thirst: 0, health: 100, alive: true },
    { id: 'lena', name: 'Лена', image: 'assets/images/lena.png', hunger: 0, thirst: 0, health: 100, alive: true },
    { id: 'sasha', name: 'Саша', image: 'assets/images/sasha.png', hunger: 0, thirst: 0, health: 100, alive: true },
    { id: 'misha', name: 'Миша', image: 'assets/images/misha.png', hunger: 0, thirst: 0, health: 100, alive: true }
  ],
  day: 1,
  events: [],        // will be filled with event definitions
  currentEvent: null,// currently displayed event (during survival)
  log: []            // log messages for display
};

// Entry point: render initial screen when the page loads
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  renderStartScreen();
});

/**
 * Initializes the list of potential events for the survival phase.
 * Each event has a text description and a list of options. Each option has
 * a text label and an effect function that alters the game state when
 * selected. More events can be added here to enrich gameplay.
 */
function initEvents() {
  game.events = [
    {
      id: 'rat',
      text: 'В вентиляции слышится шорох. Похоже, крыса пытается добраться до ваших запасов.',
      options: [
        {
          text: 'Игнорировать',
          effect: () => {
            game.log.push('Крыса съела часть еды.');
            consumeItem('food', 1);
          }
        },
        {
          text: 'Прогнать крысу',
          effect: () => {
            // If we have a фонарик, we succeed easily
            if (hasItem('flashlight')) {
              game.log.push('Фонарик помог вам прогнать крысу без потерь.');
            } else {
              game.log.push('Вы прогнали крысу, но слегка поранились.');
              modifyHealth(-5);
            }
          }
        }
      ]
    },
    {
      id: 'noise',
      text: 'Снаружи слышны странные звуки. Кто‑то или что‑то бродит поблизости.',
      options: [
        {
          text: 'Игнорировать',
          effect: () => {
            game.log.push('Вы решили не рисковать. Возможно, это было мудро.');
          }
        },
        {
          text: 'Послать кого‑нибудь проверить',
          effect: () => {
            if (hasItem('map')) {
              game.log.push('С картой вы быстро нашли источник шума и нашли дополнительную воду.');
              addItem('water', 1);
            } else {
              game.log.push('Персонаж заблудился и вернулся уставшим.');
              modifyHealth(-10);
            }
          }
        }
      ]
    },
    {
      id: 'illness',
      text: 'Один из ваших спутников чувствует себя плохо. Возможно, требуется лечение.',
      options: [
        {
          text: 'Использовать аптечку',
          effect: () => {
            if (consumeItem('medkit', 1)) {
              game.log.push('Аптечка помогла вылечить болезнь. Здоровье улучшилось.');
              modifyHealth(+20);
            } else {
              game.log.push('У вас нет аптечки!');
              modifyHealth(-15);
            }
          }
        },
        {
          text: 'Пусть организм справится сам',
          effect: () => {
            game.log.push('Вы решили не вмешиваться. Болезнь прогрессирует.');
            modifyHealth(-10);
          }
        }
      ]
    },
    {
      id: 'radio',
      text: 'Радио ловит сигнал. Вы услышали сообщение о возможном спасении.',
      options: [
        {
          text: 'Ответить на сообщение',
          effect: () => {
            if (hasItem('radio')) {
              // chance to win early if we have радио
              const rescued = Math.random() < 0.3;
              if (rescued) {
                game.log.push('Вы ответили на сообщение. Спасатели нашли вас!');
                endGame(true);
                return;
              } else {
                game.log.push('Вы ответили на сообщение, но пока никакой реакции.');
              }
            } else {
              game.log.push('У вас нет радио для ответа.');
            }
          }
        },
        {
          text: 'Игнорировать',
          effect: () => {
            game.log.push('Вы не доверяете неизвестным передачам и решили игнорировать.');
          }
        }
      ]
    }
  ];
}

/**
 * Renders the start screen. Provides a brief description and a button to
 * begin the collect phase. Clears any existing content in the app container.
 */
function renderStartScreen() {
  game.state = 'start';
  const app = document.getElementById('app');
  app.innerHTML = '';
  const screen = document.createElement('div');
  screen.id = 'start-screen';
  screen.className = 'screen';
  const title = document.createElement('h1');
  title.textContent = 'Бункер: приключение';
  const desc = document.createElement('p');
  desc.textContent = 'У вас есть 60 секунд, чтобы собрать припасы перед неизбежной катастрофой. После этого вы вместе с семьёй отправитесь в убежище и попытаетесь выжить, принимая непростые решения каждый день.';
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = 'Начать';
  btn.addEventListener('click', () => {
    startCollectPhase();
  });
  screen.appendChild(title);
  screen.appendChild(desc);
  screen.appendChild(btn);
  app.appendChild(screen);
}

/**
 * Initializes the collect phase: resets timers and inventory, spawns items
 * randomly in the collect area and starts the countdown timer.
 */
function startCollectPhase() {
  game.state = 'collect';
  // reset the timer for the scavenging phase
  game.timeLeft = 60;
  game.inventory = [];
  game.collectedWeight = 0;
  const app = document.getElementById('app');
  app.innerHTML = '';
  const screen = document.createElement('div');
  screen.id = 'collect-screen';
  screen.className = 'screen';
  // Collect area where items appear
  const area = document.createElement('div');
  area.id = 'collect-area';
  // Info bar
  const info = document.createElement('div');
  info.id = 'collect-info';
  const timer = document.createElement('div');
  timer.id = 'timer';
  timer.textContent = `⏱ ${game.timeLeft}s`;
  const inv = document.createElement('div');
  inv.id = 'inventory';
  info.appendChild(timer);
  info.appendChild(inv);
  screen.appendChild(area);
  screen.appendChild(info);
  app.appendChild(screen);
  // Spawn items
  spawnCollectItems(area);
  // Start timer countdown
  const interval = setInterval(() => {
    game.timeLeft--;
    timer.textContent = `⏱ ${game.timeLeft}s`;
    if (game.timeLeft <= 0) {
      clearInterval(interval);
      // End collect phase when time is up
      startSurvivalPhase();
    }
  }, 1000);
}

/**
 * Randomly places a set of items in the collect area. Each item is a div with
 * an image and click handler that attempts to add the item to the player's
 * inventory. If carrying capacity is exceeded, clicking does nothing.
 *
 * @param {HTMLElement} area The container element where items will appear.
 */
function spawnCollectItems(area) {
  // Determine how many items to spawn based on screen size
  const itemCount = 10 + Math.floor(Math.random() * 5);
  const areaRect = area.getBoundingClientRect();
  for (let i = 0; i < itemCount; i++) {
    // Pick a random item type
    const itemDef = game.itemsDef[Math.floor(Math.random() * game.itemsDef.length)];
    const item = document.createElement('div');
    item.className = 'collect-item';
    const img = document.createElement('img');
    img.src = itemDef.icon;
    img.alt = itemDef.name;
    item.appendChild(img);
    // random position within area bounds (leaving margin)
    const margin = 60;
    const x = Math.random() * (area.offsetWidth - margin) + margin / 2;
    const y = Math.random() * (area.offsetHeight - margin) + margin / 2;
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    // click handler
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      // check capacity
      if (game.collectedWeight + itemDef.weight <= game.maxCapacity) {
        game.inventory.push(itemDef.id);
        game.collectedWeight += itemDef.weight;
        updateInventoryDisplay();
        // remove item
        item.remove();
      }
    });
    area.appendChild(item);
  }
  // Update inventory display initially
  function updateInventoryDisplay() {
    const invDiv = document.getElementById('inventory');
    invDiv.innerHTML = '';
    // show icons of collected items
    game.inventory.forEach((id) => {
      const def = game.itemsDef.find(d => d.id === id);
      const img = document.createElement('img');
      img.src = def.icon;
      img.alt = def.name;
      invDiv.appendChild(img);
    });
  }
}

/**
 * Begins the survival phase. Computes initial supplies from collected items and
 * resets day and log. Displays the survival interface, including status
 * information, character statuses and the event area.
 */
function startSurvivalPhase() {
  game.state = 'survival';
  // convert collected items into counts
  game.supplies = {};
  game.itemsDef.forEach(def => {
    game.supplies[def.id] = 0;
  });
  game.inventory.forEach(id => {
    if (game.supplies[id] !== undefined) game.supplies[id]++;
  });
  game.day = 1;
  game.log = [];
  const app = document.getElementById('app');
  app.innerHTML = '';
  const screen = document.createElement('div');
  screen.id = 'survival-screen';
  // status bar
  const status = document.createElement('div');
  status.id = 'status-bar';
  screen.appendChild(status);
  // content area
  const content = document.createElement('div');
  content.id = 'survival-content';
  screen.appendChild(content);
  app.appendChild(screen);
  // Render first day
  renderSurvivalDay();
}

/**
 * Renders the survival day view: updates the status bar, shows character
 * statuses, logs and triggers an event to occur for the day. After the
 * player resolves the event, the game will proceed to the next day.
 */
function renderSurvivalDay() {
  // If all characters dead, game over
  if (game.characters.every(ch => !ch.alive)) {
    endGame(false);
    return;
  }
  // each day, reduce hunger and thirst and consume supplies
  if (game.day > 1) {
    // consumption: one water and one food per alive character
    game.characters.forEach(ch => {
      if (!ch.alive) return;
      if (consumeItem('water', 1)) {
        ch.thirst = Math.max(0, ch.thirst - 20);
      } else {
        ch.thirst += 20;
      }
      if (consumeItem('food', 1)) {
        ch.hunger = Math.max(0, ch.hunger - 20);
      } else {
        ch.hunger += 20;
      }
      // thirst and hunger damage health
      if (ch.thirst > 80) ch.health -= 10;
      if (ch.hunger > 80) ch.health -= 10;
      if (ch.health <= 0) {
        ch.alive = false;
        game.log.push(`${ch.name} умер от истощения.`);
      }
    });
  }
  // Update status bar
  const statusBar = document.getElementById('status-bar');
  statusBar.innerHTML = '';
  const dayDiv = document.createElement('div');
  dayDiv.textContent = `День ${game.day}`;
  const suppliesDiv = document.createElement('div');
  suppliesDiv.textContent = `Вода: ${game.supplies.water || 0} | Еда: ${game.supplies.food || 0} | Аптечки: ${game.supplies.medkit || 0}`;
  statusBar.appendChild(dayDiv);
  statusBar.appendChild(suppliesDiv);
  // Build survival content
  const content = document.getElementById('survival-content');
  content.innerHTML = '';
  // Character statuses
  game.characters.forEach(ch => {
    const row = document.createElement('div');
    row.className = 'character-row';
    const img = document.createElement('img');
    img.src = ch.image;
    img.alt = ch.name;
    row.appendChild(img);
    const text = document.createElement('div');
    if (!ch.alive) {
      text.innerHTML = `<strong>${ch.name}:</strong> мёртв.`;
    } else {
      text.innerHTML = `<strong>${ch.name}:</strong> здоровье ${ch.health}%, голод ${ch.hunger}%, жажда ${ch.thirst}%`;
    }
    row.appendChild(text);
    content.appendChild(row);
  });
  // Show log messages
  if (game.log.length > 0) {
    const logDiv = document.createElement('div');
    logDiv.className = 'event';
    logDiv.innerHTML = '<p><em>События предыдущего дня:</em></p>';
    game.log.slice(-3).forEach(msg => {
      const p = document.createElement('p');
      p.textContent = '• ' + msg;
      logDiv.appendChild(p);
    });
    content.appendChild(logDiv);
  }
  // Trigger a random event
  const event = game.events[Math.floor(Math.random() * game.events.length)];
  game.currentEvent = event;
  const eventDiv = document.createElement('div');
  eventDiv.className = 'event';
  const p = document.createElement('p');
  p.textContent = event.text;
  eventDiv.appendChild(p);
  const optionsDiv = document.createElement('div');
  optionsDiv.className = 'options';
  event.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = opt.text;
    btn.addEventListener('click', () => {
      // apply effect
      opt.effect();
      // after effect, check for end state
      if (game.state !== 'survival') return;
      // increment day and render next day
      game.day++;
      renderSurvivalDay();
    });
    optionsDiv.appendChild(btn);
  });
  eventDiv.appendChild(optionsDiv);
  content.appendChild(eventDiv);
  // If reached day 20 with radio, auto rescue chance
  if (game.day >= 20 && hasItem('radio')) {
    const chance = Math.random();
    if (chance < 0.5) {
      game.log.push('После долгих дней ожидания в ваш бункер пришла помощь. Вы спасены!');
      endGame(true);
    }
  }
}

/**
 * Ends the game and shows an ending screen. The parameter indicates whether
 * the player achieved a successful rescue or not.
 *
 * @param {boolean} rescued Whether the characters were rescued (true) or died (false).
 */
function endGame(rescued) {
  game.state = 'end';
  const app = document.getElementById('app');
  app.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'screen';
  const title = document.createElement('h1');
  title.textContent = rescued ? 'Спасение!' : 'Конец';
  const message = document.createElement('p');
  message.textContent = rescued
    ? 'Вы смогли продержаться достаточно долго, и спасатели нашли вас. Поздравляем!'
    : 'Ваши запасы иссякли, и никто не выжил. Попробуйте снова.';
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = 'Сыграть ещё раз';
  btn.addEventListener('click', () => {
    renderStartScreen();
  });
  screen.appendChild(title);
  screen.appendChild(message);
  screen.appendChild(btn);
  app.appendChild(screen);
}

/**
 * Helper to check whether the player has at least one instance of a supply
 * item in their inventory (during survival). This does not consume the item.
 *
 * @param {string} id Identifier of the supply (e.g. 'water').
 * @returns {boolean} True if at least one is available.
 */
function hasItem(id) {
  return game.supplies && game.supplies[id] > 0;
}

/**
 * Consumes a number of supply items from the player's inventory during
 * survival phase. If not enough items are present, consumes what is available
 * and returns false.
 *
 * @param {string} id Identifier of the supply
 * @param {number} count Number of items to consume
 * @returns {boolean} True if the requested amount was fully consumed
 */
function consumeItem(id, count) {
  if (!game.supplies || !game.supplies[id]) return false;
  if (game.supplies[id] >= count) {
    game.supplies[id] -= count;
    return true;
  } else {
    // consume whatever is left
    game.supplies[id] = 0;
    return false;
  }
}

/**
 * Adds supply items to the player's inventory during survival phase.
 *
 * @param {string} id Supply identifier
 * @param {number} count Number of items to add
 */
function addItem(id, count) {
  if (!game.supplies) return;
  if (!game.supplies[id]) game.supplies[id] = 0;
  game.supplies[id] += count;
}

/**
 * Modifies the health of all alive characters by a given delta. If health drops
 * to zero or below, the character is marked as dead.
 *
 * @param {number} delta Amount to add to health (can be negative)
 */
function modifyHealth(delta) {
  game.characters.forEach(ch => {
    if (!ch.alive) return;
    ch.health += delta;
    if (ch.health > 100) ch.health = 100;
    if (ch.health <= 0) {
      ch.alive = false;
      game.log.push(`${ch.name} умер.`);
    }
  });
}