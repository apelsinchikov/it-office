// Банки реплик из GDD + английские версии. id реплики = `${группа}.${номер}`.

export interface Phrase {
  ru: string;
  en: string;
}

export type PhraseGroup =
  | 'director'
  | 'support'
  | 'supportLead'
  | 'dev'
  | 'devLead'
  | 'qa'
  | 'qaLead'
  | 'analysts'
  | 'analystsLead'
  | 'sysadmins'
  | 'sysadminsLead'
  | 'coffee'
  | 'sofa'
  | 'toilet'
  | 'edge'
  | 'bonus'
  | 'bank'
  | 'studio'
  | 'space'
  | 'newyear'
  | 'sysadminDay'
  | 'hackathon';

const p = (ru: string, en: string): Phrase => ({ ru, en });

export const PHRASES: Record<PhraseGroup, Phrase[]> = {
  director: [
    p('Нужно усерднее работать!', 'We need to work harder!'),
    p('Нужно собрать встречу.', 'We need to set up a meeting.'),
    p('Никакого повышения!', 'No raises!'),
    p('У компании настали трудные времена.', 'The company is going through hard times.'),
    p('Мы одна семья.', 'We are one family.'),
    p('Бюджета нет, но вы держитесь.', "There's no budget, but hang in there."),
    p('Давайте синхронизируемся.', "Let's sync up."),
    p('Премии не будет, зато будет пицца.', 'No bonus, but there will be pizza.'),
    p('Это не проблема, это возможность.', "It's not a problem, it's an opportunity."),
    p('Мне это нужно было вчера.', 'I needed this yesterday.'),
  ],
  support: [
    p('Ваш звонок очень важен для нас, оставайтесь на линии...', 'Your call is very important to us, please hold...'),
    p('Перевожу вас на другого специалиста.', "I'm transferring you to another specialist."),
    p('Ничем не могу помочь, это ваша проблема.', "Can't help you, that's your problem."),
    p('Перевожу вас на другой отдел.', "I'm transferring you to another department."),
    p('Бабушка, хватит звонить мне в рабочее время!', 'Grandma, stop calling me during work hours!'),
    p('Вы пробовали выключить и включить?', 'Have you tried turning it off and on again?'),
    p('Ваше обращение рассмотрят в течение 30 рабочих дней.', 'Your request will be reviewed within 30 business days.'),
    p('Закрываю заявку как «не воспроизводится».', 'Closing the ticket as "cannot reproduce".'),
    p('Вас плохо слышно... Мне вас — прекрасно. До свидания.', "I can't hear you... Oh, I hear you fine. Goodbye."),
    p('Это не наш отдел. Хотя наш. Но не мой.', "That's not our department. Well, it is. But not mine."),
  ],
  supportLead: [
    p('Работайте усерднее!', 'Work harder!'),
    p('Переводи звонок!', 'Transfer the call!'),
    p('Говори чётче, не мямли!', 'Speak clearly, stop mumbling!'),
    p('Реши проблему клиента!', "Solve the customer's problem!"),
    p('Разговор уже пять минут, а норма три!', "That's five minutes on the call, the target is three!"),
    p('Дашборд красный. Сделайте зелёный.', 'The dashboard is red. Make it green.'),
    p('Улыбайся, клиент слышит улыбку.', 'Smile, the customer can hear it.'),
    p('Кто ушёл на обед в час пик?', 'Who went to lunch at rush hour?'),
  ],
  dev: [
    p('Вот это требование!', 'What a requirement!'),
    p('И как это реализовывать?', 'And how am I supposed to build this?'),
    p('Кто писал этот код?! ...А, это я.', 'Who wrote this code?! ...Oh, it was me.'),
    p('У меня на машине работает.', 'Works on my machine.'),
    p('Это не баг, это фича.', "It's not a bug, it's a feature."),
    p('Там legacy, лучше не трогать.', "That's legacy, better not touch it."),
    p('Три часа искал — не хватало точки с запятой.', 'Three hours of debugging — a missing semicolon.'),
    p('Оно само заработало. Не трогайте!', "It started working by itself. Don't touch it!"),
    p('TODO: исправить потом (с 2019 года).', 'TODO: fix later (since 2019).'),
    p('Копирую со Stack Overflow, вы ничего не видели.', "Copying from Stack Overflow, you didn't see that."),
  ],
  devLead: [
    p('Давайте быстрее!', 'Faster, faster!'),
    p('Скоро релиз!', 'Release is coming!'),
    p('Срочно релиз!', 'Release, now!'),
    p('Релизимся в пятницу!', "We're releasing on Friday!"),
    p('Кто уронил прод?', 'Who brought down prod?'),
    p('Не забудь сделать commit!', "Don't forget to commit!"),
    p('Кто стёр всю базу данных?', 'Who deleted the whole database?'),
    p('Нужно внедрить ИИ! С ИИ всё будет быстрее!', 'We need AI! With AI everything is faster!'),
    p('ИИ вас всех заменит.', 'AI will replace you all.'),
    p('Я всю вашу работу сделал через ИИ за неделю.', 'I did all your work with AI in a week.'),
    p('Выглядит красиво, только ничего не работает.', 'Looks great, just nothing works.'),
  ],
  qa: [
    p('Опять требования не прочитали...', 'Nobody read the requirements again...'),
    p('Кто это выкатил на прод?!', 'Who shipped this to prod?!'),
    p('Нашёл баг! ...Нашёл ещё один.', 'Found a bug! ...Found another one.'),
    p('У тебя не воспроизводится? У меня воспроизводится.', "Can't reproduce? I can."),
    p('А если ввести эмодзи в поле «возраст»?', 'What if I type an emoji into the "age" field?'),
    p('Я сломал это за пять секунд.', 'I broke it in five seconds.'),
    p('В описании бага: «всё сломалось». Спасибо.', 'Bug description: "everything is broken". Thanks.'),
    p('Баг закрыт, но он вернулся.', 'The bug was closed, but it came back.'),
    p('Тест-кейсов 400, времени 20 минут.', '400 test cases, 20 minutes.'),
    p('Требования противоречат сами себе.', 'The requirements contradict themselves.'),
  ],
  qaLead: [
    p('Сколько багов нашли? Мало!', 'How many bugs? Not enough!'),
    p('Регресс не прошёл — релиза не будет.', 'Regression failed — no release.'),
    p('Почему нет автотестов?!', 'Why are there no autotests?!'),
    p('Не «нашёл баг», а «выявил риск».', 'Not "found a bug" — "identified a risk".'),
    p('Покрытие ниже 80% — это стыд.', 'Coverage under 80% is a disgrace.'),
    p('Релиз в пятницу? Только через мой труп.', 'Release on Friday? Over my dead body.'),
  ],
  analysts: [
    p('Алло, добрый день, уточните по требованиям...', 'Hello, could you clarify the requirements...'),
    p('Бизнес сам не знает, чего хочет.', "The business doesn't know what it wants."),
    p('Давайте уточним... ещё раз.', "Let's clarify... once again."),
    p('Это было в Confluence. Потом удалили.', 'It was in Confluence. Then it got deleted.'),
    p('«Сделайте красиво» — это не требование.', '"Make it pretty" is not a requirement.'),
    p('Требования готовы. Версия четырнадцатая.', 'Requirements are ready. Version fourteen.'),
    p('Заказчик передумал. Опять.', 'The client changed their mind. Again.'),
    p('Нарисовал диаграмму. Никто не смотрит.', 'Drew a diagram. Nobody looks at it.'),
    p('Согласовали! (устно)', 'Approved! (verbally)'),
  ],
  analystsLead: [
    p('Иди собери требования у бизнеса!', 'Go gather requirements from the business!'),
    p('Придумай за них сам!', 'Make them up yourself!'),
    p('Иди выясни!', 'Go find out!'),
    p('Составь диаграмму! Проведи анализ!', 'Draw a diagram! Run an analysis!'),
    p('Опиши методы!', 'Describe the methods!'),
    p('Составь схему базы данных!', 'Design the database schema!'),
    p('Опиши OpenAPI!', 'Write the OpenAPI spec!'),
    p('Внедри ИИ! Используй ИИ!', 'Adopt AI! Use AI!'),
    p('Где критерии приёмки?', 'Where are the acceptance criteria?'),
  ],
  sysadmins: [
    p('Как они это сломали?!', 'How did they break this?!'),
    p('Они даже не пробовали выключить и включить!', "They didn't even try turning it off and on!"),
    p('Надо поменять батарейки.', 'Need to change the batteries.'),
    p('Крысы провод перегрызли.', 'Rats chewed through the cable.'),
    p('Кто опять включил принтер в сеть?', 'Who plugged the printer in again?'),
    p('Пароль «123456»? Серьёзно?', 'The password is "123456"? Seriously?'),
    p('Факс? Он ещё работает?!', "A fax? It still works?!"),
    p('Лог пустой. Это хорошо или очень плохо?', 'The log is empty. Is that good or very bad?'),
    p('Обновление: 14%. Приходите завтра.', 'Update: 14%. Come back tomorrow.'),
    p('Кто выдернул шнур? Как он туда дотянулся?', 'Who pulled the cord? How did they even reach it?'),
  ],
  sysadminsLead: [
    p('Работай быстрее!', 'Work faster!'),
    p('Галя из бухгалтерии что-то нажала...', 'Galya from accounting pressed something...'),
    p('Купи батарейки!', 'Buy batteries!'),
    p('Сделай бэкап. Вчера.', 'Make a backup. Yesterday.'),
    p('Кто выдал бухгалтерии админские права?', 'Who gave accounting admin rights?'),
    p('Бюджета на новый сервер нет, чини старый.', 'No budget for a new server, fix the old one.'),
    p('Это срочно! Всё срочно.', "It's urgent! Everything is urgent."),
  ],
  coffee: [
    p('Даа, раньше было лучше.', 'Yeah, things used to be better.'),
    p('Повышения хочется.', "I'd like a raise."),
    p('Может, пиццу закажем?', 'Should we order pizza?'),
    p('А у меня на обед рыба.', "I've got fish for lunch."),
    p('У тебя что на обед?', "What's for your lunch?"),
    p('Слышал, будут сокращения?', 'Heard there will be layoffs?'),
    p('Кофе уже не бодрит.', "Coffee doesn't work anymore."),
    p('В пятницу точно ничего не релизим... да?', "We're definitely not releasing on Friday... right?"),
  ],
  sofa: [
    p('Давай ещё раунд!', 'One more round!'),
    p('Это лаги, я не жульничаю.', "It's lag, I'm not cheating."),
    p('Тише, босс идёт!', 'Quiet, the boss is coming!'),
    p('Кто съел мой йогурт?!', 'Who ate my yogurt?!'),
    p('Тут чей-то обед с позапрошлой недели.', "There's someone's lunch from two weeks ago."),
    p('Это моё! Подписано!', "That's mine! It has my name on it!"),
  ],
  toilet: [
    p('Кто за собой не смыл?!', "Who didn't flush?!"),
    p('Зачем я ел на обед рыбу...', 'Why did I have fish for lunch...'),
    p('Опять закончилось мыло!', 'Out of soap again!'),
    p('Занято!', 'Occupied!'),
  ],
  edge: [
    p('Ого, а дальше стена.', 'Whoa, there is a wall.'),
    p('Так, мне не сюда.', 'Okay, not this way.'),
    p('Кажется, я заблудился.', "I think I'm lost."),
    p('Тут раньше был кабинет?', 'Was there an office here before?'),
    p('Окно открывается? Нет.', 'Does the window open? No.'),
    p('А разве тут не было прохода?', "Wasn't there a way through here?"),
    p('Я забыл, куда шёл.', 'I forgot where I was going.'),
    p('Хорошее место, чтобы поплакать.', 'Nice spot for a little cry.'),
  ],
  bonus: [
    p('Кто поставил митинг на 18:00?', 'Who scheduled a meeting at 6 PM?'),
    p('Этот созвон мог быть письмом.', 'This call could have been an email.'),
    p('Я в отпуске. Но на связи.', "I'm on vacation. But reachable."),
    p('Срочно! Но не горит.', 'Urgent! But not on fire.'),
    p('Давайте вынесем в отдельную встречу.', "Let's take this to a separate meeting."),
    p('Кто последний — тот и дежурит.', 'Last one in is on call.'),
    p('Оптимизировали процесс: теперь их два.', 'We optimized the process: now there are two.'),
    p('Пятница. Деплой. Что может пойти не так?', 'Friday. Deploy. What could go wrong?'),
    p('У нас Agile: планов нет.', "We're Agile: we have no plans."),
    p('Мне нужен доступ. Куда угодно.', 'I need access. To anything.'),
    p('Покажите на демо, будто работает.', 'On the demo, make it look like it works.'),
    p('Пароль от Wi-Fi на стикере у монитора.', 'The Wi-Fi password is on a sticky note.'),
    p('Наконец-то всё работает! ...Кто это трогал?', 'Finally everything works! ...Who touched it?'),
  ],
  bank: [
    p('Отчёт для регулятора к утру.', 'The regulator report is due by morning.'),
    p('Кредит одобрен. Ой, не тому.', 'Loan approved. Oops, wrong person.'),
    p('Дресс-код: галстук даже на удалёнке.', 'Dress code: a tie even when remote.'),
    p('Мейнфрейм старше меня.', 'The mainframe is older than me.'),
  ],
  studio: [
    p('Ещё один кранч — и релиз!', 'One more crunch and we ship!'),
    p('Добавим лутбоксы?', 'Should we add loot boxes?'),
    p('Геймплей потом, сначала трейлер.', 'Gameplay later, trailer first.'),
    p('Баг стал фичей и мемом.', 'The bug became a feature and a meme.'),
  ],
  space: [
    p('Хьюстон, у нас прод упал.', 'Houston, prod is down.'),
    p('Невесомость, а дедлайн давит.', 'Zero gravity, yet the deadline is crushing.'),
    p('Кто оставил кружку на орбите?', 'Who left a mug in orbit?'),
    p('Пинг до Земли — восемь минут.', 'Ping to Earth is eight minutes.'),
  ],
  newyear: [
    p('С наступающим! Релиз после праздников.', 'Happy holidays! Release after the break.'),
    p('Оливье в холодильнике не трогать!', "Don't touch the salad in the fridge!"),
    p('Дед Мороз принесёт новый сервер?', 'Will Santa bring a new server?'),
  ],
  sysadminDay: [
    p('С днём сисадмина! Ничего не ломайте.', "Happy Sysadmin Day! Don't break anything."),
    p('Сегодня даже принтер работает.', 'Today even the printer works.'),
  ],
  hackathon: [
    p('Хакатон! Сон для слабых.', 'Hackathon! Sleep is for the weak.'),
    p('Пицца закончилась, код — нет.', 'The pizza ran out, the code did not.'),
  ],
};

export const PHRASE_GROUPS = Object.keys(PHRASES) as PhraseGroup[];

export function phraseId(group: PhraseGroup, i: number): string {
  return `${group}.${i}`;
}

export function phraseById(id: string): Phrase | undefined {
  const [g, i] = id.split('.');
  return PHRASES[g as PhraseGroup]?.[Number(i)];
}

export const TOTAL_PHRASES = PHRASE_GROUPS.reduce((s, g) => s + PHRASES[g].length, 0);

/** Группа реплик руководителя отдела. */
export const LEAD_GROUP: PhraseGroup[] = ['supportLead', 'devLead', 'qaLead', 'analystsLead', 'sysadminsLead'];
export const DEPT_GROUP: PhraseGroup[] = ['support', 'dev', 'qa', 'analysts', 'sysadmins'];
