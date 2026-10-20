// Тексты интерфейса на русском и английском.

export type Lang = 'ru' | 'en';

let lang: Lang = 'ru';

export function setLang(l: Lang): void {
  lang = l;
  document.documentElement.lang = l;
}

export function getLang(): Lang {
  return lang;
}

/** Язык по умолчанию: из Telegram или браузера. */
export function detectLang(tgCode?: string): Lang {
  const code = (tgCode || navigator.language || 'ru').toLowerCase();
  return /^(ru|uk|be|kk|ky|uz|tg|hy|az)/.test(code) ? 'ru' : 'en';
}

/** Текст с двумя языками. */
export interface L10n {
  ru: string;
  en: string;
}

export function tr(x: L10n): string {
  return x[lang];
}

const D = {
  // комнаты и отделы
  'room.support': ['Поддержка', 'Support'],
  'room.dev': ['Разработка', 'Development'],
  'room.qa': ['Тестирование', 'QA'],
  'room.analysts': ['Аналитики', 'Analysts'],
  'room.sysadmins': ['Сисадмины', 'Sysadmins'],
  'room.director': ['Директор IT', 'IT Director'],
  'room.hall': ['Холл', 'Hall'],
  'room.rest': ['Зона отдыха', 'Lounge'],
  'room.toilet': ['Туалет', 'Restroom'],
  // предметы
  'item.desk': ['Стол', 'Desk'],
  'item.chair': ['Стул', 'Chair'],
  'item.phone': ['Телефон', 'Phone'],
  'item.monitor': ['Монитор', 'Monitor'],
  'item.keyboard': ['Клавиатура', 'Keyboard'],
  'item.mouse': ['Мышь', 'Mouse'],
  'item.post': ['Ремонтный пост', 'Workbench'],
  'item.toolbox': ['Ящик с инструментами', 'Toolbox'],
  'item.lamp': ['Лампа', 'Lamp'],
  'item.flower': ['Цветок', 'Plant'],
  'item.mug': ['Кружка кофе', 'Coffee mug'],
  // компании
  'company.startup': ['Свой стартап', 'Garage Startup'],
  'company.bank': ['Банк', 'Bank'],
  'company.studio': ['Игровая студия', 'Game Studio'],
  'company.space': ['Космос', 'Space Station'],
  'company.trait.startup': ['Обычный офис.', 'A regular office.'],
  'company.trait.bank': ['Выплаты в 1,5 раза медленнее, но доход ×1,6.', 'Payouts 1.5× slower, but income ×1.6.'],
  'company.trait.studio': ['Тикеты дают ×2, мебель на 20% сильнее.', 'Tickets give ×2, furniture is 20% stronger.'],
  'company.trait.space': ['Доход ×1,2, офлайн копится до 3 часов.', 'Income ×1.2, offline accrues up to 3 hours.'],
  // общее
  'perSec': ['/сек', '/s'],
  'per10': ['за выплату', 'per payout'],
  'level': ['ур.', 'lv.'],
  'levelFull': ['Уровень', 'Level'],
  'locked': ['Закрыто', 'Locked'],
  'open': ['Открыть', 'Open'],
  'hire': ['Нанять', 'Hire'],
  'buy': ['Купить', 'Buy'],
  'max': ['Макс', 'Max'],
  'maxed': ['Максимум', 'Maxed'],
  'close': ['Закрыть', 'Close'],
  'claim': ['Забрать', 'Claim'],
  'continue': ['Продолжить', 'Continue'],
  'skip': ['Пропустить', 'Skip'],
  'best': ['Быстрее окупится', 'Pays off fastest'],
  'best.hint': ['— покупка, которая быстрее всех остальных вернёт свою цену доходом.', '— the purchase that earns back its price sooner than any other.'],
  'soon': ['Скоро', 'Soon'],
  'free': ['Бесплатно', 'Free'],
  'done': ['Готово', 'Done'],
  // отдел
  'dept.income': ['Доход отдела', 'Department income'],
  'dept.unlock': ['Открыть отдел', 'Open department'],
  'dept.unlockNeed': ['Сначала откройте «{name}»', 'Open «{name}» first'],
  'dept.manager': ['Руководитель отдела', 'Department lead'],
  'dept.managerDesc': ['+50% дохода всего отдела', '+50% to the whole department'],
  'dept.managerNeed': ['Появится после найма третьего сотрудника', 'Available after the third hire'],
  'dept.managerHired': ['Нанят: ходит и подгоняет', 'Hired: walks around and nags'],
  'dept.nextHire': ['Новый сотрудник', 'New employee'],
  'dept.hireNeed': ['Нужен {n} уровень у {name}', '{name} needs level {n}'],
  'dept.full': ['Все 6 мест заняты', 'All 6 desks are taken'],
  'dept.furniture': ['Рабочее место', 'Workplace'],
  'dept.toMilestone': ['до ×2: {n} ур.', 'to ×2: {n} lv.'],
  // зона отдыха
  'rest.coffee': ['Кофемашина', 'Coffee machine'],
  'rest.fridge': ['Холодильник', 'Fridge'],
  'rest.games': ['Игры для приставки', 'Console games'],
  'rest.bonus': ['+{n}% ко всему офису', '+{n}% to the whole office'],
  'rest.desc': ['Прохожие не работают, зато офис живой. Улучшения дают бонус всему офису.', 'Walkers do not work, but they make the office alive. Upgrades boost the whole office.'],
  // директор
  'director.desc': ['Директор IT. Нажмите «Аврал» — 30 секунд весь офис зарабатывает ×3.', 'IT Director. Press «Crunch» — for 30 seconds the office earns ×3.'],
  'director.desk': ['Стол директора', "Director's desk"],
  'director.deskDone': ['Стол улучшен', 'Desk upgraded'],
  'hall.desc': ['Холл. Здесь бродят сотрудники и рождаются идеи.', 'The hall. Employees wander here and ideas are born.'],
  'toilet.desc': ['Туалет. Одна кабинка, очередей не бывает. Открытый туалет: +3% ко всему офису.', 'Restroom. One stall, never a queue. An open restroom adds +3% to the whole office.'],
  'room.unlock': ['Открыть', 'Open'],
  'room.lockDesc.director': ['Директор IT объявляет «Аврал» и раздаёт задания на время — за них дают перки.', 'The IT Director calls «Crunch» and gives timed tasks that reward perks.'],
  'room.lockDesc.rest': ['Зона отдыха: кофемашина, холодильник и приставка дают бонус всему офису.', 'Rest zone: the coffee machine, fridge and console boost the whole office.'],
  'room.lockDesc.toilet': ['Туалет: сотрудники меньше отвлекаются, +3% ко всему офису.', 'Restroom: fewer distractions, +3% to the whole office.'],
  'need.open': ['Сначала откройте «{name}»', 'Open «{name}» first'],
  'task.title': ['Задание директора', "Director's task"],
  'task.next': ['Новое задание через {time}', 'Next task in {time}'],
  'task.offer': ['{tier} · {time} на выполнение · награда — перк', '{tier} · {time} to finish · reward: a perk'],
  'task.left': ['Осталось {time}', '{time} left'],
  'task.accept': ['Принять', 'Accept'],
  'task.decline': ['Отказаться', 'Decline'],
  'task.noPenalty': ['Не успеете — ничего страшного, просто будет новое задание.', 'No penalty for failing — a new task will come.'],
  'task.levels': ['Купите уровней сотрудникам: {n}', 'Buy {n} employee levels'],
  'task.furn': ['Купите предметов мебели: {n}', 'Buy {n} furniture items'],
  'task.tickets': ['Закройте тикетов: {n}', 'Close {n} tickets'],
  'task.avral': ['Объявите «Аврал», раз: {n}', 'Call «Crunch» {n} times'],
  'task.hires': ['Наймите новых сотрудников: {n}', 'Hire {n} employees'],
  'task.earn': ['Заработайте {n}', 'Earn {n}'],
  'task.done': ['Задание выполнено! Перк в инвентаре директора.', 'Task done! A perk is in the inventory.'],
  'task.expired': ['Время задания вышло. Скоро будет новое.', 'The task expired. A new one is coming.'],
  'task.offered': ['Директор IT предлагает задание', 'The IT Director has a task for you'],
  'inv.title': ['Инвентарь перков', 'Perk inventory'],
  'inv.empty': ['Пока пусто. Выполняйте задания директора.', 'Empty for now. Complete the director’s tasks.'],
  'inv.use': ['Применить', 'Use'],
  'inv.count': ['{n} шт.', '×{n}'],
  'inv.active': ['Действует', 'Active'],
  'perk.speed': ['Выплаты быстрее на {n}%', 'Payouts {n}% faster'],
  'perk.income': ['Доход ×{n}', 'Income ×{n}'],
  'perk.tickets': ['Тикеты в {n} раза чаще', 'Tickets {n}× more often'],
  'perk.cash': ['Сразу: доход за {time}', 'Instantly: {time} of income'],
  'perk.for': ['на {time}', 'for {time}'],
  'perk.used': ['Перк применён', 'Perk used'],
  'rest.badge': ['Можно улучшить', 'Upgrade ready'],
  'dir.room': ['Кабинет директора', "Director's office"],
  'dir.bonus': ['Обстановка кабинета: награды за задания +{n}% (перки дольше, «деньги сразу» больше)', 'Office furnishings: task rewards +{n}% (perks last longer, instant cash is bigger)'],
  'dir.perItem': ['+{n}% к наградам', '+{n}% rewards'],
  'item.picture': ['Картина', 'Painting'],
  'item.carpet': ['Ковёр', 'Carpet'],
  // аврал и тикеты
  'avral': ['Аврал', 'Crunch'],
  'avral.active': ['Аврал! ×3', 'Crunch! ×3'],
  'avral.ready': ['Готов', 'Ready'],
  // навигация
  'nav.office': ['Офис', 'Office'],
  'nav.quests': ['Задания', 'Quests'],
  'nav.grants': ['Гранты', 'Grants'],
  'nav.collection': ['Коллекция', 'Collection'],
  'nav.settings': ['Настройки', 'Settings'],
  'nav.rating': ['Рейтинг', 'Rating'],
  // рейтинг
  'rating.loading': ['Загружаем рейтинг…', 'Loading the rating…'],
  'rating.error': ['Не удалось загрузить рейтинг. Проверьте интернет и откройте вкладку ещё раз.', 'Could not load the rating. Check your connection and open the tab again.'],
  'rating.noTg': ['Рейтинг доступен, когда игра открыта в Telegram.', 'The rating is available when the game is opened in Telegram.'],
  'rating.empty': ['Пока в рейтинге никого нет.', 'Nobody is in the rating yet.'],
  'rating.note': ['Сначала — у кого номер компании больше, затем — кто больше заработал за всю игру.', 'Higher company number first, then more money earned over the whole game.'],
  'rating.company': ['Компания №{n}', 'Company #{n}'],
  'rating.you': ['Вы', 'You'],
  'rating.noName': ['Без имени', 'No name'],
  // гранты
  'grants.title': ['Реорганизация и Гранты', 'Reorganization & Grants'],
  'grants.wallet': ['Гранты', 'Grants'],
  'grants.pending': ['Получите за реорганизацию', 'You will get for reorganizing'],
  'grants.earned': ['Получено в этой компании', 'Earned in this company'],
  'grants.reorg': ['Реорганизация', 'Reorganize'],
  'grants.reorgNeed': ['Доступно с 20 Грантов: заработайте {n} за забег', 'Available from 20 Grants: earn {n} this run'],
  'grants.reorgHintGood': ['Выгодно: прирост не меньше уже полученного.', 'Good time: the gain is at least what you already have.'],
  'grants.reorgHintWait': ['Лучше подождать, пока прирост удвоит ваши Гранты.', 'Better wait until the gain doubles your Grants.'],
  'grants.reorgWhat': ['Офис сбросится до одного стола. Гранты и всё, что куплено за них, останутся.', 'The office resets to one desk. Grants and their upgrades stay.'],
  'grants.confirm': ['Точно? Нажмите ещё раз', 'Sure? Tap again'],
  'grants.shop': ['Дерево улучшений', 'Upgrade tree'],
  'grants.spendAll': ['Распределить все', 'Spend all'],
  'grants.company': ['Смена компании', 'Change company'],
  'grants.companyNeed': ['Выкупите весь офис: {n}%', 'Buy out the whole office: {n}%'],
  'grants.companyGo': ['Переехать в «{name}»', 'Move to «{name}»'],
  'grants.companyNow': ['Компания №{n}: «{name}»', 'Company #{n}: «{name}»'],
  'shop.culture': ['Корпоративная культура', 'Corporate culture'],
  'shop.culture.d': ['+1% к доходу офиса', '+1% to office income'],
  'shop.speed': ['Скорость: {dept}', 'Speed: {dept}'],
  'shop.speed.d': ['−2% ко времени выплаты', '−2% payout time'],
  'shop.income': ['Доход: {dept}', 'Income: {dept}'],
  'shop.income.d': ['+5% к доходу отдела', '+5% to department income'],
  'shop.discount': ['Скидка на уровни', 'Level discount'],
  'shop.discount.d': ['−0,5% к цене сотрудников', '−0.5% to employee prices'],
  'shop.furnDiscount': ['Скидка на мебель', 'Furniture discount'],
  'shop.furnDiscount.d': ['−2% к цене мебели', '−2% to furniture prices'],
  'shop.startCapital': ['Подъёмные', 'Starting capital'],
  'shop.startCapital.d': ['стартовый капитал после реорганизации', 'starting money after a reorganization'],
  'shop.lobby': ['Лоббирование', 'Lobbying'],
  'shop.lobby.d': ['+5% к Грантам за реорганизацию', '+5% Grants per reorganization'],
  // задания
  'quests.daily': ['Ежедневные', 'Daily'],
  'quests.dailyHint': ['Обновятся в полночь по Москве', 'Refresh at midnight Moscow time'],
  'quests.chain': ['Цепочка открытий', 'Discovery chain'],
  'quests.chainDone': ['Цепочка пройдена', 'Chain complete'],
  'quests.chainReward': ['techCoin и новая фраза в копилку', 'techCoin and a new phrase'],
  'quests.long': ['Долгие задания', 'Long-term goals'],
  'quests.grantsReward': ['+{n} Гранта', '+{n} Grants'],
  // коллекция
  'col.achievements': ['Достижения', 'Achievements'],
  'col.phrases': ['Фразы', 'Phrases'],
  'col.heard': ['Услышано {n} из {total}', 'Heard {n} of {total}'],
  'col.unknown': ['??? ещё не звучала', '??? not heard yet'],
  'col.unknownRare': ['??? редкая, ещё не звучала', '??? rare, not heard yet'],
  // настройки
  'set.sound': ['Звук', 'Sound'],
  'set.lang': ['Язык', 'Language'],
  'set.tutorial': ['Пересмотреть обучение', 'Replay tutorial'],
  'set.reset': ['Сбросить прогресс', 'Reset progress'],
  'set.resetConfirm': ['Точно сбросить всё? Нажмите ещё раз', 'Reset everything? Tap again'],
  'set.save': ['Прогресс сохраняется на устройстве и в Telegram', 'Progress is saved on this device and in Telegram'],
  'set.saveLocal': ['Прогресс сохраняется на устройстве', 'Progress is saved on this device'],
  'set.version': ['Версия', 'Version'],
  'on': ['Вкл', 'On'],
  'off': ['Выкл', 'Off'],
  // офлайн
  'offline.title': ['Пока вас не было', 'While you were away'],
  'offline.text': ['За {time} офис заработал', 'In {time} the office earned'],
  'offline.cap': ['Офлайн копится до {h} ч — заходите почаще', 'Offline income caps at {h} h — come back often'],
  'h': ['ч', 'h'],
  'min': ['мин', 'min'],
  // события
  'event.newyear': ['Новый год: доход +10%', 'New Year: income +10%'],
  'event.sysadminDay': ['День сисадмина: сисадмины ×2', 'Sysadmin Day: sysadmins ×2'],
  'event.hackathon': ['Хакатон: разработка ×1,5, тикетов вдвое больше', 'Hackathon: dev ×1.5, twice the tickets'],
  'event.kirillBday': ['С ДР Кирилл 🎂', 'Kirill\'s birthday! Misha, congrats on your son! 🎂'],
  // тосты
  'toast.achievement': ['Достижение: {name}', 'Achievement: {name}'],
  'toast.quest': ['Задание выполнено — заберите награду', 'Quest complete — claim your reward'],
  'toast.reorg': ['Реорганизация! +{n} Грантов', 'Reorganized! +{n} Grants'],
  'toast.company': ['Новая компания: «{name}»', 'New company: «{name}»'],
  'toast.saved': ['Сохранено', 'Saved'],
  // обучение
  'tut.1': [
    'Добро пожаловать. Вы вкладываете деньги, я требую усерднее работать. Начнём с сисадминов — они уже на месте.',
    "Welcome. You invest the money, I demand harder work. Let's start with the sysadmins — they're already here.",
  ],
  'tut.deskBtn': ['Улучшить стол — бесплатно', 'Upgrade the desk — free'],
  'tut.2': ['Сисадмины. Чинят то, что сломали остальные, и приносят первые techCoin. Крысы тоже виноваты.', 'Sysadmins. They fix what everyone else broke and bring in the first techCoin. Rats are to blame too.'],
  'tut.3': ['Поддержка. Берут трубку и переводят звонки. Откройте отдел, когда накопите.', 'Support. They pick up and transfer calls. Open it when you can afford it.'],
  'tut.4': ['Мой кабинет. Когда откроете — будут «Аврал» и мои задания с наградами.', 'My office. Once you open it, you get Crunch and my tasks with rewards.'],
  'tut.5': ['Зона отдыха. Кофе и приставка поднимают доход всего офиса.', 'The lounge. Coffee and the console boost the whole office.'],
  'tut.6': ['Дальше аналитики, разработка и тестирование. Каждый отдел дороже и доходнее прошлого.', 'Next come analysts, developers and QA. Each department costs and earns more than the last.'],
  'tut.7': ['Туалет тоже открывается за деньги. Да, это IT.', 'The restroom costs money to open too. Yes, this is IT.'],
  'tut.8': ['Первое задание: прокачайте первого сисадмина до 5 уровня. Нажмите на кнопку улучшения в панели отдела.', 'First quest: level up your first sysadmin to 5. Tap the upgrade button in the department panel.'],
  'tut.dept0': ['Чинят то, что сломали остальные.', 'They fix what everyone else broke.'],
  'tut.dept1': ['Первая линия поддержки.', 'First line support.'],
  'tut.dept2': ['Говорят с бизнесом, потом пишут требования, которые никто не читает.', 'They talk to the business, then write requirements nobody reads.'],
  'tut.dept3': ['Пишут код и кричат, что требования плохие.', 'They write code and shout that the requirements are bad.'],
  'tut.dept4': ['Ругаются на код и на требования. Без них в продакшене всё горит.', 'They complain about the code and requirements. Without them prod burns.'],
} as const satisfies Record<string, readonly [string, string]>;

