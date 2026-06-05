'use strict';

const VERSION = 'rebuilt-random-protocol-v1';
const SAVE_KEY = 'bunker-after-siren-save-v1';
const app = document.getElementById('app');
const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes?.();
}

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (value) => Math.random() < value;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const byId = (id) => document.getElementById(id);

const ITEM_DEFS = [
  { id: 'water', name: 'Вода', icon: 'assets/images/water.svg', desc: 'Чистая вода для пайков и лечения.' },
  { id: 'food', name: 'Консервы', icon: 'assets/images/food.svg', desc: 'Питание, которое держит людей на ногах.' },
  { id: 'medkit', name: 'Аптечка', icon: 'assets/images/medkit.svg', desc: 'Лечение травм и болезней.' },
  { id: 'battery', name: 'Батарея', icon: 'assets/images/battery.svg', desc: 'Энергия для дверей, радио и тепла.' },
  { id: 'filter', name: 'Фильтр', icon: 'assets/images/filter.svg', desc: 'Очищает воздух и снижает заражение.' },
  { id: 'toolkit', name: 'Инструменты', icon: 'assets/images/toolkit.svg', desc: 'Ремонт механизмов и укрепление шлюзов.' },
  { id: 'radio', name: 'Радиомодуль', icon: 'assets/images/radio.svg', desc: 'Ускоряет набор сигнала спасения.' },
  { id: 'flare', name: 'Сигнальная ракета', icon: 'assets/images/flare.svg', desc: 'Редкий шанс заявить о себе спасателям.' },
  { id: 'diary', name: 'Дневник', icon: 'assets/images/diary.svg', desc: 'Помогает сохранить рассудок и расшифровать метки.' },
  { id: 'valve', name: 'Клапан', icon: 'assets/images/valve.svg', desc: 'Запасная деталь для вентиляции и водяных труб.' }
];

const ITEM_BY_ID = Object.fromEntries(ITEM_DEFS.map((item) => [item.id, item]));

const CHARACTER_TEMPLATES = [
  {
    id: 'nika',
    name: 'Ника',
    role: 'фельдшер',
    image: 'assets/images/nika.svg',
    skill: 'medic',
    bio: 'Сохраняет холодную голову, когда остальные уже слышат сирену внутри себя.'
  },
  {
    id: 'roman',
    name: 'Роман',
    role: 'инженер',
    image: 'assets/images/roman.svg',
    skill: 'engineer',
    bio: 'Чинит то, что по инструкции уже невозможно починить.'
  },
  {
    id: 'mira',
    name: 'Мира',
    role: 'разведчица',
    image: 'assets/images/mira.svg',
    skill: 'scout',
    bio: 'Замечает тайники, свежие следы и опасные маршруты раньше всех.'
  },
  {
    id: 'timur',
    name: 'Тимур',
    role: 'связист',
    image: 'assets/images/timur.svg',
    skill: 'operator',
    bio: 'Может услышать смысл даже в мёртвом радиоэфире.'
  }
];

const DIFFICULTY = {
  story: {
    label: 'История',
    desc: 'Больше находок, мягче урон. Подходит для первого прохождения.',
    findChance: .92,
    drain: .78,
    hazard: .72,
    startBonus: 3
  },
  normal: {
    label: 'Выживание',
    desc: 'Баланс случайности, риска и тактических решений.',
    findChance: .78,
    drain: 1,
    hazard: 1,
    startBonus: 1
  },
  hard: {
    label: 'Пепел',
    desc: 'Меньше удачи, больше последствий. Каждый предмет имеет цену.',
    findChance: .62,
    drain: 1.24,
    hazard: 1.2,
    startBonus: 0
  }
};

const FIND_TABLE = [
  { text: 'За осыпавшейся плитой нашёлся аварийный пакет.', items: ['water', 'food', 'battery'] },
  { text: 'Старый шкаф открылся от вибрации. Внутри лежали забытые припасы.', items: ['food', 'filter', 'diary'] },
  { text: 'В дренажной шахте обнаружился сухой контейнер.', items: ['water', 'toolkit', 'valve'] },
  { text: 'Под койкой звякнул металлический ящик с маркировкой эвакуации.', items: ['medkit', 'battery', 'flare'] },
  { text: 'Мира заметила свежую трещину в бетонной стене — за ней оказался тайник.', items: ['radio', 'water', 'food'] },
  { text: 'С потолка упала вентиляционная решётка. За ней были спрятаны детали.', items: ['filter', 'valve', 'toolkit'] }
];

const AMBIENT_NOTES = [
  'Где-то за стеной долго скребёт металл, но источник звука так и не находится.',
  'На полу проступает тонкая дорожка пыли, будто бункер медленно выдыхает.',
  'Лампы мерцают три раза подряд. Тимур записывает это как возможный код.',
  'Старые динамики шепчут обрывок чужого позывного и снова замолкают.',
  'Карта на двери покрывается каплями конденсата, похожими на новые маршруты.'
];

