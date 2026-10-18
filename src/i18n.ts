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
  'best': ['Выгодно', 'Best deal'],
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
  'toilet.desc': ['Туалет. Одна кабинка, очередей не бывает.', 'Restroom. One stall, never a queue.'],
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
  // тосты
  'toast.achievement': ['Достижение: {name}', 'Achievement: {name}'],
  'toast.quest': ['Задание выполнено — заберите награду', 'Quest complete — claim your reward'],
  'toast.reorg': ['Реорганизация! +{n} Грантов', 'Reorganized! +{n} Grants'],
  'toast.company': ['Новая компания: «{name}»', 'New company: «{name}»'],
  'toast.saved': ['Сохранено', 'Saved'],
  // обучение
  'tut.1': [
    'Добро пожаловать. Вы вкладываете деньги, я требую усерднее работать. Давайте начнём с моего стола.',
    "Welcome. You invest the money, I demand harder work. Let's start with my desk.",
  ],
  'tut.deskBtn': ['Улучшить стол — бесплатно', 'Upgrade the desk — free'],
  'tut.2': ['Первая линия. Берут трубку, переводят звонки и приносят первые techCoin.', 'First line. They pick up, transfer calls and bring in the first techCoin.'],
  'tut.3': ['Разработка. Пишут код и кричат, что требования плохие. Купите отдел, когда накопите.', 'Development. They write code and shout that the requirements are bad. Buy it when you can.'],
  'tut.4': ['Тестировщики. Ругаются на код разработчиков и на требования. Без них в продакшене всё горит.', 'QA. They complain about the code and the requirements. Without them prod is on fire.'],
  'tut.5': ['Аналитики. Говорят с бизнесом по телефону, потом печатают требования, которые никто не читает.', 'Analysts. They talk to the business on the phone, then type requirements nobody reads.'],
  'tut.6': ['Сисадмины. Чинят то, что сломали остальные. Крысы тоже виноваты.', 'Sysadmins. They fix what everyone else broke. Rats are to blame too.'],
  'tut.7': ['Они не работают и дохода не приносят, зато делают офис живым.', "They don't work and earn nothing, but they make the office alive."],
  'tut.8': ['Первое задание: прокачайте первого сотрудника до 5 уровня. Нажмите на кнопку улучшения в панели отдела.', 'First quest: level up your first employee to 5. Tap the upgrade button in the department panel.'],
  'tut.dept1': ['Пишут код и кричат, что требования плохие.', 'They write code and shout that the requirements are bad.'],
  'tut.dept2': ['Ругаются на код и на требования. Без них в продакшене всё горит.', 'They complain about the code and requirements. Without them prod burns.'],
  'tut.dept3': ['Говорят с бизнесом, потом пишут требования, которые никто не читает.', 'They talk to the business, then write requirements nobody reads.'],
  'tut.dept4': ['Чинят то, что сломали остальные.', 'They fix what everyone else broke.'],
  'tut.dept0': ['Первая линия поддержки.', 'First line support.'],
} as const satisfies Record<string, readonly [string, string]>;

export type Key = keyof typeof D;

export function t(key: Key, params?: Record<string, string | number>): string {
  const pair = D[key];
  let s: string = pair ? pair[lang === 'ru' ? 0 : 1] : key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Имена сотрудников по отделам. */
export const NAMES: Record<Lang, string[][]> = {
  ru: [
    ['Галя', 'Витя', 'Оля', 'Серёга', 'Маша', 'Дима'],
    ['Артём', 'Лёша', 'Катя', 'Никита', 'Женя', 'Рома'],
    ['Света', 'Паша', 'Ира', 'Денис', 'Аня', 'Костя'],
    ['Юля', 'Миша', 'Настя', 'Игорь', 'Лена', 'Саша'],
    ['Боря', 'Валера', 'Толик', 'Гена', 'Стас', 'Петрович'],
  ],
  en: [
    ['Gale', 'Vic', 'Olive', 'Steve', 'Mary', 'Dean'],
    ['Art', 'Alex', 'Kate', 'Nick', 'Jen', 'Rome'],
    ['Lana', 'Paul', 'Iris', 'Dennis', 'Ann', 'Kos'],
    ['Julia', 'Mike', 'Nastia', 'Igor', 'Lena', 'Sasha'],
    ['Bob', 'Val', 'Tony', 'Gene', 'Stan', 'Pete'],
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
