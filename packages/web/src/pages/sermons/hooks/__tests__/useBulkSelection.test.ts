import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBulkSelection } from '../useBulkSelection';

describe('useBulkSelection', () => {
    it('starts empty', () => {
        const { result } = renderHook(() => useBulkSelection());
        expect(result.current.count).toBe(0);
        expect(result.current.isSelected('a')).toBe(false);
    });

    it('toggles individual ids', () => {
        const { result } = renderHook(() => useBulkSelection());
        act(() => result.current.toggle('a'));
        expect(result.current.isSelected('a')).toBe(true);
        expect(result.current.count).toBe(1);
        act(() => result.current.toggle('a'));
        expect(result.current.isSelected('a')).toBe(false);
        expect(result.current.count).toBe(0);
    });

    it('selectMany adds without removing existing', () => {
        const { result } = renderHook(() => useBulkSelection());
        act(() => result.current.toggle('a'));
        act(() => result.current.selectMany(['b', 'c']));
        expect(result.current.count).toBe(3);
        expect(result.current.isSelected('a')).toBe(true);
        expect(result.current.isSelected('b')).toBe(true);
        expect(result.current.isSelected('c')).toBe(true);
    });

    it('clear empties the selection', () => {
        const { result } = renderHook(() => useBulkSelection());
        act(() => result.current.selectMany(['a', 'b', 'c']));
        act(() => result.current.clear());
        expect(result.current.count).toBe(0);
    });

    it('toggleAll selects pool when none/some selected', () => {
        const { result } = renderHook(() => useBulkSelection());
        act(() => result.current.toggle('a'));
        act(() => result.current.toggleAll(['a', 'b', 'c']));
        expect(result.current.count).toBe(3);
        expect(result.current.allSelected(['a', 'b', 'c'])).toBe(true);
    });

    it('toggleAll deselects pool when all selected', () => {
        const { result } = renderHook(() => useBulkSelection());
        act(() => result.current.selectMany(['a', 'b', 'c']));
        act(() => result.current.toggleAll(['a', 'b', 'c']));
        expect(result.current.count).toBe(0);
    });

    it('allSelected returns false for empty pool', () => {
        const { result } = renderHook(() => useBulkSelection());
        expect(result.current.allSelected([])).toBe(false);
    });
});