const EVENTS = [
  {
    id: 'filters',
    tag: 'Вентиляция',
    title: 'Глухой кашель фильтров',
    text: 'Воздух стал тяжёлым, а вентиляционный блок издаёт звук, будто в нём перекатывается песок. Если промедлить, бункер начнёт травить людей усталостью.',
    options: [
      {
        label: 'Поставить новый фильтр',
        hint: 'Надёжное решение, но расходует редкий предмет.',
        consume: { filter: 1 },
        successText: 'Фильтр встал идеально. Воздух стал холоднее и чище.',
        effects: { bunker: { air: +26, power: -3 }, morale: +3 }
      },
      {
        label: 'Собрать временную кассету',
        hint: 'Рискованный ремонт. Инженер повышает шанс успеха.',
        consume: { valve: 1 },
        chance: .62,
        skill: 'engineer',
        successText: 'Самодельная кассета держится. Вентиляция снова тянет.',
        failText: 'Клапан заклинило. Воздух стал хуже, а Роман вымотался.',
        success: { bunker: { air: +17, integrity: +3 }, characterSkill: { engineer: { fatigue: +7 } } },
        fail: { bunker: { air: -16, power: -7 }, characterSkill: { engineer: { fatigue: +13, health: -5 } } }
      },
      {
        label: 'Заглушить тревогу и экономить силы',
        hint: 'Ничего не тратите, но проблема остаётся.',
        effects: { bunker: { air: -13 }, morale: -4 },
        successText: 'Сигнал тревоги замолк, но воздух заметно тяжелее.'
      }
    ]
  },
  {
    id: 'knock',
    tag: 'Шлюз',
    title: 'Три удара снаружи',
    text: 'Кто-то стучит в наружную дверь ровно три раза, делает паузу и повторяет. Это может быть человек, ловушка или просто металл, который гнёт ночной ветер.',
    options: [
      {
        label: 'Говорить через динамик',
        hint: 'Связист повышает шанс получить помощь без риска.',
        chance: .58,
        skill: 'operator',
        successText: 'Это оказался уцелевший техник. Он оставил у шлюза пакет и ушёл по своим координатам.',
        failText: 'Ответа нет. Только скрежет и короткий удар по двери.',
        success: { randomItems: { count: 2 }, bunker: { morale: +7, signal: +5 } },
        fail: { bunker: { morale: -5, integrity: -6 } }
      },
      {
        label: 'Открыть внешний ящик, не открывая дверь',
        hint: 'Можно найти случайные предметы, но механизм повредит шлюз.',
        consume: { battery: 1 },
        successText: 'Ящик открылся. Внутри — чужая записка и кое-какие вещи.',
        effects: { randomItems: { count: 2 }, bunker: { integrity: -5, signal: +3 } }
      },
      {
        label: 'Полная тишина',
        hint: 'Самый безопасный вариант для бункера, но плохой для морали.',
        successText: 'Вы не подали признаков жизни. Стук прекратился через час.',
        effects: { bunker: { morale: -7, integrity: +2 } }
      }
    ]
  },
  {
    id: 'waterline',
    tag: 'Трубы',
    title: 'Горькая вода в кране',
    text: 'Из резервного крана идёт вода с металлическим запахом. Её можно очистить, перекрыть или попробовать использовать для технических нужд.',
    options: [
      {
        label: 'Прогнать через фильтр',
        hint: 'Получите воду без серьёзных последствий.',
        consume: { filter: 1 },
        successText: 'После фильтрации вода стала безопасной.',
        effects: { supplies: { water: +3 }, bunker: { air: -2 } }
      },
      {
        label: 'Разобрать трубу инструментами',
        hint: 'Шанс получить воду и клапан. Инженер помогает.',
        consume: { toolkit: 1 },
        chance: .66,
        skill: 'engineer',
        successText: 'Трубу удалось снять аккуратно. Внутри нашёлся чистый участок резервуара.',
        failText: 'Резьба сорвалась, и часть пола залило грязной водой.',
        success: { supplies: { water: +2, valve: +1 }, bunker: { integrity: +2 } },
        fail: { bunker: { integrity: -12, air: -7 }, randomDamage: { health: -4 } }
      },
      {
        label: 'Закрыть кран и не рисковать',
        hint: 'Ничего не тратите, но теряете шанс на воду.',
        successText: 'Кран закрыт. Вода ушла обратно в систему.',
        effects: { bunker: { morale: -2 } }
      }
    ]
  },
  {
    id: 'radio-noise',
    tag: 'Эфир',
    title: 'Голос в белом шуме',
    text: 'Радио ловит фразу: «…северный сектор… маяк… повторите координаты…». Сигнал слабый, но это первая настоящая ниточка к спасению.',
    options: [
      {
        label: 'Усилить передатчик батареей',
        hint: 'Большой прогресс спасения, если есть радиомодуль.',
        require: { radio: 1 },
        consume: { battery: 1 },
        successText: 'Передатчик ожил. В эфир ушли координаты бункера.',
        effects: { bunker: { signal: +28, power: -4, morale: +8 } }
      },
      {
        label: 'Расшифровать обрывок по дневнику',
        hint: 'Дешевле, но слабее. Дневник не расходуется.',
        require: { diary: 1 },
        successText: 'В заметках нашёлся похожий код. Тимур уточнил частоту.',
        effects: { bunker: { signal: +14, morale: +5 } }
      },
      {
        label: 'Записать и ждать следующей волны',
        hint: 'Безопасно, но шанс может уйти.',
        successText: 'Сигнал записан. Возможно, он повторится.',
        effects: { bunker: { signal: +5, morale: +1 } }
      }
    ]
  },
  {
    id: 'sick',
    tag: 'Лазарет',
    title: 'Лихорадка после полуночи',
    text: 'Один из выживших бледнеет и почти не реагирует на разговор. Похоже на заражение пылью или сильное истощение.',
    options: [
      {
        label: 'Использовать аптечку',
        hint: 'Фельдшер усиливает лечение.',
        consume: { medkit: 1 },
        successText: 'Ника быстро стабилизировала состояние. Больной снова может стоять.',
        effects: { weakest: { health: +28, fatigue: -18, mind: +8 }, bunker: { morale: +4 } }
      },
      {
        label: 'Изолировать и дать воду',
        hint: 'Дешевле аптечки, но хуже для духа команды.',
        consume: { water: 1 },
        successText: 'Изоляция помогла сбить приступ, но страх остался в комнате.',
        effects: { weakest: { health: +11, fatigue: -6 }, bunker: { morale: -5 } }
      },
      {
        label: 'Перетерпеть до утра',
        hint: 'Ничего не тратите. Последствия случайны.',
        chance: .38,
        skill: 'medic',
        successText: 'К утру температура сама пошла вниз.',
        failText: 'Состояние резко ухудшилось, и паника прокатилась по бункеру.',
        success: { weakest: { health: +5, fatigue: +4 }, bunker: { morale: +1 } },
        fail: { weakest: { health: -22, mind: -8 }, bunker: { morale: -10 } }
      }
    ]
  },
  {
    id: 'collapsed-room',
    tag: 'Завал',
    title: 'Комната за обвалом',
    text: 'За свежим завалом видна щель. Оттуда тянет холодом и слышен стук незакреплённой полки. Там могут быть вещи, но потолок опасно просел.',
    options: [
      {
        label: 'Отправить разведчика внутрь',
        hint: 'Мира повышает шанс найти предметы без травм.',
        chance: .57,
        skill: 'scout',
        successText: 'Мира проскользнула внутрь и вытащила сухой пакет с припасами.',
        failText: 'Потолок осыпался. Разведчик выбрался, но получил ушибы.',
        success: { randomItems: { count: 3 }, characterSkill: { scout: { fatigue: +10 } } },
        fail: { randomDamage: { health: -12, fatigue: +18 }, bunker: { integrity: -8 } }
      },
      {
        label: 'Разобрать завал инструментами',
        hint: 'Тише и надёжнее, но расходует набор.',
        consume: { toolkit: 1 },
        successText: 'Завал разобрали по слоям. В комнате нашёлся рабочий ящик.',
        effects: { randomItems: { count: 2 }, bunker: { integrity: +4 } }
      },
      {
        label: 'Пометить место и уйти',
        hint: 'Сохраните людей и бункер.',
        successText: 'Вы не стали тревожить слабый потолок.',
        effects: { bunker: { morale: -2 } }
      }
    ]
  },
  {
    id: 'cold',
    tag: 'Тепло',
    title: 'Температура падает',
    text: 'Термометр у входа просел ниже красной метки. Люди говорят тише, пальцы немеют, а батареи старого обогрева просят энергию.',
    options: [
      {
        label: 'Запитать обогреватель',
        hint: 'Тратит батарею, но снижает усталость и спасает здоровье.',
        consume: { battery: 1 },
        successText: 'Тепло медленно вернулось в отсек.',
        effects: { allCharacters: { fatigue: -16, health: +4, mind: +4 }, bunker: { power: -4, morale: +5 } }
      },
      {
        label: 'Собраться в центральном отсеке',
        hint: 'Морально тяжело, но без затрат.',
        successText: 'Ночь прошла тесно и почти без сна.',
        effects: { allCharacters: { fatigue: +10, mind: -3 }, bunker: { power: +2 } }
      },
      {
        label: 'Сжечь старые бумаги из архива',
        hint: 'Быстрое тепло ценой памяти.',
        require: { diary: 1 },
        successText: 'Огонь согрел отсек, но запах пепла напомнил, что прошлое тоже ресурс.',
        effects: { allCharacters: { fatigue: -8 }, supplies: { diary: -1 }, bunker: { morale: -7, air: -4 } }
      }
    ]
  },
  {
    id: 'panic',
    tag: 'Психика',
    title: 'Ночь, которая слишком длинная',
    text: 'В бункере не видно рассвета. Кто-то начинает считать удары сердца, кто-то спорит из-за пустяка. Если не вернуть людям цель, страх станет привычкой.',
    options: [
      {
        label: 'Провести честный совет',
        hint: 'Никаких предметов. Помогает, если люди ещё не слишком истощены.',
        chance: .64,
        successText: 'Разговор был тяжёлым, но после него стало легче дышать.',
        failText: 'Совет превратился в спор. Старые обиды всплыли наружу.',
        success: { bunker: { morale: +13 }, allCharacters: { mind: +5 } },
        fail: { bunker: { morale: -10 }, allCharacters: { mind: -6 } }
      },
      {
        label: 'Читать дневник вслух',
        hint: 'Дневник не тратится. Хорошо лечит рассудок.',
        require: { diary: 1 },
        successText: 'Записи о прежней жизни вернули людям ощущение времени.',
        effects: { bunker: { morale: +11 }, allCharacters: { mind: +9, fatigue: -3 } }
      },
      {
        label: 'Раздать лишний паёк',
        hint: 'Дорого, но работает почти всегда.',
        consume: { food: 1, water: 1 },
        successText: 'Обычный ужин стал маленьким праздником.',
        effects: { bunker: { morale: +15 }, allCharacters: { mind: +6, health: +3 } }
      }
    ]
  },
  {
    id: 'rats',
    tag: 'Склад',
    title: 'Шорох в сухом складе',
    text: 'В тёмном углу склада мелькает хвост. Если это крысы, они доберутся до еды. Если нет — лучше узнать, что именно живёт рядом с вами.',
    options: [
      {
        label: 'Поставить ловушку из клапана',
        hint: 'Шанс сохранить еду и найти ход.',
        consume: { valve: 1 },
        chance: .68,
        skill: 'scout',
        successText: 'Ловушка сработала. За складом нашёлся узкий служебный карман.',
        failText: 'Ловушка щёлкнула впустую. Ночью часть еды пропала.',
        success: { randomItems: { count: 1 }, bunker: { morale: +3 } },
        fail: { supplies: { food: -2 }, bunker: { morale: -5 } }
      },
      {
        label: 'Подсветить и шумом выгнать наружу',
        hint: 'Нужна батарея. Быстро и безопасно.',
        consume: { battery: 1 },
        successText: 'Резкий свет и звук прогнали вредителей.',
        effects: { bunker: { power: -2, morale: +2 } }
      },
      {
        label: 'Не трогать склад до утра',
        hint: 'Риск потерять случайный припас.',
        successText: 'Утром на полу нашли погрызенные упаковки.',
        effects: { loseRandomItem: { count: 1 }, bunker: { morale: -4 } }
      }
    ]
  },
  {
    id: 'map-room',
    tag: 'Карта',
    title: 'Схема под слоем копоти',
    text: 'На стене проступила старая схема убежища. На ней отмечен отсек, которого нет в ваших записях. Возможно, это путь к запасам или к плохим новостям.',
    options: [
      {
        label: 'Идти по схеме',
        hint: 'Разведчик помогает. Возможны случайные находки.',
        chance: .6,
        skill: 'scout',
        successText: 'Схема вывела к закрытой нише с аварийными вещами.',
        failText: 'Маршрут оказался старым. В коридоре обвалился боковой карман.',
        success: { randomItems: { count: 3 }, bunker: { signal: +4 } },
        fail: { bunker: { integrity: -10, air: -5 }, randomDamage: { health: -6, fatigue: +9 } }
      },
      {
        label: 'Сверить схему с дневником',
        hint: 'Безопасно, если дневник есть.',
        require: { diary: 1 },
        successText: 'Записи подсказали, что отметка ведёт к кабельной шахте.',
        effects: { bunker: { signal: +13, power: +5 } }
      },
      {
        label: 'Зарисовать и вернуться позже',
        hint: 'Небольшой бонус к сигналу без риска.',
        successText: 'Схема добавлена к плану выживания.',
        effects: { bunker: { signal: +4, morale: +2 } }
      }
    ]
  },
  {
    id: 'flare-window',
    tag: 'Поверхность',
    title: 'Короткое окно на поверхность',
    text: 'Датчики показывают: пыльная буря стихнет на несколько минут. Это шанс дать знак, но внешний люк скрипит так, будто не переживёт второго открытия.',
    options: [
      {
        label: 'Запустить сигнальную ракету',
        hint: 'Редкий мощный рывок к спасению.',
        consume: { flare: 1 },
        successText: 'Красная дуга ушла в серое небо. Через минуту радио ответило коротким писком.',
        effects: { bunker: { signal: +32, integrity: -5, morale: +12 } }
      },
      {
        label: 'Выставить антенну вручную',
        hint: 'Связист помогает, но кто-то устанет.',
        chance: .55,
        skill: 'operator',
        successText: 'Антенна поймала чистый канал. Координаты стали увереннее.',
        failText: 'Порыв ветра согнул антенну и ударил по люку.',
        success: { bunker: { signal: +18, integrity: -3 }, characterSkill: { operator: { fatigue: +12 } } },
        fail: { bunker: { signal: +3, integrity: -14 }, characterSkill: { operator: { health: -8, fatigue: +17 } } }
      },
      {
        label: 'Не открывать люк',
        hint: 'Безопасно для бункера, но шанс потерян.',
        successText: 'Окно прошло. Поверхность снова скрылась в пыли.',
        effects: { bunker: { morale: -5 } }
      }
    ]
  }
];

