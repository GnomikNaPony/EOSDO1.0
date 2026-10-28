import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/'); await expect(page.getByRole('heading', { name: 'Задачи/уведомления' })).toBeVisible(); });

test('список похож на рабочее место; фильтры, Enter, сброс, сортировка и выбор', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await expect(page.locator('.document-table tbody tr')).toHaveCount(8);
  await page.locator('#filters [name="number"]').fill('18427');
  await page.locator('#filters [name="number"]').press('Enter');
  await expect(page.locator('.document-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.document-table tbody')).toContainText('9.2/18427-СЗ');
  await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
  await expect(page.locator('.document-table tbody tr')).toHaveCount(8);
  await page.getByRole('button', { name: 'Срок исполнения', exact: true }).click();
  await expect(page.locator('tbody tr').first()).toContainText('23.10.2026');
  await page.getByRole('checkbox', { name: 'Выбрать все документы' }).check();
  await expect(page.locator('.selected-count')).toHaveText('Выбрано: 8');
  await page.getByRole('button', { name: 'Отметить прочитанными', exact: true }).click();
  await expect(page.locator('tr.unread')).toHaveCount(0);
  await page.locator('#filters [name="query"]').fill('несуществующий документ');
  await page.getByRole('button', { name: 'Найти', exact: true }).click();
  await expect(page.getByText('Нет записей для отображения', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('создание проекта, обязательные поля, реквизиты и сохранение после обновления', async ({ page }) => {
  await page.getByRole('button', { name: 'Создать проект документа', exact: true }).click();
  await page.getByRole('button', { name: 'Служебная записка', exact: true }).click();
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#modal-form [name="title"]').fill('О подготовке тестового совещания');
  await page.getByRole('button', { name: 'Создать', exact: true }).click();
  await expect(page.locator('.document-heading')).toContainText('Проект 1');
  await expect(page.locator('#card-form [name="title"]')).toHaveValue('О подготовке тестового совещания');
  await page.locator('#card-form [name="title"]').fill('Сохранённая новая тема');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.reload();
  await expect(page.locator('#card-form [name="title"]')).toHaveValue('Сохранённая новая тема');
  await page.getByRole('button', { name: 'Завершить поручение' }).click();
  await expect(page.locator('.document-state')).toHaveText('Исполнено');
  await page.getByRole('button', { name: 'Вернуть в работу' }).click();
  await expect(page.locator('.document-state')).toHaveText('Принято к исполнению');
});

test('дело из дерева, очереди согласования, участники, виза и комментарии', async ({ page }) => {
  await page.locator('.task-link').first().click();
  await page.getByRole('tab', { name: 'Место хранения подлинника' }).click();
  await page.getByRole('button', { name: 'Выбрать дело', exact: true }).last().click();
  await page.getByRole('button', { name: '01-02 Служебная переписка по основной деятельности' }).click();
  await page.getByRole('button', { name: 'Выбрать', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Выбранное дело' })).toHaveValue('01-02 Служебная переписка по основной деятельности');
  await page.getByRole('tab', { name: 'Согласование и подписание' }).click();
  await page.getByRole('textbox', { name: 'Пояснительная записка' }).fill('Прошу согласовать в рабочем порядке.');
  await page.getByRole('button', { name: 'Сохранить пояснение' }).click();
  await page.getByRole('button', { name: 'Добавить очередь', exact: true }).click();
  await page.getByRole('button', { name: 'Добавить согласующего' }).click();
  await page.getByRole('checkbox', { name: 'Петров А. В. Специалист' }).check();
  await page.getByRole('button', { name: 'Добавить выбранных' }).click();
  await expect(page.locator('.approval-queue')).toContainText('Петров А. В.');
  await page.getByRole('button', { name: 'Записать визу' }).click();
  await page.getByRole('button', { name: 'Согласовано', exact: true }).click();
  await expect(page.locator('.approval-queue')).toContainText('Согласовано');
  await page.getByRole('tab', { name: 'Комментарии' }).click();
  await page.locator('[name="comment"]').fill('Материалы проверены.');
  await page.getByRole('button', { name: 'Добавить комментарий', exact: true }).click();
  await expect(page.locator('.comments')).toContainText('Материалы проверены.');
  await page.reload();
  await page.getByRole('tab', { name: 'Комментарии' }).click();
  await expect(page.locator('.comments')).toContainText('Материалы проверены.');
  await page.getByRole('tab', { name: 'История', exact: true }).click();
  await expect(page.locator('.card-panel')).toContainText('Выбрано дело по номенклатуре');
  await expect(page.locator('.card-panel')).toContainText('Записана локальная виза');
});

test('связанные документы: поиск по Enter, связь, защита от повтора, удаление', async ({ page }) => {
  await page.locator('.task-link').first().click();
  await page.getByRole('tab', { name: 'Связанные документы' }).click();
  await page.getByRole('button', { name: 'Добавить', exact: true }).click();
  await page.locator('#link-search [name="query"]').fill('18136');
  await page.locator('#link-search [name="query"]').press('Enter');
  await expect(page.locator('#link-results tbody tr')).toHaveCount(1);
  await page.locator('#link-results').getByRole('button', { name: 'Добавить', exact: true }).click();
  await expect(page.locator('.linked-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.linked-table')).toContainText('9.2/18136-СЗ');
  await page.getByRole('button', { name: 'Добавить по ссылке' }).click();
  await page.locator('[name="url"]').fill('#/doc/doc-2');
  await page.getByRole('dialog').getByRole('button', { name: 'Добавить', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('уже добавлен');
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.getByRole('button', { name: 'Удалить связь' }).click();
  await expect(page.locator('.linked-table')).toContainText('Нет записей');
});

test('общий поиск, диапазон, журналы и скачивание CSV', async ({ page }) => {
  await page.getByRole('button', { name: 'Поиск документов', exact: true }).click();
  await page.locator('#search-form [name="number"]').fill('18427');
  await page.locator('#search-form [name="number"]').press('Enter');
  await expect(page.locator('.search-results tbody tr')).toHaveCount(1);
  await expect(page.locator('.search-results')).toContainText('9.2/18427-СЗ');
  await page.getByRole('button', { name: 'Очистить', exact: true }).click();
  await page.locator('#search-form [name="from"]').fill('2026-10-25');
  await page.locator('#search-form [name="to"]').fill('2026-10-27');
  await page.locator('#search-form button[type="submit"]').click();
  await expect(page.locator('.search-results tbody tr')).toHaveCount(2);
  await page.getByRole('link', { name: 'Входящие документы', exact: true }).click();
  await expect(page.locator('.document-table tbody tr')).toHaveCount(4);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Выгрузить список', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('eosdo-documents.csv');
});

test('текст из формы не исполняется как HTML, повреждённое хранилище восстанавливается', async ({ page }) => {
  await page.locator('.task-link').first().click();
  await page.locator('[name="title"]').fill('<img src=x onerror="window.injection=true">');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.getByRole('button', { name: 'Назад к списку' }).click();
  await expect(page.locator('.subject-link').first()).toHaveText('<img src=x onerror="window.injection=true">');
  expect(await page.evaluate(() => window.injection)).toBeUndefined();
  expect(await page.locator('.document-table img').count()).toBe(0);
  await page.evaluate(() => localStorage.setItem('eosdo-demo-v1', '{broken'));
  await page.reload();
  await expect(page.locator('.document-table tbody tr')).toHaveCount(8);
});

test('область поиска сохраняется при сортировке; отклонение содержит причину', async ({ page }) => {
  await page.getByRole('button', { name: 'Поиск документов', exact: true }).click();
  await page.getByRole('radio', { name: 'Избранные', exact: true }).check();
  await expect(page.locator('.search-results tbody tr')).toHaveCount(1);
  await expect(page.locator('.search-results')).toContainText('9.2/16834-СЗ');
  await page.getByRole('button', { name: 'Дата получения', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Избранные', exact: true })).toBeChecked();
  await expect(page.locator('.search-results tbody tr')).toHaveCount(1);
  await page.locator('.task-link').first().click();
  await page.getByRole('tab', { name: 'Согласование и подписание' }).click();
  await page.getByRole('button', { name: 'Добавить очередь', exact: true }).click();
  await page.getByRole('button', { name: 'Добавить согласующего' }).click();
  await page.getByRole('checkbox', { name: 'Петров А. В. Специалист' }).check();
  await page.getByRole('button', { name: 'Добавить выбранных' }).click();
  await page.getByRole('button', { name: 'Записать визу' }).click();
  await page.getByRole('button', { name: 'Не согласовано', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Укажите причину');
  await page.locator('[name="visa-note"]').fill('Нужно уточнить сроки выполнения.');
  await page.getByRole('button', { name: 'Не согласовано', exact: true }).click();
  await expect(page.locator('.card-panel')).toContainText('Нужно уточнить сроки выполнения.');
  await page.reload();
  await page.getByRole('tab', { name: 'Согласование и подписание' }).click();
  await expect(page.locator('.card-panel')).toContainText('Нужно уточнить сроки выполнения.');
});

test('узкий экран: меню, карточка, вкладки с клавиатуры и отсутствие внешнего переполнения', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.getByRole('button', { name: 'Показать / скрыть навигацию' }).click();
  await expect(page.locator('.sidebar')).toBeVisible();
  await page.getByRole('link', { name: 'На исполнении у меня', exact: true }).click();
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.locator('.task-link').first().click();
  await expect(page.locator('#card-form')).toBeVisible();
  await page.getByRole('tab', { name: 'Основные реквизиты' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Согласование и подписание' })).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('ошибка записи хранилища видна пользователю, интерфейс продолжает работать', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
  await page.reload();
  await page.locator('.task-link').first().click();
  await page.locator('[name="title"]').fill('Изменение в памяти');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.locator('[name="title"]')).toHaveValue('Изменение в памяти');
  await expect(page.getByRole('status')).toContainText('Хранилище недоступно');
});

test('визуальные артефакты desktop, карточка и mobile без ошибок', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.screenshot({ path: testInfo.outputPath('desktop.png') });
  await page.locator('.task-link').first().click();
  await expect(page.locator('#card-form')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('document.png') });
  await page.getByRole('tab', { name: 'Согласование и подписание' }).click();
  await page.screenshot({ path: testInfo.outputPath('approval.png') });
  await page.getByRole('button', { name: 'Назад к списку' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('mobile.png') });
  expect(errors).toEqual([]);
});
