import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterDocuments, sortDocuments, documentsForSection, seedDocuments, loadDocuments, saveDocuments, escapeHTML, toCSV, STORAGE_KEY } from '../src/data.js';

const records = [
  { id: 'a', title: 'Отчёт о работе', number: '12', date: '2026-10-01', deadline: '2026-10-20', type: 'Письмо', author: 'Иванов', assignee: 'Петров', status: 'Исполнено', task: 'На исполнение', read: true },
  { id: 'b', title: 'План работы', number: '2', date: '2026-10-10', deadline: '2026-10-27', type: 'Служебная записка', author: 'Сидоров', assignee: 'Петров', status: 'Принято к исполнению', task: 'На исполнение', read: false },
  { id: 'c', title: 'Материалы совещания', number: '20', date: '2026-10-31', deadline: '2026-11-04', type: 'Протокол', author: 'Иванов', assignee: 'Сидоров', status: 'Принято к исполнению', task: 'На ознакомление', read: true },
];
test('поиск не зависит от регистра, комбинируется с другими условиями', () => {
  assert.deepEqual(filterDocuments(records, { query: '  РАБОТ  ', assignee: 'петров', unread: true }).map(d => d.id), ['b']);
  assert.deepEqual(filterDocuments(records, { query: 'неизвестный номер' }), []);
  assert.equal(filterDocuments(records, {}).length, 3);
});
test('границы периода включительны, незаданные границы не ограничивают', () => {
  assert.deepEqual(filterDocuments(records, { from: '2026-10-01', to: '2026-10-10' }).map(d => d.id), ['a', 'b']);
  assert.deepEqual(filterDocuments(records, { from: '2026-10-31' }).map(d => d.id), ['c']);
  assert.deepEqual(filterDocuments(records, { to: '2026-09-30' }), []);
});
test('номер, тип, автор, состояние и поручение действительно фильтруются', () => {
  assert.deepEqual(filterDocuments(records, { number: '2', type: 'Письмо' }).map(d => d.id), ['a']);
  assert.deepEqual(filterDocuments(records, { author: 'иванов', task: 'На ознакомление', status: 'Принято к исполнению' }).map(d => d.id), ['c']);
});
test('числовая сортировка не изменяет исходный массив', () => {
  assert.deepEqual(sortDocuments(records, 'number').map(d => d.number), ['2', '12', '20']);
  assert.deepEqual(sortDocuments(records, 'date', -1).map(d => d.id), ['c', 'b', 'a']);
  assert.deepEqual(records.map(d => d.id), ['a', 'b', 'c']);
});
test('просрочка не включает завершённые поручения; журналы разделены', () => {
  assert.deepEqual(documentsForSection(records, 'assignments/overdue').map(d => d.id), ['b']);
  const docs = seedDocuments();
  assert.equal(documentsForSection(docs, 'tasks/all').length, 8);
  assert.equal(documentsForSection(docs, 'journals/incoming').length, 4);
  assert.ok(documentsForSection(docs, 'journals/outgoing').every(d => d.journal === 'outgoing'));
});
test('избранное и закрытые используют состояние, а не позицию строки', () => {
  const docs = seedDocuments();
  docs[0].favorite = true;
  assert.deepEqual(documentsForSection(docs, 'documents/favorites').map(d => d.id), ['doc-1', 'doc-6']);
  assert.deepEqual(documentsForSection(docs, 'assignments/closed').map(d => d.id), ['doc-11']);
});
test('сохранение и повторная загрузка восстанавливают изменения', () => {
  const memory = new Map(); const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  const docs = seedDocuments(); docs[0].title = 'Новая тема'; docs[0].queues = [{ people: ['Петров'], status: 'Не направлено' }];
  assert.equal(saveDocuments(storage, docs), true);
  assert.deepEqual(loadDocuments(storage), docs);
  assert.ok(memory.has(STORAGE_KEY));
});
test('поврежденное, старое и некорректное вложенное состояние не ломает запуск', () => {
  const damaged = seedDocuments(); damaged[0].queues = [{ people: 'не массив', status: null }];
  for (const raw of ['{', 'null', JSON.stringify({ version: 2, documents: [] }), JSON.stringify({ version: 1, documents: [{}] }), JSON.stringify({ version: 1, documents: damaged })]) {
    assert.deepEqual(loadDocuments({ getItem: () => raw }), seedDocuments());
  }
});
test('недоступное хранилище возвращает демоданные и сообщает о несохранении', () => {
  const storage = { getItem() { throw Error('disabled'); }, setItem() { throw Error('quota'); } };
  assert.deepEqual(loadDocuments(storage), seedDocuments());
  assert.equal(saveDocuments(storage, records), false);
  assert.equal(saveDocuments(null, records), false);
});
test('HTML отображается текстом; CSV экранирует кавычки и формулы', () => {
  assert.equal(escapeHTML('<img src="x" onerror=\'alert(1)\'>&'), '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;');
  const csv = toCSV([{ ...records[0], title: '=HYPERLINK("bad")' }]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
});
