export const TODAY = '2026-10-28';
export const STORAGE_KEY = 'eosdo-demo-v1';
export const USER = 'Иванов И. И.';
export const TYPES = ['Информационно-справочный документ', 'Распорядительный документ', 'Организационный документ', 'Письмо', 'Служебная записка', 'Протокол'];
const subjects = [
  'О предоставлении информации по исполнению мероприятий',
  'О согласовании проекта организационно-распорядительного документа',
  'О направлении материалов к производственному совещанию',
  'О выполнении мероприятий по повышению эффективности',
  'О подготовке предложений в план работы подразделения',
  'О рассмотрении проекта технического задания',
  'Об актуализации нормативной документации',
  'О предоставлении отчётных материалов за III квартал',
  'О проведении рабочего совещания',
  'Об организации взаимодействия подразделений',
  'О внесении изменений в график выполнения работ',
  'О результатах рассмотрения предложений',
];
export function seedDocuments() {
  return subjects.map((title, i) => ({
    id: `doc-${i + 1}`, title, number: `9.2/${[18427, 18136, 17958, 17642, 17218, 16834, 16321, 15907, 15284, 14832, 14218, 13746][i]}-СЗ`,
    date: `2026-10-${String(27 - i * 2).padStart(2, '0')}`,
    deadline: ['2026-10-30', '2026-10-29', '2026-10-28', '2026-10-23', '2026-11-03', '2026-10-30', '2026-11-06', '2026-11-10', '2026-10-31', '2026-11-12', '2026-11-13', '2026-11-16'][i],
    type: TYPES[[0, 1, 0, 0, 0, 0, 0, 3, 5, 4, 1, 0][i]],
    task: ['На рассмотрение', 'На исполнение', 'На ознакомление', 'На доработку / исправление', 'На исполнение', 'На исполнение', 'На исполнение', 'На исполнение', 'На согласование', 'На подписание', 'На исполнение', 'На ознакомление'][i],
    status: i === 10 ? 'Исполнено' : i === 8 ? 'На согласовании' : 'Принято к исполнению',
    author: ['Петров А. В.', 'Смирнова Е. Н.', 'Кузнецов Д. С.', 'Соколов М. А.'][i % 4],
    assignee: USER, department: 'Ростовская АЭС',
    category: i === 8 || i === 9 ? 'created' : i >= 10 ? 'processed' : 'coexecutor', journal: ['incoming', 'outgoing', 'internal'][i % 3], controlled: i % 3 === 0,
    read: i > 2, favorite: i === 5, text: 'Прошу рассмотреть приложенные материалы и предоставить информацию по указанным вопросам в установленный срок. Результаты рассмотрения направить в адрес ответственного исполнителя.',
    caseName: '', queues: [], linked: [], comments: [], instructions: '',
    history: [{ date: `2026-10-${String(27 - i * 2).padStart(2, '0')}`, text: 'Документ зарегистрирован и направлен исполнителю', user: 'Делопроизводитель' }],
  }));
}
export const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '—';
  return value.split('-').reverse().join('.');
}
export function filterDocuments(documents, filters = {}) {
  const includes = (value, query) => String(value).toLocaleLowerCase('ru').includes(String(query || '').trim().toLocaleLowerCase('ru'));
  return documents.filter(d =>
    includes(`${d.title} ${d.number} ${d.author}`, filters.query) &&
    includes(d.number, filters.number) && includes(d.title, filters.title) &&
    includes(d.author, filters.author) && includes(d.assignee, filters.assignee) &&
    (!filters.type || d.type === filters.type) &&
    (!filters.status || d.status === filters.status) &&
    (!filters.task || d.task === filters.task) &&
    (!filters.unread || !d.read) &&
    (!filters.from || d.date >= filters.from) && (!filters.to || d.date <= filters.to)
  );
}
export function sortDocuments(documents, key, direction = 1) {
  return [...documents].sort((a, b) => String(a[key]).localeCompare(String(b[key]), 'ru', { numeric: true }) * direction);
}
export function documentsForSection(documents, section) {
  const [, kind] = section.split('/');
  if (section.startsWith('journals/')) return documents.filter(d => d.journal === kind);
  if (section === 'issued/all') return documents.filter(d => d.author === USER);
  if (section.startsWith('documents/')) {
    if (kind === 'favorites') return documents.filter(d => d.favorite);
    if (kind === 'cancelled') return documents.filter(d => d.status === 'Аннулирован');
    if (['created', 'processed', 'coexecutor'].includes(kind)) return documents.filter(d => d.category === kind);
  }
  if (kind === 'closed') return documents.filter(d => d.status === 'Исполнено');
  if (kind === 'overdue') return documents.filter(d => d.deadline < TODAY && d.status !== 'Исполнено');
  if (kind === 'control') return documents.filter(d => d.controlled && d.status !== 'Исполнено');
  if (section === 'tasks/all') return documents.filter(d => d.category === 'coexecutor' && !['Исполнено', 'Аннулирован'].includes(d.status));
  if (kind === 'issued') return documents.filter(d => d.author === USER);
  const tasks = { review: 'На рассмотрение', execution: 'На исполнение', familiarization: 'На ознакомление', revision: 'На доработку / исправление', approval: 'На согласование', signature: 'На подписание', notifications: 'Уведомление' };
  if (tasks[kind]) return documents.filter(d => d.task === tasks[kind] && d.status !== 'Исполнено');
  return documents.filter(d => d.status !== 'Аннулирован');
}
export function loadDocuments(storage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!saved || saved.version !== 1 || !Array.isArray(saved.documents) || saved.documents.length > 1000) return seedDocuments();
    const keys = ['id', 'title', 'number', 'date', 'deadline', 'type', 'task', 'status', 'author', 'assignee', 'department', 'category', 'journal', 'text', 'caseName', 'instructions'];
    const valid = saved.documents.every(d => d && keys.every(k => typeof d[k] === 'string') && typeof d.read === 'boolean' && typeof d.favorite === 'boolean' && typeof d.controlled === 'boolean' &&
      Array.isArray(d.queues) && d.queues.every(q => q && Array.isArray(q.people) && q.people.every(p => typeof p === 'string') && typeof q.status === 'string') &&
      Array.isArray(d.linked) && d.linked.every(id => typeof id === 'string') &&
      Array.isArray(d.comments) && d.comments.every(c => c && ['text', 'user', 'date'].every(k => typeof c[k] === 'string')) &&
      Array.isArray(d.history) && d.history.every(h => h && ['text', 'user', 'date'].every(k => typeof h[k] === 'string')));
    return valid && new Set(saved.documents.map(d => d.id)).size === saved.documents.length ? saved.documents : seedDocuments();
  } catch { return seedDocuments(); }
}
export function saveDocuments(storage, documents) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, documents })); return true; }
  catch { return false; }
}
export function toCSV(documents) {
  const cell = v => `"${String(v).replace(/^[\s]*[=+@-]/, "'$&").replaceAll('"', '""')}"`;
  return '\uFEFF' + [['Рег. номер', 'Дата', 'Вид документа', 'Краткое содержание', 'Автор', 'Срок исполнения', 'Статус'], ...documents.map(d => [d.number, formatDate(d.date), d.type, d.title, d.author, formatDate(d.deadline), d.status])].map(row => row.map(cell).join(';')).join('\r\n');
}
