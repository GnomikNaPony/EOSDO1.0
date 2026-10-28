import './styles.css';
import { USER, TYPES, TODAY, escapeHTML as esc, formatDate, seedDocuments, loadDocuments, saveDocuments, filterDocuments, sortDocuments, documentsForSection, toCSV } from './data.js';
import { icon } from './icons.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let documents = loadDocuments(storage);
const state = { section: 'tasks/all', tab: 'general', filters: {}, sort: 'date', direction: -1, page: 1, pageSize: 20, selected: new Set(), collapsed: false, mobileOpen: false, searchRun: false, searchArea: 'all', picker: null };
const navigation = [
  { id: 'documents', label: 'Документы', icon: 'folder', children: [['created', 'Созданные мной'], ['coexecutor', 'Соисполнитель'], ['processed', 'Обработанные'], ['favorites', 'Избранные'], ['cancelled', 'Аннулированные']] },
  { id: 'tasks', label: 'Задачи / уведомления', icon: 'tasks', children: [['all', 'Мои задачи'], ['review', 'Рассмотрение'], ['revision', 'Доработка / исправление'], ['execution', 'Исполнение'], ['familiarization', 'Ознакомление'], ['notifications', 'Уведомления']] },
  { id: 'assignments', label: 'Поручения', icon: 'assignment', children: [['execution', 'На исполнении у меня'], ['familiarization', 'На ознакомлении у меня'], ['issued', 'Выданные мной'], ['closed', 'Закрытые'], ['control', 'На контроле']] },
  { id: 'journals', label: 'Журналы', icon: 'book', children: [['incoming', 'Входящие документы'], ['outgoing', 'Исходящие документы'], ['internal', 'Внутренние документы']] },
];
const heading = () => {
  if (state.section === 'search/all') return 'Поиск';
  if (state.section === 'references/all') return 'Справочники';
  if (state.section === 'issued/all') return 'Выданные документы';
  const [group, child] = state.section.split('/');
  const nav = navigation.find(n => n.id === group);
  if (group === 'tasks') return 'Задачи/уведомления';
  if (group === 'assignments') return 'Поручения';
  return nav?.children.find(c => c[0] === child)?.[1] || 'Рабочее место';
};
const btn = (label, action, glyph = '', extra = '') => `<button type="button" class="button ${extra}" data-action="${action}">${glyph ? icon(glyph) : ''}${label}</button>`;
const iconBtn = (label, action, glyph, extra = '') => `<button type="button" class="icon-button ${extra}" title="${label}" aria-label="${label}" data-action="${action}">${icon(glyph)}</button>`;
const options = (values, selected, empty = 'Все') => `<option value="">${empty}</option>${values.map(v => `<option ${v === selected ? 'selected' : ''}>${esc(v)}</option>`).join('')}`;
const labelInput = (label, name, value = '', type = 'text', extra = '') => `<label class="field"><span>${label}</span><input type="${type}" name="${name}" value="${esc(value)}" ${extra}></label>`;
const labelSelect = (label, name, values, value, empty) => `<label class="field"><span>${label}</span><select name="${name}">${options(values, value, empty)}</select></label>`;
const currentDoc = () => documents.find(d => d.id === decodeHash().slice(4));
function decodeHash() { try { return decodeURIComponent(location.hash.slice(2)); } catch { return 'tasks/all'; } }
function persist() {
  const ok = saveDocuments(storage, documents);
  if (!ok) toast('Хранилище недоступно. Изменения действуют до закрытия страницы.', true);
  return ok;
}
function history(doc, text) { doc.history.unshift({ text, user: USER, date: new Date().toISOString().slice(0, 10) }); }
let toastTimer;
function toast(text, warning = false) {
  const node = document.querySelector('#toast');
  node.textContent = text; node.className = `visible${warning ? ' warning' : ''}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.className = '', 4200);
}
function sidebar() {
  return `<aside class="sidebar" aria-label="Разделы системы">
    <div class="organization">${icon('tree')}<span>Филиал АО «Концерн Росэнергоатом»<strong>Ростовская атомная станция</strong></span></div>
    <nav><div class="tree-root">${icon('down')}${icon('folder')}<span>Рабочее место</span></div>
      ${navigation.map(n => `<details class="nav-group" open><summary>${icon(n.icon)}<span>${n.label}</span></summary><div class="nav-children">${n.children.map(([id, label]) => {
        const section = `${n.id}/${id}`;
        const count = documentsForSection(documents, section).filter(d => !d.read).length;
        return `<a href="#/${section}" class="nav-link ${state.section === section ? 'active' : ''}" ${state.section === section ? 'aria-current="page"' : ''}>${icon(n.id === 'tasks' ? 'tasks' : 'file')}<span>${label}</span>${count && n.id === 'tasks' ? `<small>${count}</small>` : ''}</a>`;
      }).join('')}</div></details>`).join('')}
      <a href="#/references/all" class="nav-link standalone ${state.section === 'references/all' ? 'active' : ''}">${icon('book')}Справочники</a>
      <a href="#/search/all" class="nav-link standalone ${state.section === 'search/all' ? 'active' : ''}">${icon('search')}Поиск</a>
      <a href="#/issued/all" class="nav-link standalone ${state.section === 'issued/all' ? 'active' : ''}">${icon('file')}Выданные документы</a>
    </nav>
    <div class="sidebar-bottom"><span class="connection-dot"></span>ЕОСДО 3.0<span class="version">Демо</span></div>
  </aside>`;
}
function render() {
  const doc = currentDoc();
  document.title = `${doc ? doc.number : heading()} — ЕОСДО 3.0`;
  app.innerHTML = `<div class="application ${state.collapsed ? 'nav-collapsed' : ''} ${state.mobileOpen ? 'mobile-open' : ''} ${doc ? 'card-mode' : ''}">
    <header class="topbar">
      ${iconBtn('Показать / скрыть навигацию', 'toggle-nav', 'menu', 'nav-toggle')}
      <a href="#/tasks/all" class="brand"><img src="${import.meta.env.BASE_URL}favicon.svg" alt=""><span>ЕОСДО <b>3.0</b></span></a>
      <div class="system-name">Единая отраслевая система документооборота</div>
      <div class="topbar-right">${iconBtn('Поиск документов', 'global-search', 'search')}${iconBtn('Уведомления', 'notifications', 'bell')}${iconBtn('Справка', 'help', 'help')}<span class="top-divider"></span><button class="user-button" data-action="user-menu">${icon('user')}<span>${USER}</span>${icon('down')}</button></div>
    </header>
    ${sidebar()}<button class="nav-scrim" data-action="toggle-nav" aria-label="Закрыть навигацию"></button>
    <button class="sidebar-handle" data-action="toggle-nav" title="Свернуть панель" aria-label="Свернуть панель">${icon('chevron')}</button>
    <main id="main" class="workspace" aria-label="Рабочая область">${doc ? renderCard(doc) : state.section === 'search/all' ? renderSearch() : state.section === 'references/all' ? renderReferences() : renderList()}</main>
    <footer class="statusbar"><span>${icon('info')}Демонстрационные данные · локальное хранение</span><span>Ростовская АЭС <i></i> ${formatDate(TODAY)}</span></footer>
  </div>`;
}
function renderList() {
  const group = state.section.split('/')[0];
  const categoryLabel = navigation.find(n => n.id === group)?.children.find(c => c[0] === state.section.split('/')[1])?.[1] || 'Все документы';
  return `<div class="workspace-toolbar"><div class="action-menu"><button class="button primary" data-action="actions">Действия ${icon('down')}</button></div><div class="toolbar-right">${btn('Создать проект документа', 'new-document', 'plus')}${iconBtn('Обновить список', 'refresh', 'refresh')}${iconBtn('Настройки списка', 'list-settings', 'grid')}</div></div>
    <div class="title-row"><h1>${heading()}</h1><span class="view-name">${esc(categoryLabel)}</span>${iconBtn('Свернуть / развернуть фильтры', 'toggle-filters', 'down')}</div>
    <form id="filters" class="filters" data-form="filters">
      <div class="filter-toggles"><label><input type="checkbox" name="unread" ${state.filters.unread ? 'checked' : ''}> Не прочитано</label><label class="filter-own"><input type="checkbox" checked disabled> Мои задачи</label><button type="reset" class="text-button">Сбросить фильтры</button></div>
      <div class="filter-grid">
        ${labelInput('Содержание', 'query', state.filters.query, 'search', 'placeholder="" aria-label="Содержание"')}
        ${labelSelect('Тип документа', 'type', TYPES, state.filters.type, 'Все типы')}
        ${labelInput('Автор', 'author', state.filters.author)}
        <div class="field date-field"><span>Получены с … по</span><div class="date-range"><input type="date" name="from" value="${esc(state.filters.from || '')}" aria-label="Дата с"><span>—</span><input type="date" name="to" value="${esc(state.filters.to || '')}" aria-label="Дата по"></div></div>
        ${labelInput('Рег. номер', 'number', state.filters.number)}
        ${labelSelect('Статус', 'status', ['Принято к исполнению', 'На согласовании', 'Исполнено', 'Проект'], state.filters.status)}
      </div><div class="filter-submit"><button class="button" type="submit">${icon('search')}Найти</button></div>
    </form>
    <div class="list-tools"><div>${iconBtn('Выбрать все строки', 'select-all', 'check')}${iconBtn('Отметить прочитанными', 'mark-read', 'file')}${iconBtn('Выгрузить список', 'export', 'download')}<span class="selected-count">Выбрано: ${state.selected.size}</span></div><span>Записей: <b>${listRows().length}</b></span></div>
    ${renderTable(listRows())}`;
}
function listRows() {
  return sortDocuments(filterDocuments(documentsForSection(documents, state.section), state.filters), state.sort, state.direction);
}
function renderTable(rows, linked = false) {
  const shown = linked ? rows : rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
  const columns = [['task', 'Задача', 'task-col'], ['type', 'Тип документа', 'type-col'], ['deadline', 'Срок исполнения', 'date-col'], ['date', 'Дата получения', 'date-col'], ['number', 'Рег. номер / дата', 'number-col'], ['status', 'Статус', 'status-col'], ['title', 'Краткое содержание документа', 'subject-col'], ['author', 'Автор', 'author-col']];
  return `<div class="table-scroll"><table class="document-table"><thead><tr><th class="check-col"><input type="checkbox" aria-label="Выбрать все документы" data-check="all" ${shown.length && shown.every(d => state.selected.has(d.id)) ? 'checked' : ''}></th><th class="file-col"></th>${columns.map(([key, label, cls]) => `<th class="${cls}" aria-sort="${state.sort === key ? state.direction === 1 ? 'ascending' : 'descending' : 'none'}"><button data-action="sort" data-key="${key}">${label}${state.sort === key ? icon(state.direction === 1 ? 'chevron' : 'down', 'sort-indicator') : ''}</button></th>`).join('')}</tr></thead>
      <tbody>${shown.length ? shown.map(d => `<tr data-id="${esc(d.id)}" class="${!d.read ? 'unread' : ''} ${state.selected.has(d.id) ? 'selected' : ''}"><td><input type="checkbox" aria-label="Выбрать ${esc(d.number)}" data-check="row" value="${esc(d.id)}" ${state.selected.has(d.id) ? 'checked' : ''}></td><td class="document-icon">${icon('file')}${d.favorite ? '<span class="favorite-marker">★</span>' : ''}</td><td><a class="task-link" href="#/doc/${encodeURIComponent(d.id)}">${esc(d.task)}</a></td><td>${esc(d.type)}</td><td class="${d.deadline < TODAY && d.status !== 'Исполнено' ? 'overdue' : ''}">${formatDate(d.deadline)}<small>18:00:00</small></td><td>${formatDate(d.date)}<small>09:24:16</small></td><td><a class="document-link" href="#/doc/${encodeURIComponent(d.id)}">${esc(d.number)}</a><small>${formatDate(d.date)}</small></td><td><span class="status-text ${d.status === 'Исполнено' ? 'done' : ''}">${esc(d.status)}</span></td><td><a class="subject-link" href="#/doc/${encodeURIComponent(d.id)}">${esc(d.title)}</a></td><td>${esc(d.author)}<small>Ростовская АЭС</small></td></tr>`).join('') : `<tr><td colspan="10" class="empty-table">${icon('search')}<strong>Нет записей для отображения</strong><span>Измените условия поиска или сбросьте фильтры.</span></td></tr>`}</tbody></table></div>
      ${linked ? '' : `<div class="table-footer"><span>${rows.length ? `Записи ${(state.page - 1) * state.pageSize + 1}–${Math.min(state.page * state.pageSize, rows.length)} из ${rows.length}` : 'Записи 0 из 0'}</span><div class="pagination">${iconBtn('Предыдущая страница', 'previous-page', 'arrowLeft')}<span>Страница <b>${state.page}</b> из ${Math.max(1, Math.ceil(rows.length / state.pageSize))}</span>${iconBtn('Следующая страница', 'next-page', 'arrowRight')}<select aria-label="Записей на странице" id="page-size">${[10, 20, 50].map(n => `<option ${n === state.pageSize ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>`}`;
}
function renderCard(doc) {
  const tabs = [['general', 'Основные реквизиты'], ['approval', 'Согласование и подписание'], ['linked', 'Связанные документы'], ['case', 'Место хранения подлинника'], ['history', 'История'], ['comments', `Комментарии (${doc.comments.length})`]];
  return `<div class="document-heading"><div><span>${esc(doc.type)}</span><h1>${esc(doc.number)} от ${formatDate(doc.date)}</h1></div><div><span class="document-state">${esc(doc.status)}</span><small>Ростовская АЭС</small></div></div>
    <div class="document-actions">${btn('Назад к списку', 'back', 'arrowLeft')}${btn('Сохранить', 'save-card', 'save', 'primary')}${btn(doc.status === 'Исполнено' ? 'Вернуть в работу' : 'Завершить поручение', 'complete', 'check')}<div class="toolbar-right">${iconBtn(doc.favorite ? 'Удалить из избранного' : 'Добавить в избранное', 'favorite', 'star', doc.favorite ? 'is-favorite' : '')}${iconBtn('Печать карточки', 'print', 'print')}${iconBtn('Скачать карточку', 'download-document', 'download')}</div></div>
    <div class="document-tabs" role="tablist" aria-label="Разделы карточки">${tabs.map(([key, label]) => `<button role="tab" id="tab-${key}" aria-selected="${state.tab === key}" aria-controls="card-panel" tabindex="${state.tab === key ? 0 : -1}" data-action="card-tab" data-tab="${key}">${label}</button>`).join('')}</div>
    <div class="card-panel" id="card-panel" role="tabpanel" aria-labelledby="tab-${state.tab}">${state.tab === 'general' ? renderGeneral(doc) : state.tab === 'approval' ? renderApproval(doc) : state.tab === 'linked' ? renderLinked(doc) : state.tab === 'case' ? renderCase(doc) : state.tab === 'history' ? renderHistory(doc) : renderComments(doc)}</div>`;
}
function renderGeneral(doc) {
  return `<form id="card-form" data-form="card"><section class="card-section"><h2>Информация о документе</h2><div class="card-fields">${labelInput('Регистрационный номер', 'number', doc.number, 'text', 'required maxlength="80"')}${labelInput('Дата регистрации', 'date', doc.date, 'date', 'required')}${labelSelect('Вид документа', 'type', TYPES, doc.type, 'Выберите тип')}${labelInput('Автор документа', 'author', doc.author, 'text', 'required maxlength="100"')}${labelInput('Подразделение', 'department', doc.department, 'text', 'required maxlength="150"')}<label class="field"><span>Состояние документа</span><input value="${esc(doc.status)}" readonly></label></div><label class="wide-field"><span>Краткое содержание <em>*</em></span><textarea name="title" required maxlength="1000" rows="2">${esc(doc.title)}</textarea></label></section>
    <section class="card-section"><h2>Информация о поручении</h2><div class="card-fields">${labelInput('Кем поручено', 'from', doc.author, 'text', 'readonly')}${labelInput('Кому поручено', 'assignee', doc.assignee, 'text', 'required maxlength="100"')}${labelSelect('Тип поручения', 'task', ['На рассмотрение', 'На исполнение', 'На ознакомление', 'На доработку / исправление', 'На согласование', 'На подписание'], doc.task)}${labelInput('Срок исполнения', 'deadline', doc.deadline, 'date', 'required')}</div><label class="wide-field"><span>Содержание поручения</span><textarea name="text" rows="4" maxlength="5000">${esc(doc.text)}</textarea></label></section></form>
    <section class="card-section"><h2>Файлы документа <span>(1)</span></h2><div class="attachment-row"><div class="attachment-icon">${icon('file')}</div><div><button class="text-button" data-action="preview-file">Служебная записка.txt</button><small>Текстовый документ · демонстрационный файл</small></div><div class="toolbar-right">${btn('Просмотр', 'preview-file', 'search')}${btn('Скачать', 'download-document', 'download')}</div></div></section>
    <section class="card-section"><h2>Исполнители <span>(1)</span></h2><table class="simple-table"><thead><tr><th>Исполнитель</th><th>Подразделение</th><th>Тип поручения</th><th>Срок исполнения</th><th>Состояние</th></tr></thead><tbody><tr><td>${icon('user')}${esc(doc.assignee)}</td><td>Ростовская АЭС</td><td>${esc(doc.task)}</td><td>${formatDate(doc.deadline)}</td><td>${esc(doc.status)}</td></tr></tbody></table></section>`;
}
function renderApproval(doc) {
  return `<section class="card-section"><h2>Пояснительная записка</h2><form data-form="instructions"><div class="editor-toolbar"><b>Ж</b><i>К</i><u>Ч</u><span class="separator"></span><span>Arial</span><span>12</span><span class="separator"></span>${icon('file')} ${icon('link')}<span class="editor-hint">Текст пояснения для согласующих</span></div><textarea class="editor" name="instructions" rows="5" aria-label="Пояснительная записка" maxlength="5000">${esc(doc.instructions)}</textarea><div class="section-bottom"><button type="submit" class="text-button">Сохранить пояснение</button></div></form></section>
    <section class="card-section"><h2>Список очередей</h2><div class="section-toolbar">${btn('Добавить очередь', 'add-queue', 'plus')}<span>Последовательное согласование</span></div>${doc.queues.length ? doc.queues.map((q, i) => `<div class="approval-queue"><div class="queue-heading"><strong>Очередь ${i + 1}</strong><span>Согласование</span>${btn('Добавить согласующего', 'add-approver', 'user').replace('data-action="add-approver"', `data-action="add-approver" data-queue="${i}"`)}${iconBtn('Удалить очередь', 'remove-queue', 'trash').replace('data-action="remove-queue"', `data-action="remove-queue" data-queue="${i}"`)}</div><table class="simple-table"><thead><tr><th>Согласующий</th><th>Подразделение</th><th>Результат</th><th>Действия</th></tr></thead><tbody>${q.people.length ? q.people.map(p => `<tr><td>${icon('user')}${esc(p)}</td><td>Ростовская АЭС</td><td>${esc(q.status)}</td><td>${q.status === 'Не направлено' ? `<button class="text-button" data-action="approve" data-queue="${i}">Записать визу</button>` : 'Виза записана локально'}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">Не добавлены согласующие</td></tr>'}</tbody></table></div>`).join('') : '<div class="blank-list">Очереди не добавлены</div>'}</section>
    <section class="card-section"><h2>Визы по документу</h2><table class="simple-table"><thead><tr><th>Согласующий</th><th>Результат согласования</th><th>Примечание</th><th>Дата</th></tr></thead><tbody>${doc.queues.some(q => q.status !== 'Не направлено') ? doc.queues.filter(q => q.status !== 'Не направлено').flatMap(q => q.people.map(p => `<tr><td>${esc(p)}</td><td>${esc(q.status)}</td><td>${esc(q.note || 'Демонстрационная виза')}</td><td>${formatDate(TODAY)}</td></tr>`)).join('') : '<tr><td colspan="4" class="muted">Визы по документу отсутствуют</td></tr>'}</tbody></table></section>`;
}
function renderLinked(doc) {
  const rows = doc.linked.map(id => documents.find(d => d.id === id)).filter(Boolean);
  return `<section class="card-section"><h2>Связанные документы <span>(${rows.length})</span></h2><div class="section-toolbar">${btn('Добавить', 'link-document', 'plus')}${btn('Добавить по ссылке', 'link-by-url', 'link')}</div><table class="simple-table linked-table"><thead><tr><th>Вид связи</th><th>Рег. номер / дата</th><th>Вид документа</th><th>Краткое содержание</th><th></th></tr></thead><tbody>${rows.length ? rows.map(d => `<tr><td>Связанный документ</td><td><a href="#/doc/${encodeURIComponent(d.id)}">${esc(d.number)}</a><small>${formatDate(d.date)}</small></td><td>${esc(d.type)}</td><td>${esc(d.title)}</td><td>${iconBtn('Удалить связь', 'unlink', 'close').replace('data-action="unlink"', `data-action="unlink" data-id="${esc(d.id)}"`)}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Нет записей для отображения</td></tr>'}</tbody></table></section>`;
}
function renderCase(doc) {
  return `<section class="card-section"><h2>Место хранения подлинника</h2><div class="case-fields">${labelInput('Организация', 'organization', doc.department, 'text', 'readonly')}<div class="field"><span>Дело по номенклатуре</span><div class="input-with-button"><input value="${esc(doc.caseName)}" placeholder="Не выбрано" readonly aria-label="Выбранное дело">${iconBtn('Выбрать дело', 'choose-case', 'folder')}</div></div>${labelInput('Вид носителя', 'carrier', 'Электронный', 'text', 'readonly')}</div><div class="section-toolbar">${btn('Выбрать дело', 'choose-case', 'folder')}${doc.caseName ? btn('Очистить', 'clear-case', 'close') : ''}</div></section>`;
}
function renderHistory(doc) {
  return `<section class="card-section"><h2>История работы с документом</h2><table class="simple-table"><thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th></tr></thead><tbody>${doc.history.map(h => `<tr><td>${formatDate(h.date)}</td><td>${esc(h.user)}</td><td>${esc(h.text)}</td></tr>`).join('')}</tbody></table></section>`;
}
function renderComments(doc) {
  return `<section class="card-section"><h2>Комментарии к документу</h2><form data-form="comment"><label class="wide-field"><span>Новый комментарий</span><textarea name="comment" required maxlength="2000" rows="4" placeholder="Введите текст комментария"></textarea></label><button class="button primary" type="submit">${icon('plus')}Добавить комментарий</button></form><div class="comments">${doc.comments.length ? doc.comments.map(c => `<article class="comment"><div>${icon('user')}<strong>${esc(c.user)}</strong><time>${formatDate(c.date)}</time></div><p>${esc(c.text)}</p></article>`).join('') : '<p class="muted">Комментариев пока нет.</p>'}</div></section>`;
}
function renderSearch() {
  return `<div class="title-row search-title"><h1>Поиск</h1><span class="view-name">Документы системы</span></div><div class="search-layout"><aside class="search-tree"><h3>Область поиска</h3><details open><summary>${icon('folder')}Документы</summary><label><input type="radio" name="search-area" value="all" ${state.searchArea === 'all' ? 'checked' : ''}> Все документы</label><label><input type="radio" name="search-area" value="created" ${state.searchArea === 'created' ? 'checked' : ''}> Созданные мной</label><label><input type="radio" name="search-area" value="favorites" ${state.searchArea === 'favorites' ? 'checked' : ''}> Избранные</label></details><details open><summary>${icon('folder')}По типу документа</summary>${TYPES.map(t => `<button class="tree-item" data-action="search-type" data-type="${esc(t)}">${icon('file')}${t}</button>`).join('')}</details></aside><div class="search-main"><section class="card-section"><h2>Общие поисковые атрибуты</h2><form data-form="search" id="search-form"><div class="search-fields">${labelInput('Рег. номер', 'number', state.filters.number)}${labelSelect('Вид документа', 'type', TYPES, state.filters.type)}${labelInput('Краткое содержание', 'query', state.filters.query, 'search')}${labelInput('Автор', 'author', state.filters.author)}${labelInput('Дата регистрации с', 'from', state.filters.from, 'date')}${labelInput('Дата регистрации по', 'to', state.filters.to, 'date')}</div><div class="section-toolbar"><button class="button primary" type="submit">${icon('search')}Поиск</button><button class="button" type="reset">${icon('close')}Очистить</button></div></form></section><section class="search-results"><h2>Результаты поиска${state.searchRun ? ` <span>(${searchRows().length})</span>` : ''}</h2>${state.searchRun ? renderTable(searchRows()) : '<div class="search-placeholder">Задайте условия и нажмите «Поиск»</div>'}</section></div></div>`;
}
function searchRows() {
  const source = state.searchArea === 'all' ? documents : documentsForSection(documents, `documents/${state.searchArea}`);
  return sortDocuments(filterDocuments(source, state.filters), state.sort, state.direction);
}
function renderReferences() {
  return `<div class="title-row"><h1>Справочники</h1></div><div class="reference-list"><h2>Общие справочники</h2>${[['users', 'Организационная структура и сотрудники', 'people-picker'], ['folder', 'Номенклатура дел', 'choose-case'], ['file', 'Виды документов', 'new-document']].map(([glyph, title, action]) => `<button data-action="${action}" class="reference-item">${icon(glyph)}${title}${icon('chevron')}</button>`).join('')}</div>`;
}
function openDialog(title, content, footer = '', wide = false) {
  if (dialog.open) dialog.close();
  dialog.className = wide ? 'wide-dialog' : '';
  dialog.innerHTML = `<div class="dialog-title"><h2>${title}</h2>${iconBtn('Закрыть окно', 'close-dialog', 'close')}</div><div class="dialog-body">${content}</div><div class="dialog-footer">${footer}${btn('Отмена', 'close-dialog')}</div>`;
  dialog.showModal();
}
function typeTree() {
  return `<p class="dialog-description">Выберите тип создаваемого документа</p><div class="picker-tree"><details open><summary>${icon('folder')}Служебная переписка</summary><details open><summary>${icon('folder')}Филиалы АО «Концерн Росэнергоатом»</summary><details open><summary>${icon('folder')}Ростовская АЭС</summary>${['Служебная записка', 'Письмо', 'Протокол'].map(t => `<button class="tree-item" data-action="pick-type" data-value="${t}">${icon('file')}${t}</button>`).join('')}</details><details><summary>${icon('folder')}Другие филиалы</summary><span class="muted tree-note">В демонстрации доступны типы Ростовской АЭС</span></details></details></details><details><summary>${icon('folder')}Организационно-распорядительные документы</summary>${TYPES.slice(0, 3).map(t => `<button class="tree-item" data-action="pick-type" data-value="${t}">${icon('file')}${t}</button>`).join('')}</details></div>`;
}
function createDialog(type) {
  openDialog('Создание проекта документа', `<div class="selected-type">${icon('file')}<span>${esc(type)}<small>Ростовская АЭС</small></span></div><form id="modal-form" data-form="create"><input type="hidden" name="type" value="${esc(type)}">${labelInput('Краткое содержание', 'title', '', 'text', 'required maxlength="1000" placeholder="О чём документ"')}${labelInput('Автор', 'author', USER, 'text', 'required maxlength="100"')}${labelInput('Срок исполнения', 'deadline', '2026-11-06', 'date', 'required')}<p class="muted">Будет создан локальный проект. Документ не направляется в реальную систему.</p></form>`, '<button class="button primary" type="submit" form="modal-form">Создать</button>');
}
function caseDialog() {
  state.picker = { type: 'case', value: '' };
  openDialog('Выбор дела по номенклатуре', `<div class="picker-tree case-tree"><details open><summary>${icon('folder')}АО «Концерн Росэнергоатом»</summary><details open><summary>${icon('folder')}Филиалы</summary><details open><summary>${icon('folder')}Ростовская АЭС</summary><details open><summary>${icon('folder')}Номенклатура дел на 2026 год</summary><details open><summary>${icon('folder')}Директор</summary><details open><summary>${icon('folder')}Первый заместитель директора — главный инженер</summary><details open><summary>${icon('folder')}Производственно-технический отдел</summary>${['01-01 Организационно-распорядительные документы', '01-02 Служебная переписка по основной деятельности', '01-03 Протоколы производственных совещаний', '01-04 Переписка по исполнению поручений', '01-05 Отчёты о выполнении мероприятий'].map(t => `<button class="tree-item" data-action="pick-case" data-value="${t}">${icon('file')}${t}</button>`).join('')}</details></details></details></details></details></details></details></div>`, btn('Выбрать', 'confirm-case', 'check', 'primary'), true);
}
const people = ['Иванов И. И.', 'Петров А. В.', 'Смирнова Е. Н.', 'Кузнецов Д. С.', 'Соколов М. А.'];
function peopleDialog(queue = null) {
  state.picker = { type: 'people', queue };
  openDialog('Выбор сотрудника', `<div class="people-picker"><div class="picker-tree"><details open><summary>${icon('folder')}Ростовская АЭС</summary><details open><summary>${icon('folder')}Производственно-технический отдел</summary>${people.map(p => `<label class="person-option"><input type="checkbox" name="person" value="${p}">${icon('user')}${p}<small>Специалист</small></label>`).join('')}</details></details></div></div>`, btn(queue === null ? 'Закрыть' : 'Добавить выбранных', queue === null ? 'close-dialog' : 'confirm-people', 'check', 'primary'));
}
function linkedDialog() {
  state.picker = { type: 'linked' };
  openDialog('Поиск связанных документов', `<form data-form="link-search" id="link-search"><div class="dialog-search">${labelInput('Номер или содержание', 'query', '', 'search', 'placeholder="Введите номер или слова из темы"')}<button class="button primary" type="submit">${icon('search')}Поиск</button></div></form><div id="link-results" class="link-results">${linkResults(documents)}</div>`, '', true);
}
function linkResults(rows) {
  const doc = currentDoc();
  const available = rows.filter(d => d.id !== doc?.id);
  return `<table class="simple-table"><thead><tr><th>Рег. номер / дата</th><th>Краткое содержание</th><th></th></tr></thead><tbody>${available.length ? available.map(d => `<tr><td>${esc(d.number)}<small>${formatDate(d.date)}</small></td><td>${esc(d.title)}</td><td><button class="text-button" data-action="confirm-link" data-id="${esc(d.id)}" ${doc?.linked.includes(d.id) ? 'disabled' : ''}>${doc?.linked.includes(d.id) ? 'Добавлен' : 'Добавить'}</button></td></tr>`).join('') : '<tr><td colspan="3" class="muted">Ничего не найдено</td></tr>'}</tbody></table>`;
}
function addLink(id) {
  const doc = currentDoc();
  if (!doc || !documents.some(d => d.id === id) || id === doc.id) { toast('Документ не найден или ссылается на себя.', true); return; }
  if (doc.linked.includes(id)) { toast('Этот документ уже добавлен.'); return; }
  doc.linked.push(id); history(doc, 'Добавлен связанный документ'); const ok = persist(); dialog.close(); render(); if (ok) toast('Связанный документ добавлен');
}
function download(content, filename, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function documentText(doc) { return `ДЕМОНСТРАЦИОННЫЙ ДОКУМЕНТ\nРостовская АЭС\n${doc.type}\n${doc.number} от ${formatDate(doc.date)}\n\n${doc.title}\n\n${doc.text}\n\nАвтор: ${doc.author}\nИсполнитель: ${doc.assignee}\nСрок: ${formatDate(doc.deadline)}\n\nСоздано в локальном прототипе ЕОСДО. Юридической силы не имеет.`; }
function applyFilters(form) {
  const data = new FormData(form); const filters = Object.fromEntries(data); filters.unread = data.has('unread');
  if (filters.from && filters.to && filters.from > filters.to) { toast('Начальная дата должна быть не позже конечной.', true); return false; }
  state.filters = filters;
  state.page = 1; state.selected.clear(); return true;
}
document.addEventListener('submit', event => {
  const form = event.target.closest('form[data-form]'); if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const doc = currentDoc();
  switch (form.dataset.form) {
    case 'filters': if (applyFilters(form)) render(); break;
    case 'search': if (applyFilters(form)) { state.searchRun = true; render(); } break;
    case 'card': {
      if (!data.title.trim() || !data.number.trim() || !data.author.trim() || !data.assignee.trim()) { toast('Заполните обязательные поля.', true); return; }
      for (const key of ['number', 'date', 'type', 'author', 'department', 'title', 'assignee', 'task', 'deadline', 'text']) doc[key] = data[key].trim();
      history(doc, 'Изменены основные реквизиты'); const ok = persist(); render(); if (ok) toast('Изменения сохранены'); break;
    }
    case 'create': {
      if (!data.title.trim() || !data.author.trim()) { toast('Укажите содержание и автора.', true); return; }
      const id = `doc-${crypto.randomUUID()}`;
      const d = { ...seedDocuments()[0], id, title: data.title.trim(), type: data.type, author: data.author.trim(), deadline: data.deadline, number: `Проект ${documents.filter(d => d.status === 'Проект').length + 1}`, date: TODAY, status: 'Проект', category: 'created', task: 'На согласование', read: true, history: [], queues: [], linked: [], comments: [] };
      history(d, 'Создан проект документа'); documents.unshift(d); const ok = persist(); dialog.close(); state.tab = 'general'; location.hash = `/doc/${id}`; if (ok) toast('Проект документа создан'); break;
    }
    case 'instructions': doc.instructions = data.instructions; history(doc, 'Сохранена пояснительная записка'); if (persist()) toast('Пояснение сохранено'); break;
    case 'comment': if (!data.comment.trim()) return; doc.comments.unshift({ text: data.comment.trim(), user: USER, date: TODAY }); history(doc, 'Добавлен комментарий'); { const ok = persist(); render(); if (ok) toast('Комментарий добавлен'); } break;
    case 'link-search': document.querySelector('#link-results').innerHTML = linkResults(filterDocuments(documents, data)); break;
    case 'link-url': {
      const match = data.url.match(/(?:#\/doc\/|^)(doc-[\w-]+)$/); if (!match) { toast('Вставьте ссылку на карточку этого прототипа или её ID.', true); return; } addLink(match[1]); break;
    }
  }
});
document.addEventListener('reset', event => {
  if (!['filters', 'search'].includes(event.target.dataset.form)) return;
  event.preventDefault(); state.filters = {}; state.page = 1; state.selected.clear(); state.searchRun = false; render();
});
document.addEventListener('change', event => {
  const target = event.target;
  if (target.dataset.check === 'row') { target.checked ? state.selected.add(target.value) : state.selected.delete(target.value); render(); }
  if (target.dataset.check === 'all') selectAll();
  if (target.id === 'page-size') { state.pageSize = Number(target.value); state.page = 1; render(); }
  if (target.name === 'search-area') { state.searchArea = target.value; state.searchRun = true; state.page = 1; state.selected.clear(); render(); }
});
function selectAll() {
  const rows = state.section === 'search/all' ? searchRows() : listRows();
  const shown = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
  if (shown.every(d => state.selected.has(d.id))) shown.forEach(d => state.selected.delete(d.id)); else shown.forEach(d => state.selected.add(d.id));
  render();
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action;
  const doc = currentDoc();
  switch (action) {
    case 'toggle-nav': if (window.innerWidth <= 900) state.mobileOpen = !state.mobileOpen; else state.collapsed = !state.collapsed; render(); break;
    case 'global-search': location.hash = '/search/all'; break;
    case 'notifications': location.hash = '/tasks/notifications'; break;
    case 'help': openDialog('Справка о системе', `<div class="help-content">${icon('info')}<h3>ЕОСДО 3.0 · демонстрационный интерфейс</h3><p>Рабочее место воссоздано по видеозаписи. Документы, сотрудники и регистрационные номера вымышлены.</p><p>Выберите раздел в дереве слева. Чтобы открыть карточку, нажмите на задачу, номер или содержание. Фильтры применяются кнопкой «Найти» или Enter.</p><p>Изменения сохраняются в этом браузере. Реальные документы не отправляются, электронная подпись не выполняется. Одновременная работа в нескольких вкладках не синхронизируется.</p><p><kbd>Ctrl</kbd> + <kbd>K</kbd> — поиск · <kbd>Esc</kbd> — закрыть окно</p></div>`); break;
    case 'user-menu': openDialog('Пользователь', `<div class="user-profile">${icon('user')}<h3>${USER}</h3><p>Ростовская АЭС · демонстрационный профиль</p></div><p>Локальные изменения сохранены в браузере. Можно восстановить исходные демонстрационные документы.</p>`, btn('Сбросить демоданные', 'reset-confirm', 'refresh')); break;
    case 'reset-confirm': openDialog('Сбросить демонстрационные данные?', '<p>Созданные проекты, связи и комментарии в этом браузере будут удалены. Восстановится исходный демонстрационный набор.</p>', btn('Сбросить', 'reset-data', 'refresh', 'primary')); break;
    case 'reset-data': { documents = seedDocuments(); const ok = persist(); dialog.close(); location.hash = '/tasks/all'; state.filters = {}; state.selected.clear(); render(); if (ok) toast('Демонстрационные данные восстановлены'); break; }
    case 'close-dialog': dialog.close(); break;
    case 'new-document': state.picker = { type: 'document', value: '' }; openDialog('Создание проекта документа', typeTree(), btn('Далее', 'confirm-type', 'arrowRight', 'primary')); break;
    case 'pick-type': case 'pick-case': state.picker.value = button.dataset.value; dialog.querySelectorAll('.tree-item.selected').forEach(b => b.classList.remove('selected')); button.classList.add('selected'); break;
    case 'confirm-type': if (state.picker.value) createDialog(state.picker.value); else toast('Выберите тип документа в дереве.', true); break;
    case 'choose-case': caseDialog(); break;
    case 'confirm-case': { if (!state.picker.value) { toast('Выберите дело в дереве.', true); return; } let ok = true; if (doc) { doc.caseName = state.picker.value; history(doc, 'Выбрано дело по номенклатуре'); ok = persist(); } dialog.close(); render(); if (ok) toast(doc ? 'Дело выбрано' : `Выбрано: ${state.picker.value}`); break; }
    case 'clear-case': doc.caseName = ''; history(doc, 'Очищено дело по номенклатуре'); persist(); render(); break;
    case 'people-picker': peopleDialog(); break;
    case 'actions': openDialog('Действия со списком', `<div class="action-list">${btn('Создать проект документа', 'new-document', 'plus')}${btn('Отметить выбранные прочитанными', 'mark-read', 'check')}${btn('Выгрузить список в CSV', 'export', 'download')}</div>`); break;
    case 'refresh': render(); toast('Список обновлён'); break;
    case 'list-settings': openDialog('Настройки списка', '<p>Сортировка доступна по заголовкам столбцов. Количество записей на странице можно изменить внизу таблицы. Широкая таблица прокручивается по горизонтали.</p>'); break;
    case 'toggle-filters': { const filters = document.querySelector('#filters'); filters.hidden = !filters.hidden; button.setAttribute('aria-expanded', String(!filters.hidden)); break; }
    case 'sort': state.direction = state.sort === button.dataset.key ? -state.direction : 1; state.sort = button.dataset.key; render(); break;
    case 'select-all': selectAll(); break;
    case 'mark-read': if (!state.selected.size) { toast('Сначала выберите документы в таблице.'); return; } documents.filter(d => state.selected.has(d.id)).forEach(d => d.read = true); persist(); dialog.close(); state.selected.clear(); render(); break;
    case 'export': { const rows = state.section === 'search/all' ? searchRows() : listRows(); download(toCSV(state.selected.size ? rows.filter(d => state.selected.has(d.id)) : rows), 'eosdo-documents.csv', 'text/csv;charset=utf-8'); dialog.close(); toast('Список выгружен в CSV'); break; }
    case 'previous-page': state.page = Math.max(1, state.page - 1); render(); break;
    case 'next-page': state.page = Math.min(Math.max(1, Math.ceil((state.section === 'search/all' ? searchRows() : listRows()).length / state.pageSize)), state.page + 1); render(); break;
    case 'back': location.hash = `/${state.section}`; break;
    case 'card-tab': state.tab = button.dataset.tab; render(); document.querySelector(`#tab-${state.tab}`).focus(); break;
    case 'save-card': { const form = document.querySelector('#card-form') || document.querySelector('[data-form="instructions"]'); if (form) form.requestSubmit(); else if (persist()) toast('Изменения сохранены'); break; }
    case 'favorite': doc.favorite = !doc.favorite; persist(); render(); break;
    case 'complete': doc.status = doc.status === 'Исполнено' ? 'Принято к исполнению' : 'Исполнено'; history(doc, doc.status === 'Исполнено' ? 'Поручение завершено локально' : 'Поручение возвращено в работу'); { const ok = persist(); render(); if (ok) toast(doc.status === 'Исполнено' ? 'Поручение завершено в демонстрации' : 'Поручение возвращено в работу'); } break;
    case 'print': window.print(); break;
    case 'preview-file': openDialog('Служебная записка.txt', `<pre class="file-preview">${esc(documentText(doc))}</pre>`, btn('Скачать файл', 'download-document', 'download'), true); break;
    case 'download-document': download(documentText(doc), `Служебная записка — ${doc.id}.txt`); break;
    case 'add-queue': doc.queues.push({ people: [], status: 'Не направлено', note: '' }); history(doc, 'Добавлена очередь согласования'); persist(); render(); break;
    case 'remove-queue': doc.queues.splice(Number(button.dataset.queue), 1); history(doc, 'Удалена очередь согласования'); persist(); render(); break;
    case 'add-approver': peopleDialog(Number(button.dataset.queue)); break;
    case 'confirm-people': { const selected = [...dialog.querySelectorAll('input[name="person"]:checked')].map(i => i.value); if (!selected.length) { toast('Выберите хотя бы одного сотрудника.', true); return; } const q = doc.queues[state.picker.queue]; q.people = [...new Set([...q.people, ...selected])]; history(doc, 'Добавлены участники согласования'); persist(); dialog.close(); render(); break; }
    case 'approve': state.picker = { type: 'visa', queue: Number(button.dataset.queue) }; openDialog('Результат согласования', '<p>Запись демонстрационной визы для выбранной очереди. Электронная подпись и реальная отправка не выполняются.</p><label class="wide-field visa-note"><span>Комментарий / причина отклонения</span><textarea name="visa-note" rows="3" maxlength="2000" placeholder="Для отклонения укажите причину"></textarea></label>', btn('Согласовано', 'confirm-visa', 'check', 'primary') + btn('Не согласовано', 'reject-visa', 'close')); break;
    case 'confirm-visa': case 'reject-visa': {
      const note = dialog.querySelector('[name="visa-note"]').value.trim();
      if (action === 'reject-visa' && !note) { toast('Укажите причину отклонения.', true); return; }
      const queue = doc.queues[state.picker.queue]; queue.status = action === 'confirm-visa' ? 'Согласовано' : 'Не согласовано'; queue.note = note;
      history(doc, `Записана локальная виза: ${queue.status}`); persist(); dialog.close(); render(); break;
    }
    case 'link-document': linkedDialog(); break;
    case 'confirm-link': addLink(button.dataset.id); break;
    case 'link-by-url': openDialog('Добавление документа по ссылке', `<form id="modal-form" data-form="link-url">${labelInput('Ссылка на карточку или ID', 'url', '', 'text', 'required placeholder="#/doc/doc-2"')}<p class="muted">Допускаются только карточки документов этого прототипа.</p></form>`, '<button class="button primary" type="submit" form="modal-form">Добавить</button>'); break;
    case 'unlink': doc.linked = doc.linked.filter(id => id !== button.dataset.id); history(doc, 'Удалена связь с документом'); persist(); render(); break;
    case 'search-type': state.filters.type = button.dataset.type; state.searchRun = true; render(); break;
  }
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); location.hash = '/search/all'; setTimeout(() => document.querySelector('[name="query"]')?.focus(), 50); }
  if (event.target.matches('[role="tab"]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault(); const tabs = [...document.querySelectorAll('[role="tab"]')]; let index = tabs.indexOf(event.target); index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; tabs[index].click();
  }
});
dialog.addEventListener('click', event => { if (event.target === dialog && event.offsetX >= 0 && event.offsetY >= 0 && (event.offsetX > dialog.clientWidth || event.offsetY > dialog.clientHeight)) dialog.close(); });
window.addEventListener('hashchange', onRoute);
function onRoute() {
  const route = decodeHash();
  if (route.startsWith('doc/')) {
    const doc = currentDoc(); if (!doc) { location.hash = '/tasks/all'; toast('Документ не найден.', true); return; }
    if (!doc.read) { doc.read = true; persist(); } state.tab = 'general';
  } else {
    const valid = [...navigation.flatMap(n => n.children.map(c => `${n.id}/${c[0]}`)), 'search/all', 'references/all', 'issued/all'];
    if (!valid.includes(route)) { location.hash = '/tasks/all'; return; }
    if (route !== state.section) { state.filters = {}; state.page = 1; state.selected.clear(); state.searchRun = false; }
    state.section = route;
  }
  state.mobileOpen = false; render();
}
if (!location.hash) location.hash = '/tasks/all'; else onRoute();
