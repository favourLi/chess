import { parseWatchInput } from './watchInput.js';

describe('parseWatchInput', () => {
  test('空或仅空白', () => {
    expect(parseWatchInput('')).toEqual({ kind: 'empty' });
    expect(parseWatchInput('  \t  ')).toEqual({ kind: 'empty' });
  });

  test('去掉 BOM', () => {
    const id = 'f216e506-d0c9-4ab6-a33f-d89a9ae12b7f';
    expect(parseWatchInput(`\uFEFF${id}`)).toEqual({
      kind: 'gameId',
      value: id
    });
  });

  test('UUID 忽略大小写与中间空格，统一小写', () => {
    const upper = 'F216E506-D0C9-4AB6-A33F-D89A9AE12B7F';
    expect(parseWatchInput(upper)).toEqual({
      kind: 'gameId',
      value: 'f216e506-d0c9-4ab6-a33f-d89a9ae12b7f'
    });
    expect(parseWatchInput('f216e506-d0c9-4ab6-a33f-\nd89a9ae12b7f')).toEqual({
      kind: 'gameId',
      value: 'f216e506-d0c9-4ab6-a33f-d89a9ae12b7f'
    });
  });

  test('非 UUID 视为房间码并大写', () => {
    expect(parseWatchInput('ab12cd')).toEqual({ kind: 'code', value: 'AB12CD' });
    expect(parseWatchInput('  xyz890  ')).toEqual({ kind: 'code', value: 'XYZ890' });
  });
});