let game = null;

function freshCharacters() {
  return CHARACTER_TEMPLATES.map((character) => ({
    ...character,
    health: rnd(84, 100),
    mind: rnd(72, 96),
    fatigue: rnd(2, 14),
    alive: true,
    status: 'в строю'
  }));
}

function createInitialSupplies(mode) {
  const difficulty = DIFFICULTY[mode];
  const supplies = Object.fromEntries(ITEM_DEFS.map((item) => [item.id, 0]));
  const guaranteed = ['water', 'water', 'food', 'food', 'medkit', 'battery', 'filter', 'toolkit', 'diary'];
  guaranteed.slice(0, 6 + difficulty.startBonus).forEach((id) => supplies[id]++);
  const extraRolls = 6 + difficulty.startBonus + rnd(0, 3);
  for (let i = 0; i < extraRolls; i++) {
    const pool = i < 3 ? ['water', 'food', 'battery', 'filter'] : ITEM_DEFS.map((item) => item.id);
    supplies[pick(pool)]++;
  }
  return supplies;
}

function startNewGame(mode = 'normal') {
  const difficulty = DIFFICULTY[mode];
  game = {
    version: VERSION,
    mode,
    state: 'event',
    day: 1,
    bunker: {
      integrity: rnd(72, 88),
      power: rnd(58, 74),
      air: rnd(70, 88),
      signal: rnd(0, 8),
      morale: rnd(65, 80)
    },
    supplies: createInitialSupplies(mode),
    characters: freshCharacters(),
    currentEventId: null,
    resolved: null,
    eventHistory: [],
    log: [
      `Дверь бункера закрылась. Режим: ${difficulty.label}. Начальные припасы сгенерированы случайно.`,
      'В этой версии нет беготни по комнате: находки появляются через события, тайники и случайные аварийные пакеты.'
    ],
    counters: {
      foundItems: 0,
      lostItems: 0,
      eventsSolved: 0
    }
  };
  rollDailyFind(true);
  drawNextEvent();
  persist();
  renderGame();
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== VERSION) return false;
    game = parsed;
    renderGame();
    return true;
  } catch (error) {
    console.warn('Save loading failed', error);
    return false;
  }
}