export type Key = keyof typeof D;

export function t(key: Key, params?: Record<string, string | number>): string {
  const pair = D[key];
  let s: string = pair ? pair[lang === 'ru' ? 0 : 1] : key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Женские имена (по номерам отделов и мест, одинаково для ru и en): у них и персонаж женский. */
export const FEMALE: boolean[][] = [
  [false, false, false, false, false, false],
  [true, false, true, false, true, false],
  [true, false, true, false, true, false],
  [false, false, true, false, true, false],
  [true, false, true, false, true, false],
];

/** Имена сотрудников по отделам. */
export const NAMES: Record<Lang, string[][]> = {
  // по номерам отделов: сисадмины, поддержка, аналитики, разработка, тестирование
  ru: [
    ['Боря', 'Валера', 'Толик', 'Гена', 'Стас', 'Петрович'],
    ['Галя', 'Витя', 'Оля', 'Серёга', 'Маша', 'Дима'],
    ['Юля', 'Миша', 'Настя', 'Игорь', 'Лена', 'Саша'],
    ['Артём', 'Лёша', 'Катя', 'Никита', 'Женя', 'Рома'],
    ['Света', 'Паша', 'Ира', 'Денис', 'Аня', 'Костя'],
  ],
  en: [
    ['Bob', 'Val', 'Tony', 'Gene', 'Stan', 'Pete'],
    ['Gale', 'Vic', 'Olive', 'Steve', 'Mary', 'Dean'],
    ['Julia', 'Mike', 'Nastia', 'Igor', 'Lena', 'Sasha'],
    ['Art', 'Alex', 'Kate', 'Nick', 'Jen', 'Rome'],
    ['Lana', 'Paul', 'Iris', 'Dennis', 'Ann', 'Kos'],
  ],
};

export const TICKET_TEXTS: Record<Lang, string[]> = {
  ru: ['Прод упал!', 'Галя что-то нажала', 'Нет интернета', 'Сломался принтер', 'Срочный баг!', 'Клиент в ярости', 'Забыли пароль', 'Сервер перегрелся', 'Пропал Wi-Fi', 'Опять ошибка 500'],
  en: ['Prod is down!', 'Gale pressed something', 'No internet', 'Printer broke', 'Urgent bug!', 'Angry customer', 'Forgot password', 'Server overheated', 'Wi-Fi is gone', 'Error 500 again'],
};

/** «1 ч 23 мин». */
export function duration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} ${t('h')} ${m} ${t('min')}`;
  return `${Math.max(1, m)} ${t('min')}`;
}