function persist() {
  if (!game) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  } catch (error) {
    console.warn('Save failed', error);
  }
}

function resetSave() {
  localStorage.removeItem(SAVE_KEY);
  game = null;
  renderStart();
}

function currentDifficulty() {
  return DIFFICULTY[game?.mode || 'normal'];
}

function activeEvent() {
  return EVENTS.find((event) => event.id === game.currentEventId) || EVENTS[0];
}

function aliveCharacters() {
  return game.characters.filter((character) => character.alive);
}

function characterBySkill(skill) {
  return aliveCharacters().find((character) => character.skill === skill);
}

function weakestCharacter() {
  const alive = aliveCharacters();
  if (!alive.length) return null;
  return [...alive].sort((a, b) => (a.health + a.mind - a.fatigue) - (b.health + b.mind - b.fatigue))[0];
}

function totalSupplies() {
  return Object.values(game.supplies).reduce((sum, count) => sum + Math.max(0, count), 0);
}

function itemName(id) {
  return ITEM_BY_ID[id]?.name || id;
}

function addLog(message) {
  game.log.unshift(message);
  game.log = game.log.slice(0, 28);
}

function haptic(type = 'light') {
  tg?.HapticFeedback?.impactOccurred?.(type);
}

function toast(message) {
  let stack = byId('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  stack.appendChild(node);
  setTimeout(() => node.remove(), 2800);
}

function signed(value) {
  if (!value) return '0';
  return value > 0 ? `+${value}` : `${value}`;
}

function consume(items = {}) {
  for (const [id, amount] of Object.entries(items)) {
    if ((game.supplies[id] || 0) < amount) return false;
  }
  for (const [id, amount] of Object.entries(items)) {
    game.supplies[id] -= amount;
    game.counters.lostItems += amount;
  }
  return true;
}

function consumeUpTo(id, amount) {
  const available = game.supplies[id] || 0;
  const used = Math.min(available, amount);
  game.supplies[id] = available - used;
  game.counters.lostItems += used;
  return used >= amount;
}

function hasRequired(items = {}) {
  return Object.entries(items).every(([id, amount]) => (game.supplies[id] || 0) >= amount);
}

function addSupplies(items = {}) {
  for (const [id, delta] of Object.entries(items)) {
    const current = game.supplies[id] || 0;
    const next = Math.max(0, current + delta);
    if (delta > 0) game.counters.foundItems += delta;
    if (delta < 0) game.counters.lostItems += current - next;
    game.supplies[id] = next;
  }
}

function randomItems(count = 1) {
  const found = {};
  const pool = [
    'water', 'food', 'water', 'food', 'battery', 'filter', 'toolkit', 'medkit',
    'valve', 'diary', 'radio', 'flare'
  ];
  for (let i = 0; i < count; i++) {
    const id = pick(pool);
    found[id] = (found[id] || 0) + 1;
  }
  addSupplies(found);
  return found;
}

function formatItems(items = {}) {
  const entries = Object.entries(items).filter(([, count]) => count !== 0);
  if (!entries.length) return 'ничего';
  return entries.map(([id, count]) => `${itemName(id)} ×${Math.abs(count)}`).join(', ');
}

function loseRandomItem(count = 1) {
  const existing = Object.entries(game.supplies).filter(([, amount]) => amount > 0).map(([id]) => id);
  const lost = {};
  for (let i = 0; i < count && existing.length; i++) {
    const id = pick(existing);
    game.supplies[id] = Math.max(0, game.supplies[id] - 1);
    if (game.supplies[id] === 0) existing.splice(existing.indexOf(id), 1);
    lost[id] = (lost[id] || 0) + 1;
    game.counters.lostItems += 1;
  }
  return lost;
}

function mutateBunker(delta = {}) {
  Object.entries(delta).forEach(([key, value]) => {
    if (key === 'morale') key = 'morale';
    game.bunker[key] = clamp((game.bunker[key] || 0) + value);
  });
}

function mutateCharacter(character, delta = {}) {
  if (!character || !character.alive) return;
  if (typeof delta.health === 'number') character.health = clamp(character.health + delta.health);
  if (typeof delta.mind === 'number') character.mind = clamp(character.mind + delta.mind);
  if (typeof delta.fatigue === 'number') character.fatigue = clamp(character.fatigue + delta.fatigue);
  if (character.health <= 0 || character.mind <= 0) {
    character.alive = false;
    character.status = character.health <= 0 ? 'погиб' : 'сломлен';
    addLog(`${character.name} больше не может продолжать путь: ${character.status}.`);
  } else if (character.health < 35) {
    character.status = 'ранен';
  } else if (character.mind < 35) {
    character.status = 'на грани';
  } else if (character.fatigue > 75) {
    character.status = 'истощён';
  } else {
    character.status = 'в строю';
  }
}

function applyCharacterGroup(delta = {}) {
  aliveCharacters().forEach((character) => mutateCharacter(character, delta));
}

function applyEffectPack(pack = {}) {
  if (pack.supplies) addSupplies(pack.supplies);
  if (pack.bunker) mutateBunker(pack.bunker);
  if (typeof pack.morale === 'number') mutateBunker({ morale: pack.morale });
  if (pack.allCharacters) applyCharacterGroup(pack.allCharacters);
  if (pack.weakest) mutateCharacter(weakestCharacter(), pack.weakest);
  if (pack.randomDamage) mutateCharacter(pick(aliveCharacters()), pack.randomDamage);
  if (pack.randomItems) {
    const found = randomItems(pack.randomItems.count || 1);
    addLog(`Случайная находка: ${formatItems(found)}.`);
  }
  if (pack.loseRandomItem) {
    const lost = loseRandomItem(pack.loseRandomItem.count || 1);
    addLog(`Потеряно из запасов: ${formatItems(lost)}.`);
  }
  if (pack.characterSkill) {
    Object.entries(pack.characterSkill).forEach(([skill, delta]) => {
      mutateCharacter(characterBySkill(skill), delta);
    });
  }
}

function optionRequirements(option) {
  return { ...(option.require || {}), ...(option.consume || {}) };
}

function chanceFor(option) {
  let value = option.chance ?? 1;
  if (option.skill && characterBySkill(option.skill)) value += .17;
  if (game.bunker.morale > 72) value += .05;
  if (game.bunker.air < 30) value -= .08;
  if (game.bunker.power < 25) value -= .06;
  return Math.max(.08, Math.min(.96, value));
}

function resolveOption(optionIndex) {
  if (!game || game.resolved) return;
  const event = activeEvent();
  const option = event.options[optionIndex];
  if (!option) return;
  const requirements = optionRequirements(option);

  if (!hasRequired(requirements)) {
    haptic('heavy');
    toast('Не хватает предметов для этого решения');
    return;
  }

  if (option.consume && !consume(option.consume)) return;

  const success = chance(chanceFor(option));
  const pack = option.chance === undefined ? (option.effects || {}) : (success ? (option.success || {}) : (option.fail || {}));
  const text = option.chance === undefined ? option.successText : (success ? option.successText : option.failText);

  applyEffectPack(pack);
  game.counters.eventsSolved += 1;
  game.eventHistory.push(event.id);
  game.resolved = {
    title: success || option.chance === undefined ? 'Решение принято' : 'План сорвался',
    text,
    success: success || option.chance === undefined,
    option: option.label
  };
  addLog(`${event.title}: ${text}`);
  haptic(success ? 'medium' : 'heavy');
  checkEndings();
  persist();
  renderGame();
}

function applyDailyDrain() {
  const difficulty = currentDifficulty();
  const alive = aliveCharacters().length;
  if (!alive) return;

  const waterNeed = Math.max(1, Math.ceil(alive / 2));
  const foodNeed = game.day % 2 === 0 ? Math.max(1, Math.ceil(alive / 2)) : Math.max(1, Math.floor(alive / 3));
  const waterOk = consumeUpTo('water', waterNeed);
  const foodOk = consumeUpTo('food', foodNeed);

  if (!waterOk) {
    addLog('Воды не хватило на все пайки. Жажда ударила по здоровью и рассудку.');
    applyCharacterGroup({ health: -Math.round(8 * difficulty.drain), mind: -4, fatigue: +9 });
    mutateBunker({ morale: -8 });
  }

  if (!foodOk) {
    addLog('Еды не хватило. Люди стали тише и раздражительнее.');
    applyCharacterGroup({ health: -Math.round(5 * difficulty.drain), mind: -5, fatigue: +7 });
    mutateBunker({ morale: -7 });
  }

  const powerDrain = Math.round(rnd(4, 8) * difficulty.drain);
  const airDrain = Math.round(rnd(3, 6) * difficulty.drain);
  mutateBunker({ power: -powerDrain, air: -airDrain, signal: game.bunker.power < 25 ? -4 : +rnd(1, 4) });

  if (game.bunker.power <= 8) {
    addLog('Энергия почти на нуле. Радио и двери работают нестабильно.');
    mutateBunker({ morale: -6 });
  }

  if (game.bunker.air <= 22) {
    addLog('Воздух стал опасным. Каждый вдох даётся тяжелее.');
    applyCharacterGroup({ health: -9, fatigue: +8, mind: -5 });
  }

  if (game.bunker.integrity <= 24 && chance(.45 * difficulty.hazard)) {
    addLog('Слабая секция стены дала новую трещину.');
    mutateBunker({ integrity: -rnd(4, 9), air: -rnd(2, 5) });
  }

  applyCharacterGroup({ fatigue: rnd(2, 6), mind: game.bunker.morale < 32 ? -rnd(2, 5) : 0 });
}

function rollDailyFind(initial = false) {
  const difficulty = currentDifficulty();
  let findChance = difficulty.findChance;
  if (characterBySkill('scout')) findChance += .08;
  if (game.bunker.morale < 25) findChance -= .08;
  if (!initial && !chance(findChance)) {
    addLog(pick(AMBIENT_NOTES));
    return;
  }

  const entry = pick(FIND_TABLE);
  const count = initial ? 3 + currentDifficulty().startBonus : rnd(1, 2 + (characterBySkill('scout') ? 1 : 0));
  const found = {};
  for (let i = 0; i < count; i++) {
    const id = pick(entry.items);
    found[id] = (found[id] || 0) + 1;
  }
  addSupplies(found);
  addLog(`${entry.text} Найдено: ${formatItems(found)}.`);
}

function drawNextEvent() {
  const recentlyUsed = game.eventHistory.slice(-3);
  const available = EVENTS.filter((event) => !recentlyUsed.includes(event.id));
  game.currentEventId = pick(available.length ? available : EVENTS).id;
  game.resolved = null;
}

function nextDay() {
  if (!game) return;
  game.day += 1;
  applyDailyDrain();
  rollDailyFind(false);

  if (game.day >= 12 && game.bunker.signal >= 100) {
    endGame(true, 'Сигнал стал достаточно чистым. Спасатели подтвердили координаты и вывели группу через северный люк.');
    persist();
    renderGame();
    return;
  }

  if (game.day >= 32 && game.bunker.signal >= 45 && aliveCharacters().length > 0) {
    endGame(true, 'Вы продержались достаточно долго. Поздняя спасательная группа нашла бункер по слабому, но живому сигналу.');
    persist();
    renderGame();
    return;
  }

  if (game.day > 32) {
    endGame(false, 'Канал спасения так и не появился. Бункер стал тихой точкой на старой карте.');
    persist();
    renderGame();
    return;
  }

  checkEndings();
  if (game.state !== 'ending') drawNextEvent();
  persist();
  renderGame();
}

function checkEndings() {
  if (!game || game.state === 'ending') return;
  if (aliveCharacters().length === 0) {
    endGame(false, 'Команда не выдержала цену убежища. В бункере больше некому отвечать на радио.');
    return;
  }
  if (game.bunker.integrity <= 0) {
    endGame(false, 'Корпус убежища не выдержал. Последняя дверь сложилась внутрь, и бункер перестал быть убежищем.');
    return;
  }
  if (game.bunker.air <= 0) {
    endGame(false, 'Вентиляция окончательно умерла. Воздух стал тяжелее тишины.');
    return;
  }
  if (game.bunker.signal >= 100 && game.day >= 12) {
    endGame(true, 'Координаты приняты. На частоте спасателей прозвучало: «Держитесь, мы идём».');
  }
}

function endGame(rescued, text) {
  game.state = 'ending';
  game.ending = {
    rescued,
    title: rescued ? 'Спасение найдено' : 'Бункер замолчал',
    text
  };
  persist();
}

function renderStart() {
  const hasSave = !!localStorage.getItem(SAVE_KEY);
  app.innerHTML = `
    <main class="screen start-screen">
      <section class="start-shell">
        <div class="start-copy">
          <p class="kicker">⚠ протокол случайных находок</p>
          <h1>Бункер:<br>После сирены</h1>
          <p class="lead">Пересобранная версия: больше нет фазы сбора ресурсов. Каждый день — новая карточка события, случайные тайники, поломки, переговоры, состояние бункера и выжившие с разными сильными сторонами.</p>
          <div class="difficulty-grid">
            ${Object.entries(DIFFICULTY).map(([id, difficulty]) => `
              <button class="difficulty-card" data-action="new" data-mode="${id}">
                <strong>${difficulty.label}</strong>
                <span>${difficulty.desc}</span>
              </button>
            `).join('')}
          </div>
          <div class="start-actions">
            ${hasSave ? '<button class="btn secondary" data-action="continue">Продолжить сохранение</button>' : ''}
          </div>
        </div>
        <div class="start-art">
          <img src="assets/images/bunker.svg" alt="Иллюстрация подземного бункера" />
          <div class="start-art-badge"><strong>Новая логика</strong><br>Ресурсы не собираются руками — они появляются рандомно через тайники, решения и рискованные события.</div>
        </div>
      </section>
    </main>
  `;

  app.querySelectorAll('[data-action="new"]').forEach((button) => {
    button.addEventListener('click', () => startNewGame(button.dataset.mode));
  });
  app.querySelector('[data-action="continue"]')?.addEventListener('click', () => loadGame() || renderStart());
}

function renderGame() {
  if (!game) return renderStart();
  if (game.state === 'ending') return renderEnding();

  const event = activeEvent();
  const suppliesMarkup = ITEM_DEFS.map((item) => `
    <div class="item-chip" title="${item.desc}">
      <img src="${item.icon}" alt="${item.name}" />
      <div><strong>${item.name}</strong><span>×${game.supplies[item.id] || 0}</span></div>
    </div>
  `).join('');

  app.innerHTML = `
    <main class="screen">
      <header class="topbar">
        <div class="day-pill">☢ День ${game.day} <span class="dim">/ ${DIFFICULTY[game.mode].label}</span></div>
        <div class="topbar-actions">
          <button class="btn ghost" data-action="restart">Новая игра</button>
          <button class="btn secondary" data-action="save">Сохранить</button>
        </div>
      </header>
      <section class="game-layout">
        <div>
          <article class="panel bunker-panel">
            <div class="bunker-visual">
              <img src="assets/images/bunker.svg" alt="Подземный бункер" />
              <div class="bunker-caption">
                <div><strong>Убежище Норд‑7</strong><span>Случайные находки, рискованные решения, живой бункер.</span></div>
                <div><strong>${aliveCharacters().length}/${game.characters.length}</strong><span>выживших</span></div>
              </div>
            </div>
            <div class="stats-grid">
              ${statMarkup('Корпус', game.bunker.integrity, 'integrity')}
              ${statMarkup('Энергия', game.bunker.power, 'power')}
              ${statMarkup('Воздух', game.bunker.air, 'air')}
              ${statMarkup('Сигнал', game.bunker.signal, 'signal')}
              ${statMarkup('Дух', game.bunker.morale, 'morale')}
            </div>
          </article>
          <section class="content-grid">
            ${renderEventPanel(event)}
            <aside class="panel side-panel">
              <h3>🎒 Случайные запасы</h3>
              <p class="muted">Предметы появляются через ежедневные находки и последствия решений. Ручного сбора больше нет.</p>
              <div class="inventory-grid">${suppliesMarkup}</div>
            </aside>
          </section>
        </div>
        <aside class="sidebar">
          <section class="panel side-panel">
            <h3>👥 Команда</h3>
            <div class="characters-grid">${game.characters.map(characterMarkup).join('')}</div>
          </section>
          <section class="panel side-panel">
            <h3>📜 Журнал</h3>
            <div class="log-list">
              ${game.log.slice(0, 7).map((entry) => `<div class="log-entry">${entry}</div>`).join('')}
            </div>
          </section>
        </aside>
      </section>
    </main>
    <div id="toast-stack" class="toast-stack"></div>
  `;

  app.querySelector('[data-action="restart"]').addEventListener('click', resetSave);
  app.querySelector('[data-action="save"]').addEventListener('click', () => {
    persist();
    toast('Игра сохранена');
    haptic('light');
  });
  app.querySelectorAll('[data-choice]').forEach((button) => {
    button.addEventListener('click', () => resolveOption(Number(button.dataset.choice)));
  });
  app.querySelector('[data-action="next-day"]')?.addEventListener('click', nextDay);
}

function renderEventPanel(event) {
  if (game.resolved) {
    return `
      <article class="panel event-card">
        <div class="event-title-row">
          <div>
            <p class="kicker">итог решения</p>
            <h2>${game.resolved.title}</h2>
          </div>
          <span class="event-chip">${game.resolved.success ? 'Успех' : 'Последствие'}</span>
        </div>
        <div class="result-box">
          <p>${game.resolved.text}</p>
          <p class="dim">Следующий день автоматически принесёт расход пайков, изменение состояния бункера и новую случайную находку.</p>
        </div>
        <button class="btn" data-action="next-day">Перейти к следующему дню</button>
      </article>
    `;
  }

  return `
    <article class="panel event-card">
      <div class="event-title-row">
        <div>
          <p class="kicker">дневной протокол</p>
          <h2>${event.title}</h2>
        </div>
        <span class="event-chip">${event.tag}</span>
      </div>
      <p class="event-text">${event.text}</p>
      <div class="choice-list">
        ${event.options.map((option, index) => choiceMarkup(option, index)).join('')}
      </div>
    </article>
  `;
}

function statMarkup(label, value, type) {
  const condition = value < 30 ? 'bad' : value < 58 ? 'warn' : 'good';
  const extra = type === 'signal' ? 'signal' : type === 'morale' ? 'morale' : condition;
  return `
    <div class="stat ${extra}">
      <div class="stat-head"><span>${label}</span><strong>${clamp(value)}%</strong></div>
      <div class="meter" style="--value: ${clamp(value)}%"><i></i></div>
    </div>
  `;
}

function choiceMarkup(option, index) {
  const requirements = optionRequirements(option);
  const blocked = !hasRequired(requirements);
  const reqText = Object.keys(requirements).length ? `Нужно: ${formatItems(requirements)}` : '';
  const chanceText = option.chance !== undefined ? `Шанс: ${Math.round(chanceFor(option) * 100)}%` : 'Гарантированное последствие';
  return `
    <button class="choice ${blocked ? 'blocked' : ''}" data-choice="${index}" ${blocked ? 'aria-disabled="true"' : ''}>
      <strong>${option.label}</strong>
      <small>${option.hint}</small>
      <small class="requires">${chanceText}${reqText ? ` · ${reqText}` : ''}</small>
    </button>
  `;
}

function characterMarkup(character) {
  return `
    <div class="character-card ${character.alive ? '' : 'dead'}">
      <img src="${character.image}" alt="${character.name}" />
      <div>
        <div class="character-name"><strong>${character.name}</strong><span class="role-tag">${character.role}</span></div>
        <div class="dim" style="font-size:12px;line-height:1.35">${character.alive ? character.status : 'не в строю'}</div>
        <div class="mini-bars">
          ${miniBar('жизнь', character.health, character.health < 35 ? 'bad' : 'good')}
          ${miniBar('разум', character.mind, character.mind < 35 ? 'bad' : 'morale')}
          ${miniBar('устал.', 100 - character.fatigue, character.fatigue > 75 ? 'bad' : 'warn')}
        </div>
      </div>
    </div>
  `;
}

function miniBar(label, value, condition) {
  const css = condition === 'bad' ? 'bad' : condition === 'morale' ? 'morale' : condition === 'warn' ? 'warn' : 'good';
  return `
    <div class="mini-bar">
      <span>${label}</span>
      <div class="meter stat ${css}" style="--value: ${clamp(value)}%"><i></i></div>
      <span>${clamp(value)}%</span>
    </div>
  `;
}

function renderEnding() {
  const rescued = game.ending.rescued;
  const alive = aliveCharacters().length;
  app.innerHTML = `
    <main class="screen ending-screen">
      <article class="ending-card">
        <img src="assets/images/bunker.svg" alt="Бункер" />
        <p class="kicker">${rescued ? 'финал: спасение' : 'финал: поражение'}</p>
        <h1>${game.ending.title}</h1>
        <p class="lead">${game.ending.text}</p>
        <div class="summary-grid">
          <div class="summary-item"><strong>${game.day}</strong><span>дней</span></div>
          <div class="summary-item"><strong>${alive}/${game.characters.length}</strong><span>выживших</span></div>
          <div class="summary-item"><strong>${game.counters.foundItems}</strong><span>случайных находок</span></div>
        </div>
        <button class="btn" data-action="restart">Сыграть заново</button>
      </article>
    </main>
  `;
  app.querySelector('[data-action="restart"]').addEventListener('click', resetSave);
}

renderStart();
